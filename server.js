/**
 * 表情包生成器 - 后端服务
 * 
 * 安装依赖:
 * npm install express formidable axios cors
 * 
 * 配置 API Key:
 * 1. 访问阿里云百炼控制台：https://dashscope.console.aliyun.com/
 * 2. 获取 API Key
 * 3. 设置环境变量: export DASHSCOPE_API_KEY=your_api_key_here
 *    或者在代码中直接替换 (不推荐用于生产环境)
 */

const express = require('express');
const { formidable } = require('formidable');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 获取 API Key - 优先从环境变量读取
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || '';

// 中间件配置
app.use(cors()); // 允许跨域请求
app.use(express.static('public')); // 提供静态文件服务

/**
 * 将本地文件转换为 Base64 格式
 * @param {string} filePath - 文件路径
 * @returns {string} Base64 编码的字符串
 */
function fileToBase64(filePath) {
  const bitmap = fs.readFileSync(filePath);
  return `data:image/jpeg;base64,${Buffer.from(bitmap).toString('base64')}`;
}

/**
 * 构造默认的提示词
 * @returns {string} 默认提示词
 */
function getDefaultPrompt() {
  return '将这张图片转化为一个生动、夸张且幽默的表情包，保持人物特征但增加喜剧效果，表情夸张有趣，适合网络聊天使用';
}

/**
 * 构造用户自定义风格的提示词
 * @param {string} style - 用户输入的风格
 * @returns {string} 组合后的提示词
 */
function getCustomPrompt(style) {
  return `基于原图，以 ${style} 的风格生成一个幽默的表情包，表情夸张有趣，适合网络聊天使用`;
}

/**
 * 调用阿里云百炼 qwen-image-edit API
 * @param {string} imageBase64 - Base64 编码的图片
 * @param {string} prompt - 提示词
 * @returns {Promise<object>} API 响应结果
 */
async function callQwenImageEdit(imageBase64, prompt) {
  const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
  
  const payload = {
    model: 'qwen-image-2.0-pro',
    input: {
      messages: [
        {
          role: 'user',
          content: [
            {
              image: imageBase64
            },
            {
              text: prompt
            }
          ]
        }
      ]
    },
    parameters: {
      n: 1,
      negative_prompt: ' ',
      prompt_extend: true,
      watermark: false,
      size: '1024*1024'
    }
  };

  // 设置较长的超时时间（120 秒），因为图像生成需要较长时间
  const response = await axios.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
    },
    timeout: 120000 // 120 秒超时
  });

  return response.data;
}

/**
 * POST /upload-and-generate
 * 接收上传的图片，调用 AI 模型生成表情包
 */
app.post('/upload-and-generate', async (req, res) => {
  try {
    // 检查 API Key 是否配置
    if (!DASHSCOPE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'API Key 未配置。请设置环境变量 DASHSCOPE_API_KEY，详见 server.js 文件注释说明。'
      });
    }

    // 使用 formidable 解析上传的文件和表单数据
    const form = formidable({ multiples: false });
    
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Formidable 解析错误:', err);
        return res.status(400).json({
          success: false,
          error: '文件上传失败，请重试'
        });
      }

      // 获取上传的图片文件
      // formidable v3+ returns files as arrays: { image: [File1, File2, ...] }
      const imageFiles = files.image;
      if (!imageFiles || !Array.isArray(imageFiles) || imageFiles.length === 0) {
        return res.status(400).json({
          success: false,
          error: '请上传一张图片'
        });
      }
      
      const imageFile = imageFiles[0]; // 取第一个文件

      // 获取用户输入的风格提示词（可选）
      // formidable v3+ returns fields as arrays too
      const stylePrompt = fields.style_prompt && Array.isArray(fields.style_prompt)
        ? fields.style_prompt[0]
        : '';
      
      // 构造最终的提示词
      const finalPrompt = stylePrompt.trim() ? getCustomPrompt(stylePrompt.trim()) : getDefaultPrompt();
      
      console.log('收到图片上传:', imageFile.originalFilename);
      console.log('使用提示词:', finalPrompt);

      try {
        // 将图片转换为 Base64
        const imageBase64 = fileToBase64(imageFile.filepath);
        
        // 调用阿里云百炼 API
        console.log('正在调用 qwen-image-edit API...');
        const apiResponse = await callQwenImageEdit(imageBase64, finalPrompt);
        
        // 解析 API 响应，提取生成的图片 URL
        // 阿里云百炼返回格式：output.choices[0].message.content[0].image
        const generatedImageUrl = apiResponse?.output?.choices?.[0]?.message?.content?.[0]?.image;
        
        if (!generatedImageUrl) {
          console.error('API 响应格式异常:', apiResponse);
          return res.status(500).json({
            success: false,
            error: 'API 返回格式异常，请稍后重试',
            debug: apiResponse
          });
        }

        console.log('表情包生成成功:', generatedImageUrl);
        
        // 返回生成的图片 URL
        res.json({
          success: true,
          imageUrl: generatedImageUrl,
          message: '表情包生成成功！'
        });

      } catch (apiError) {
        console.error('API 调用失败:', apiError.message);
        
        // 处理超时错误
        if (apiError.code === 'ECONNABORTED' || apiError.message.includes('timeout')) {
          return res.status(504).json({
            success: false,
            error: '请求超时，模型推理时间较长，请稍后重试'
          });
        }
        
        // 处理认证错误
        if (apiError.response?.status === 401) {
          return res.status(401).json({
            success: false,
            error: 'API Key 无效，请检查配置'
          });
        }
        
        // 其他错误
        return res.status(500).json({
          success: false,
          error: apiError.response?.data?.message || apiError.message || '调用 AI 模型失败'
        });
      }
    });

  } catch (error) {
    console.error('服务器错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误，请稍后重试'
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║           🎭 表情包生成器服务已启动                     ║
╠════════════════════════════════════════════════════════╣
║  访问地址：http://localhost:${PORT}                      ║
║  API Key: ${DASHSCOPE_API_KEY ? '✓ 已配置' : '✗ 未配置 (请设置 DASHSCOPE_API_KEY)'}
╚════════════════════════════════════════════════════════╝
  `);
});

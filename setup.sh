#!/bin/bash

# 🎭 表情包生成器 - 一键安装脚本
# 适用于 macOS / Linux 系统

echo "╔════════════════════════════════════════════════════════╗"
echo "║           🎭 表情包生成器 - 安装向导                   ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js 环境"
    echo ""
    echo "请先安装 Node.js (推荐 LTS 版本):"
    echo "  macOS:  brew install node"
    echo "  Ubuntu/Debian: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash"
    echo "  或访问官网下载：https://nodejs.org/zh-cn/download"
    echo ""
    exit 1
fi

# 显示 Node.js 版本
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo "✅ Node.js 版本：$NODE_VERSION"
echo "✅ npm 版本：$NPM_VERSION"
echo ""

# 检查 package.json 是否存在
if [ ! -f "package.json" ]; then
    echo "❌ 未找到 package.json 文件"
    echo "请确保在此目录下运行脚本"
    exit 1
fi

# 询问是否使用淘宝镜像
read -p "是否使用淘宝镜像加速 npm 安装？(推荐国内用户选择 y) [y/n]: " use_mirror
if [[ $use_mirror =~ ^[Yy]$ ]]; then
    echo "📦 配置淘宝镜像..."
    npm config set registry https://registry.npmmirror.com
    echo "✅ 镜像配置完成"
fi

echo ""
echo "📦 开始安装项目依赖..."
echo ""

# 清理旧的依赖（如果存在）
if [ -d "node_modules" ]; then
    read -p "检测到已有的 node_modules，是否删除重新安装？[y/n]: " clean_old
    if [[ $clean_old =~ ^[Yy]$ ]]; then
        echo "🗑️ 删除旧的依赖..."
        rm -rf node_modules package-lock.json
    fi
fi

# 安装依赖
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║                    ✅ 安装成功！                       ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo ""
    echo "📝 下一步操作："
    echo ""
    echo "1️⃣  配置 API Key："
    echo "   export DASHSCOPE_API_KEY=your_api_key_here"
    echo ""
    echo "2️⃣  启动服务："
    echo "   npm start"
    echo ""
    echo "3️⃣  访问应用："
    echo "   http://localhost:3000"
    echo ""
else
    echo ""
    echo "❌ 安装失败，请检查网络连接或尝试手动运行：npm install"
    exit 1
fi

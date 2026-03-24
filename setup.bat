@echo off
chcp 65001 >nul

:: 🎭 表情包生成器 - Windows 一键安装脚本

echo ╔════════════════════════════════════════════════════════╗
echo ║           🎭 表情包生成器 - 安装向导 (Windows)         ║
echo ╚════════════════════════════════════════════════════════╝
echo.

:: 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Node.js 环境
    echo.
    echo 请先安装 Node.js (推荐 LTS 版本):
    echo   1. 访问官网下载：https://nodejs.org/
    echo   2. 或使用 Winget 安装：winget install OpenJS.NodeJS.LTS
    echo   3. 或使用 Chocolatey 安装：choco install nodejs-lts
    echo.
    pause
    exit /b 1
)

:: 显示 Node.js 版本
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo ✅ Node.js 版本：%NODE_VERSION%
echo ✅ npm 版本：%NPM_VERSION%
echo.

:: 检查 package.json 是否存在
if not exist "package.json" (
    echo ❌ 未找到 package.json 文件
    echo 请确保在此目录下运行脚本
    pause
    exit /b 1
)

:: 询问是否使用淘宝镜像
set /p USE_MIRROR="是否使用淘宝镜像加速 npm 安装？(推荐国内用户选择 y) [y/n]: "
if /i "%USE_MIRROR%"=="y" (
    echo 📦 配置淘宝镜像...
    npm config set registry https://registry.npmmirror.com
    echo ✅ 镜像配置完成
)

echo.
echo 📦 开始安装项目依赖...
echo.

:: 清理旧的依赖（如果存在）
if exist "node_modules" (
    set /p CLEAN_OLD="检测到已有的 node_modules，是否删除重新安装？[y/n]: "
    if /i "%CLEAN_OLD%"=="y" (
        echo 🗑️ 删除旧的依赖...
        rmdir /s /q node_modules
        del /q package-lock.json
    )
)

:: 安装依赖
call npm install

if %errorlevel% equ 0 (
    echo.
    echo ╔════════════════════════════════════════════════════════╗
    echo ║                    ✅ 安装成功！                       ║
    echo ╚════════════════════════════════════════════════════════╝
    echo.
    echo 📝 下一步操作：
    echo.
    echo 1️⃣  配置 API Key:
    echo    set DASHSCOPE_API_KEY=your_api_key_here
    echo.
    echo 2️⃣  启动服务:
    echo    npm start
    echo.
    echo 3️⃣  访问应用:
    echo    http://localhost:3000
    echo.
) else (
    echo.
    echo ❌ 安装失败，请检查网络连接或尝试手动运行：npm install
    pause
    exit /b 1
)

pause

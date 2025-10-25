#!/bin/bash

# 启动前后端开发服务器的脚本

echo "🚀 启动 Agent Team Builder 开发环境"
echo "========================================"

# 检查是否在正确的目录中
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录中运行此脚本"
    exit 1
fi

# 检查Node.js依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi

# 检查Python依赖
echo "🐍 检查Python环境..."
python3 -c "import flask, yaml, flask_cors" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  警告: Python依赖缺失，请安装："
    echo "   pip3 install Flask Flask-CORS PyYAML"
    echo "   或者使用 conda activate thu (如果你有thu环境)"
fi

# 创建日志目录
mkdir -p logs

echo ""
echo "🌐 启动服务..."
echo "前端: http://localhost:3000"
echo "后端API: http://localhost:5000"
echo ""

# 后台启动Python API服务器
echo "🐍 启动Python API服务器..."
python3 api_server.py > logs/api_server.log 2>&1 &
API_PID=$!
echo "   API服务器PID: $API_PID"

# 等待API服务器启动
sleep 3

# 启动React开发服务器
echo "⚛️  启动React开发服务器..."
npm start &
REACT_PID=$!
echo "   React服务器PID: $REACT_PID"

# 保存PID到文件，方便后续清理
echo $API_PID > logs/api_server.pid
echo $REACT_PID > logs/react_server.pid

echo ""
echo "✅ 服务已启动！"
echo "   - 前端地址: http://localhost:3000"
echo "   - 后端API: http://localhost:5000"
echo "   - API日志: logs/api_server.log"
echo ""
echo "停止服务:"
echo "   ./stop_servers.sh"
echo "   或者按 Ctrl+C"

# 等待用户中断
trap 'echo ""; echo "🛑 停止服务..."; kill $API_PID $REACT_PID 2>/dev/null; exit 0' INT

# 保持脚本运行
wait
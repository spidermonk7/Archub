#!/bin/bash

# 停止开发服务器的脚本

echo "🛑 停止 Agent Team Builder 服务..."

# 读取PID文件并停止服务
if [ -f "logs/api_server.pid" ]; then
    API_PID=$(cat logs/api_server.pid)
    if kill -0 $API_PID 2>/dev/null; then
        echo "   停止API服务器 (PID: $API_PID)"
        kill $API_PID
    fi
    rm -f logs/api_server.pid
fi

if [ -f "logs/react_server.pid" ]; then
    REACT_PID=$(cat logs/react_server.pid)
    if kill -0 $REACT_PID 2>/dev/null; then
        echo "   停止React服务器 (PID: $REACT_PID)"
        kill $REACT_PID
    fi
    rm -f logs/react_server.pid
fi

# 额外清理：杀死任何可能残留的进程
pkill -f "api_server.py" 2>/dev/null
pkill -f "react-scripts start" 2>/dev/null

echo "✅ 所有服务已停止"
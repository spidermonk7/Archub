# Agent Team Builder with Python Backend

一个用于构建和运行多智能体系统的可视化工具，现在支持Python后端实时处理！

## 🚀 功能特性

### 前端功能
- **可视化团队构建**: 拖拽式节点编辑器，支持多种智能体类型
- **团队配置管理**: 保存和加载团队配置到 `./SourceFiles` 目录
- **实时预览**: 即时查看团队结构和连接关系
- **团队池管理**: 浏览和管理已创建的团队

### Python后端功能 (新增!)
- **配置文件加载**: 自动读取 `./SourceFiles` 目录中的YAML配置文件
- **实时输入输出**: 支持用户输入并实时处理返回结果
- **团队模拟**: 模拟多智能体团队的工作流程
- **RESTful API**: 提供完整的HTTP API接口

## 📁 项目结构

```
KaiTeam/Archub/
├── src/                    # React前端源码
│   ├── components/         # 组件
│   ├── pages/             # 页面
│   └── utils/             # 工具函数
├── SourceFiles/           # 团队配置文件存储目录
│   └── simple-io-team-example.yaml  # 示例配置
├── run.py                 # Python交互式运行器
├── api_server.py          # Flask API服务器
├── start_dev.sh           # 开发环境启动脚本
├── stop_servers.sh        # 服务停止脚本
├── requirements.txt       # Python依赖
└── README.md             # 本文件
```

## 🛠️ 安装和启动

### 1. 安装依赖

**前端依赖:**
```bash
npm install
```

**Python依赖:**
```bash
pip3 install Flask Flask-CORS PyYAML
# 或者使用 conda activate thu (如果你有thu环境)
```

### 2. 启动开发环境

**方式1: 使用启动脚本 (推荐)**
```bash
./start_dev.sh
```

**方式2: 手动启动**
```bash
# 终端1: 启动Python API服务器
python3 api_server.py

# 终端2: 启动React开发服务器
npm start
```

### 3. 停止服务
```bash
./stop_servers.sh
# 或者按 Ctrl+C
```

## 🌐 访问地址

- **前端界面**: http://localhost:3000
- **Python API**: http://localhost:5000
- **API健康检查**: http://localhost:5000/api/health

## 📖 使用指南

### 1. 构建团队 (Build New Team)
1. 点击 "Build New Team" 进入可视化编辑器
2. 添加节点（智能体、工具、协调器等）
3. 创建节点间的连接
4. 编译并保存团队配置

### 2. Python运行器 (Python Team Runner)
1. 点击 "Python Team Runner" 进入Python后端界面
2. 从下拉菜单选择团队配置文件
3. 在输入框中输入你的需求
4. 查看团队处理过程和结果

### 3. 团队池管理 (Explore Team Pool)
1. 查看所有已保存的团队配置
2. 选择团队进行运行或编辑

## 🔌 API接口

Python后端提供以下RESTful API:

- `GET /api/health` - 健康检查
- `GET /api/configs` - 获取可用配置文件列表
- `POST /api/load-config` - 加载指定配置文件
- `POST /api/process-input` - 处理用户输入
- `GET /api/current-config` - 获取当前配置
- `POST /api/reset` - 重置会话

## 📝 配置文件格式

团队配置使用YAML格式存储在 `./SourceFiles` 目录中:

```yaml
nodes:
  - id: input-node
    name: 用户输入
    type: input
    description: 接收用户输入的入口节点
    config:
      inputType: text
      placeholder: 请输入您的需求...
    position:
      x: 100
      y: 200
      
  - id: output-node
    name: 结果输出
    type: output
    description: 向用户返回结果的出口节点
    config:
      outputFormat: text
      successMessage: 处理完成
    position:
      x: 600
      y: 200

edges: []

metadata:
  name: "simple-io-team-example"
  version: "1.0"
  compiledAt: "2025-10-23T10:00:00.000Z"
```

## 🐛 故障排除

### 常见问题

1. **API连接失败**: 确保Python服务器在端口5000运行
2. **Python依赖缺失**: 运行 `pip3 install -r requirements.txt`
3. **配置文件不显示**: 检查 `./SourceFiles` 目录是否存在配置文件
4. **端口被占用**: 修改 `api_server.py` 中的端口号

### 日志查看

```bash
# API服务器日志
tail -f logs/api_server.log

# 检查服务状态
curl http://localhost:5000/api/health
```

## 🔮 下一步功能

- [ ] WebSocket实时通信
- [ ] 更复杂的智能体处理逻辑
- [ ] 数据库持久化
- [ ] 用户认证系统
- [ ] 团队执行状态监控

---

## 原始 Create React App 说明

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

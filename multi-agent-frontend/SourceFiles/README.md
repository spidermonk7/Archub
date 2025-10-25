# SourceFiles 目录

此目录用于存储多智能体系统的配置文件。

## 使用说明

### 保存配置
1. 在 Multi-Agent System Builder 中设计你的系统
2. 点击"编译图"按钮
3. 浏览器会下载一个 `.yaml` 文件
4. **请将下载的文件保存到此 SourceFiles 目录中**

### 加载配置
1. 点击"加载配置"按钮
2. 在文件选择器中导航到此 SourceFiles 目录
3. 选择之前保存的 `.yaml` 或 `.json` 配置文件
4. 系统会自动加载节点和连接

## 配置文件格式

配置文件使用 YAML 格式，包含以下结构：

```yaml
nodes:
  - id: node_xxx
    name: 节点名称
    type: agent|tool|coordinator
    description: 节点描述
    config: 
      # 节点特定配置
    position:
      x: 100
      y: 200

edges:
  - id: edge_xxx
    source: 源节点ID
    target: 目标节点ID
    type: hard|soft
    config:
      description: 连接描述

metadata:
  compiledAt: ISO时间戳
  version: 版本号
  name: 配置名称
```

## 注意事项

- 建议使用有意义的文件名，如 `customer-service-system.yaml`
- 定期备份重要的配置文件
- 可以使用版本控制（如Git）来管理配置文件的变更
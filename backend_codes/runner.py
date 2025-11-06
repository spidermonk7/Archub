#!/usr/bin/env python3
"""
Simple Multi-Agent Team Runner
基础的多智能体团队运行器，用于加载配置文件并处理基本的输入输出
"""

import os
import sys
import yaml
import json
import glob
from pathlib import Path
from typing import Dict, List, Any, Optional
# 把项目根目录加入搜索路径
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from backend_codes.Teams.simpleTeam import SimpleTeam
from uuid import uuid4


# 1. 实现从config到Team的加载：
    # Runner should be in charge of loading config from compiled config files. 
    # It should parse the config together with user's ultimate goal to initialize a Team instance. 

# 2. 实现Team对Config的接收: 
    # Team should be able to [initialize itself(Both Nodes and Connections)] based on the config provided by Runner. 
    # Currently, team only support nodes initialization, but not connections. 
        # A pre-defined Nodes pool might be exciting. 
    # Currently, team does not support Edge Connections
        # The run-logic of current team is fully connected to Nodes only, with special workflow managed by StageManagerNode. 



# So my plan is: 
    # Build a New Team Class: SimpleTeam, which supports both Nodes and Edge Coneection
    # Reimplement its run_logic. 
    # Reimplement its initialization logic. 



class SimpleTeamRunner:
    def __init__(self):
        self.source_files_dir = Path("./SourceFiles")
        print(f"📁 SourceFiles 目录: {self.source_files_dir.resolve()}")
        print(f"Possible Config Files: {self.list_available_configs()}")
        self.config = None
        self.nodes = []
        self.edges = []
        
    def load_config_from_file(self, config_path: str) -> Dict[str, Any]:
        """从指定路径加载配置文件"""
        try:
            with open(config_path, 'r', encoding='utf-8') as file:
                if config_path.endswith('.json'):
                    config = json.load(file)
                else:  # yaml/yml
                    config = yaml.safe_load(file)
            
            print(f"✅ 成功加载配置文件: {config_path}")
            return config
        except Exception as e:
            print(f"❌ 加载配置文件失败: {e}")
            return {}
    
    def list_available_configs(self) -> List[str]:
        """列出 SourceFiles 目录中的所有配置文件"""
        if not self.source_files_dir.exists():
            print(f"❌ SourceFiles 目录不存在: {self.source_files_dir}")
            return []
        
        config_files = []
        for pattern in ['*.yaml', '*.yml', '*.json']:
            config_files.extend(glob.glob(str(self.source_files_dir / pattern)))
        
        return [os.path.basename(f) for f in config_files]
    
    def select_config_file(self) -> Optional[str]:
        """让用户选择配置文件"""
        available_configs = self.list_available_configs()
        
        if not available_configs:
            print("📁 SourceFiles 目录中没有找到配置文件")
            print("   支持的格式: .yaml, .yml, .json")
            return None
        
        print("\n📋 可用的配置文件:")
        for i, config_file in enumerate(available_configs, 1):
            print(f"   {i}. {config_file}")
        
        while True:
            try:
                choice = input(f"\n请选择配置文件 (1-{len(available_configs)}): ").strip()
                if choice.lower() in ['q', 'quit', 'exit']:
                    return None
                
                choice_idx = int(choice) - 1
                if 0 <= choice_idx < len(available_configs):
                    selected_file = available_configs[choice_idx]
                    return str(self.source_files_dir / selected_file)
                else:
                    print(f"❌ 请输入 1-{len(available_configs)} 之间的数字")
            except ValueError:
                print("❌ 请输入有效的数字")
            except KeyboardInterrupt:
                print("\n\n👋 用户取消操作")
                return None
    
    def display_config_info(self, config: Dict[str, Any]):
        """显示配置文件信息"""
        print("\n" + "="*50)
        print("📊 团队配置信息")
        print("="*50)
        
        # 显示元数据
        if 'metadata' in config:
            metadata = config['metadata']
            print(f"团队名称: {metadata.get('name', '未命名')}")
            print(f"版本: {metadata.get('version', '未知')}")
            print(f"编译时间: {metadata.get('compiledAt', '未知')}")
        
        # 显示节点信息
        nodes = config.get('nodes', [])
        print(f"\n🔗 节点数量: {len(nodes)}")
        for i, node in enumerate(nodes, 1):
            node_type = node.get('type', '未知')
            node_name = node.get('name', f'节点{i}')
            print(f"   {i}. [{node_type}] {node_name}")
        
        # 显示边信息
        edges = config.get('edges', [])
        print(f"\n🔀 连接数量: {len(edges)}")
        for i, edge in enumerate(edges, 1):
            source = edge.get('source', '未知')
            target = edge.get('target', '未知')
            edge_type = edge.get('type', 'soft')
            print(f"   {i}. {source} -> {target} ({edge_type})")
        
        print("="*50)
    
    def process_input_output(self, user_input: str, config: Dict[str, Any], attachments: Optional[List[Dict[str, Any]]] = None) -> str:
        """Process a single user input and return the team's output."""
        self.team = SimpleTeam(
            goal=user_input,
            config=config,
            input_attachments=attachments,
        )

        output_msg = self.team.run()
        output = f"Team output: {output_msg}"

        return output

    def process_input_output_streaming(self, user_input: str, config: Dict[str, Any], emit, attachments: Optional[List[Dict[str, Any]]] = None) -> str:
        """Process user input but emit telemetry events via provided emit callback."""
        run_id = str(uuid4())
        team = SimpleTeam(
            goal=user_input,
            config=config,
            emit=emit,
            run_id=run_id,
            input_attachments=attachments,
        )
        output_msg = team.run()
        output = f"Team output: {output_msg}"
        return output

    def run_interactive_session(self):
        """运行交互式会话"""
        print("\n🤖 多智能体团队运行器")
        print("=====================================")
        
        # 选择配置文件
        config_path = self.select_config_file()
        if not config_path:
            print("👋 退出程序")
            return
        
        # 加载配置
        config = self.load_config_from_file(config_path)
        if not config:
            print("❌ 无法加载配置文件")
            return
        
        self.config = config
        self.nodes = config.get('nodes', [])
        self.edges = config.get('edges', [])
        
        # 显示配置信息
        self.display_config_info(config)
        
        # 开始交互式处理
        print("\n🚀 团队已启动，可以开始处理输入")
        print("   输入 'quit' 或 'exit' 退出程序")
        print("   输入 'config' 查看当前配置")
        print("-" * 40)
        
        while True:
            try:
                user_input = input("\n💬 请输入: ").strip()
                
                if not user_input:
                    continue
                
                if user_input.lower() in ['quit', 'exit', 'q']:
                    print("👋 会话结束")
                    break
                
                if user_input.lower() == 'config':
                    self.display_config_info(config)
                    continue
                
                # 处理用户输入
                result = self.process_input_output(user_input, config)
                print(f"\n📋 输出结果: {result}")
                
            except KeyboardInterrupt:
                print("\n\n👋 用户中断，会话结束")
                break
            except Exception as e:
                print(f"❌ 处理错误: {e}")


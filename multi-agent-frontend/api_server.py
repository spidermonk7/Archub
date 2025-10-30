#!/usr/bin/env python3
"""
Flask API Server for Multi-Agent Team Runner
前端和Python后端的HTTP通信接口，使用SQLite数据库存储团队配置
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import os
import sys
import time
from database import TeamDatabase
# from ..backend_codes.runner import SimpleTeamRunner
# 把项目根目录加入搜索路径
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from backend_codes.runner import SimpleTeamRunner
from backend_codes.telemetry import QueueEmitter
import json
import threading
import queue
import glob
import re
from pathlib import Path

import yaml

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 初始化数据库
db = TeamDatabase()

# 全局变量存储当前的team runner实例
current_runner = None
current_config = None

DEFAULT_CONFIG_DIR = Path("./SourceFiles")
DEFAULT_CONFIG_PATTERNS = ("*.yaml", "*.yml", "*.json")


def load_default_team_configs():
    """Load default team configurations from SourceFiles directory."""
    if not DEFAULT_CONFIG_DIR.exists():
        return []

    collected_files = []
    for pattern in DEFAULT_CONFIG_PATTERNS:
        collected_files.extend(DEFAULT_CONFIG_DIR.glob(pattern))

    unique_files = {file.resolve(): file for file in collected_files}.values()
    default_teams = []

    for config_path in sorted(unique_files, key=lambda p: p.name.lower()):
        try:
            with config_path.open("r", encoding="utf-8") as handle:
                if config_path.suffix.lower() == ".json":
                    config_data = json.load(handle)
                else:
                    config_data = yaml.safe_load(handle)

            if not isinstance(config_data, dict):
                raise ValueError("Config file must define a mapping/dictionary.")

            metadata = config_data.get("metadata") or {}
            nodes = config_data.get("nodes") or []
            edges = config_data.get("edges") or []

            team_id = str(metadata.get("id") or metadata.get("name") or config_path.stem)
            name = str(metadata.get("name") or config_path.stem)
            description = metadata.get("description") or "Default team template."
            version = metadata.get("version") or "1.0"
            compiled_at = metadata.get("compiledAt") or metadata.get("updatedAt")

            default_teams.append({
                "id": team_id,
                "name": name,
                "description": description,
                "version": version,
                "createdAt": compiled_at,
                "updatedAt": compiled_at,
                "nodeCount": len(nodes),
                "edgeCount": len(edges),
                "configData": config_data,
                "sourceFilename": config_path.name,
                "origin": "default",
            })
        except Exception as exc:
            print(f"⚠️ Failed to load default config '{config_path}': {exc}")
            default_teams.append({
                "id": config_path.stem,
                "name": config_path.stem,
                "description": "Unable to load configuration file.",
                "version": "1.0",
                "nodeCount": 0,
                "edgeCount": 0,
                "configData": {},
                "sourceFilename": config_path.name,
                "origin": "default",
                "error": str(exc),
            })

    return default_teams


def save_default_team_config(team_id: str, config: dict) -> str:
    """Persist a default team configuration to the SourceFiles directory."""
    DEFAULT_CONFIG_DIR.mkdir(parents=True, exist_ok=True)

    safe_id = re.sub(r'[^a-zA-Z0-9_-]+', '_', team_id.strip() or 'default_team')
    filename = f"{safe_id}.yaml"
    path = DEFAULT_CONFIG_DIR / filename

    metadata = dict(config.get("metadata") or {})
    metadata.setdefault("id", safe_id)
    metadata.setdefault("name", metadata.get("name") or safe_id)

    persisted_config = dict(config)
    persisted_config["metadata"] = metadata

    with path.open("w", encoding="utf-8") as handle:
        yaml.safe_dump(persisted_config, handle, allow_unicode=True, sort_keys=False)

    return filename

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    stats = db.get_stats()
    return jsonify({
        'status': 'ok',
        'message': 'Multi-Agent Team Runner API is running',
        'database': stats
    })

@app.route('/api/teams', methods=['GET'])
def get_teams():
    """获取所有团队"""
    try:
        teams = db.get_all_teams()
        return jsonify({
            'success': True,
            'teams': teams
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/default-teams', methods=['GET'])
def get_default_teams():
    """Load default team configurations from SourceFiles directory."""
    try:
        teams = load_default_team_configs()
        return jsonify({
            'success': True,
            'teams': teams
        })
    except Exception as e:
        print(f"⚠️ Failed to enumerate default teams: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/default-teams', methods=['POST'])
def save_default_team_endpoint():
    """Persist a team configuration as a default template."""
    try:
        data = request.get_json(silent=True) or {}
        config = data.get('config')
        team_id = data.get('teamId') or (config or {}).get('id')
        metadata = (config or {}).get('metadata') or {}

        if not isinstance(config, dict) or not config:
            return jsonify({
                'success': False,
                'error': 'Config payload is required'
            }), 400

        candidate_id = team_id or metadata.get('id') or metadata.get('name')
        if not candidate_id:
            candidate_id = f"default_{int(time.time())}"

        filename = save_default_team_config(str(candidate_id), config)
        return jsonify({
            'success': True,
            'teamId': candidate_id,
            'filename': filename
        })
    except Exception as e:
        print(f"⚠️ Failed to save default team: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/default-teams/<team_id>', methods=['DELETE'])
def delete_default_team_endpoint(team_id):
    """Remove a default team configuration from the SourceFiles directory."""
    try:
        data = request.get_json(silent=True) or {}
        filename = data.get('filename')

        teams = load_default_team_configs()
        target = None

        if filename:
            target = next((team for team in teams if team.get('sourceFilename') == filename), None)

        if not target:
            target = next((team for team in teams if team.get('id') == team_id), None)

        if not target:
            return jsonify({
                'success': False,
                'error': 'Default team not found'
            }), 404

        candidate_filename = filename or target.get('sourceFilename')
        path = DEFAULT_CONFIG_DIR / candidate_filename if candidate_filename else None

        if not path or not path.exists():
            safe_id = re.sub(r'[^a-zA-Z0-9_-]+', '_', team_id)
            fallback_names = [
                f"{team_id}.yaml",
                f"{team_id}.yml",
                f"{team_id}.json",
                f"{safe_id}.yaml",
                f"{safe_id}.yml",
                f"{safe_id}.json",
            ]
            for name in fallback_names:
                candidate = DEFAULT_CONFIG_DIR / name
                if candidate.exists():
                    path = candidate
                    break

        if not path or not path.exists():
            return jsonify({
                'success': False,
                'error': 'Default configuration file not found'
            }), 404

        path.unlink()
        return jsonify({'success': True})
    except Exception as e:
        print(f"⚠️ Failed to delete default team: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/teams', methods=['POST'])
def save_team():
    """保存团队配置"""
    try:
        data = request.get_json()
        config = data.get('config') if data else None
        
        if not config:
            return jsonify({
                'success': False,
                'error': 'Config data is required'
            }), 400
        
        team_id = db.save_team(config)
        
        return jsonify({
            'success': True,
            'teamId': team_id,
            'message': f'Successfully saved team: {team_id}'
        })
        
    except Exception as e:
        print(f"❌ Error saving team: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/teams/<team_id>', methods=['GET'])
def get_team(team_id):
    """获取指定团队"""
    try:
        team = db.get_team(team_id)
        if team:
            return jsonify({
                'success': True,
                'team': team
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Team not found'
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/teams/<team_id>', methods=['DELETE'])
def delete_team(team_id):
    """删除团队"""
    try:
        success = db.delete_team(team_id)
        if success:
            return jsonify({
                'success': True,
                'message': f'Successfully deleted team: {team_id}'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Team not found'
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/teams/<team_id>/export', methods=['POST'])
def export_team(team_id):
    """导出团队配置到YAML文件"""
    try:
        file_path = db.export_team_to_yaml(team_id)
        if file_path:
            return jsonify({
                'success': True,
                'filePath': file_path,
                'message': f'Successfully exported team to {file_path}'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to export team or team not found'
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/load-team', methods=['POST'])
def load_team_for_running():
    """加载团队配置用于运行"""
    global current_runner, current_config
    
    try:
        data = request.get_json()
        team_id = data.get('teamId') if data else None
        
        if not team_id:
            return jsonify({
                'success': False,
                'error': 'Team ID is required'
            }), 400
        
        team = db.get_team(team_id)
        if not team:
            return jsonify({
                'success': False,
                'error': 'Team not found'
            }), 404
        
        config = team['configData']
        
        # 创建runner实例并设置配置
        runner = SimpleTeamRunner()
        runner.config = config
        runner.nodes = config.get('nodes', [])
        runner.edges = config.get('edges', [])
        
        # 保存当前配置
        current_runner = runner
        current_config = config
        
        print(f"✅ Successfully loaded team: {team['name']}")
        print(f"   Nodes: {len(config.get('nodes', []))}")
        print(f"   Edges: {len(config.get('edges', []))}")
        
        return jsonify({
            'success': True,
            'team': team,
            'message': f'Successfully loaded team: {team["name"]}'
        })
        
    except Exception as e:
        print(f"❌ Error loading team: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/process-input', methods=['POST'])
def process_input():
    """处理用户输入"""
    global current_runner, current_config
    
    try:
        print(f"🔍 DEBUG: current_runner exists = {current_runner is not None}")
        print(f"🔍 DEBUG: current_config exists = {current_config is not None}")
        
        if not current_runner or not current_config:
            print("❌ ERROR: No team loaded")
            return jsonify({
                'success': False,
                'error': 'No team loaded. Please load a team first.'
            }), 400
        
        data = request.get_json()
        print(f"🔍 DEBUG: Received data = {data}")
        
        if not data:
            print("❌ ERROR: No JSON data received")
            return jsonify({
                'success': False,
                'error': 'No JSON data received'
            }), 400
            
        user_input = data.get('input', '').strip()
        print(f"🔍 DEBUG: user_input = '{user_input}'")
        
        if not user_input:
            print("❌ ERROR: Input is empty")
            return jsonify({
                'success': False,
                'error': 'Input is required'
            }), 400
        
        # 处理输入并生成输出
        result = current_runner.process_input_output(user_input, current_config)
        print(f"🔍 DEBUG: result = '{result}'")
        # 生成处理日志
        nodes = current_config.get('nodes', [])
        processing_log = []
        
        # 模拟处理过程
        processing_log.append(f"🔄 接收输入: {user_input}")
        
        input_nodes = [n for n in nodes if n.get('type') == 'input']
        if input_nodes:
            input_node = input_nodes[0]
            processing_log.append(f"📥 输入节点 [{input_node.get('name')}] 处理输入")
        
        for node in nodes:
            if node.get('type') not in ['input', 'output']:
                processing_log.append(f"⚙️ 节点 [{node.get('name')}] 正在处理...")
        
        output_nodes = [n for n in nodes if n.get('type') == 'output']
        if output_nodes:
            output_node = output_nodes[0]
            processing_log.append(f"📤 输出节点 [{output_node.get('name')}] 生成结果")
        
        processing_log.append("✅ 处理完成")
        
        response_data = {
            'success': True,
            'input': user_input,
            'output': result,
            'processingLog': processing_log,
            'timestamp': time.time()
        }
        
        print(f"✅ Successfully processed input: '{user_input}'")
        print(f"   Output: '{result}'")
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"❌ ERROR: Exception in process_input: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/run-sse', methods=['GET'])
def run_sse():
    """Start a team run and stream telemetry events via Server-Sent Events (SSE)."""
    global current_runner, current_config

    try:
        print(f"🔍 DEBUG: run_sse called")
        print(f"🔍 DEBUG: current_runner exists = {current_runner is not None}")
        print(f"🔍 DEBUG: current_config exists = {current_config is not None}")
        
        if not current_runner or not current_config:
            print("❌ ERROR: No team loaded")
            return jsonify({
                'success': False,
                'error': 'No team loaded. Please load a team first.'
            }), 400

        user_input = request.args.get('input', '').strip()
        print(f"🔍 DEBUG: user_input = '{user_input}'")
        
        if not user_input:
            print("❌ ERROR: Input is empty")
            return jsonify({
                'success': False,
                'error': 'Input is required'
            }), 400

        q: queue.Queue = queue.Queue()
        emitter = QueueEmitter(q)

        def worker():
            try:
                current_runner.process_input_output_streaming(user_input, current_config, emit=emitter)
            except Exception as e:
                try:
                    emitter({
                        'type': 'error',
                        'error': str(e),
                    })
                except Exception:
                    pass

        t = threading.Thread(target=worker, daemon=True)
        t.start()

        def generate():
            finished = False
            while not finished or t.is_alive():
                try:
                    event = q.get(timeout=0.1)
                except Exception:
                    # No item yet, check thread state and continue
                    if not t.is_alive():
                        break
                    continue

                try:
                    evt_type = event.get('type', 'message')
                    data = json.dumps(event, ensure_ascii=False)
                    yield f"event: {evt_type}\n".encode('utf-8')
                    yield f"data: {data}\n\n".encode('utf-8')
                    if evt_type == 'team.run.finished':
                        finished = True
                except Exception:
                    # If serialization fails, try to send a generic error
                    fallback = {'type': 'error', 'error': 'serialization failure'}
                    yield b"event: error\n"
                    yield f"data: {json.dumps(fallback, ensure_ascii=False)}\n\n".encode('utf-8')

        headers = {
            'Cache-Control': 'no-cache',
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        }
        return Response(generate(), headers=headers)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/reset', methods=['POST'])
def reset_session():
    """重置当前会话"""
    global current_runner, current_config
    
    current_runner = None
    current_config = None
    
    print("🔄 Session reset")
    
    return jsonify({
        'success': True,
        'message': 'Session reset successfully'
    })

# 兼容性接口：支持旧的文件系统方式
@app.route('/api/configs', methods=['GET'])
def get_available_configs():
    """获取所有可用的配置文件（兼容性接口）"""
    try:
        teams = db.get_all_teams()
        configs = []
        for team in teams:
            configs.append({
                'filename': f"{team['id']}.yaml",
                'name': team['name'],
                'version': team['version'],
                'compiledAt': team['updatedAt'],
                'nodeCount': team['nodeCount'],
                'edgeCount': team['edgeCount']
            })
        
        return jsonify({
            'success': True,
            'configs': configs
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/load-config', methods=['POST'])
def load_config():
    """加载指定的配置文件（兼容性接口）"""
    global current_runner, current_config
    
    try:
        data = request.get_json()
        filename = data.get('filename') if data else None
        
        if not filename:
            return jsonify({
                'success': False,
                'error': 'Filename is required'
            }), 400
        
        # 从文件名提取team_id
        team_id = filename.replace('.yaml', '')
        team = db.get_team(team_id)
        
        if not team:
            return jsonify({
                'success': False,
                'error': f'Team not found: {team_id}'
            }), 404
        
        config = team['configData']
        
        # 创建runner实例并设置配置
        runner = SimpleTeamRunner()
        runner.config = config
        runner.nodes = config.get('nodes', [])
        runner.edges = config.get('edges', [])
        
        # 保存当前配置
        current_runner = runner
        current_config = config
        
        print(f"✅ Successfully loaded config: {filename}")
        print(f"   Nodes: {len(config.get('nodes', []))}")
        print(f"   Edges: {len(config.get('edges', []))}")
        
        return jsonify({
            'success': True,
            'config': config,
            'message': f'Successfully loaded {filename}'
        })
        
    except Exception as e:
        print(f"❌ Error loading config: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("🚀 启动 Multi-Agent Team Runner API 服务器...")
    print("📡 服务器地址: http://localhost:5000")
    print("🗄️ 数据库: SQLite (teams.db)")
    print("📋 可用接口:")
    print("   GET  /api/health - 健康检查")
    print("   GET  /api/teams - 获取所有团队")
    print("   POST /api/teams - 保存团队配置")
    print("   GET  /api/teams/<id> - 获取指定团队")
    print("   DELETE /api/teams/<id> - 删除团队")
    print("   POST /api/teams/<id>/export - 导出团队到YAML")
    print("   POST /api/load-team - 加载团队用于运行")
    print("   POST /api/process-input - 处理用户输入")
    print("   POST /api/reset - 重置会话")
    print("   --- 兼容性接口 ---")
    print("   GET  /api/configs - 获取配置列表（兼容）")
    print("   POST /api/load-config - 加载配置（兼容）")
    print("-" * 50)
    
    app.run(host='0.0.0.0', port=5000, debug=True)

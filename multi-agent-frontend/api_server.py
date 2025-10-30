#!/usr/bin/env python3
"""
Flask API Server for Multi-Agent Team Runner
前端和Python后端的HTTP通信接口，使用SQLite数据库存储团队配�?
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
from typing import Any, Dict, List, Optional

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

def sanitize_identifier(value: Optional[str], fallback: str = "team") -> str:
    raw = str(value).strip() if value else ""
    cleaned = re.sub(r"[^a-zA-Z0-9_-]+", "_", raw)
    return cleaned or fallback

def generate_default_team_id(original_id: str) -> str:
    safe_original = sanitize_identifier(original_id, "default_team")
    if not safe_original.startswith("default_"):
        safe_original = f"default_{safe_original}"
    return safe_original


def _scan_default_team_configs_from_files() -> List[Dict[str, Any]]:
    """Scan SourceFiles directory for default team configurations."""
    if not DEFAULT_CONFIG_DIR.exists():
        return []

    collected_files: List[Path] = []
    for pattern in DEFAULT_CONFIG_PATTERNS:
        collected_files.extend(DEFAULT_CONFIG_DIR.glob(pattern))

    unique_files = {file.resolve(): file for file in collected_files}.values()
    default_entries: List[Dict[str, Any]] = []

    for config_path in sorted(unique_files, key=lambda p: p.name.lower()):
        try:
            with config_path.open("r", encoding="utf-8") as handle:
                if config_path.suffix.lower() == ".json":
                    config_data = json.load(handle)
                else:
                    config_data = yaml.safe_load(handle)

            if not isinstance(config_data, dict):
                raise ValueError("Config file must define a mapping/dictionary.")

            metadata = dict(config_data.get("metadata") or {})
            nodes = config_data.get("nodes") or []
            edges = config_data.get("edges") or []

            original_identifier = (
                metadata.get("originalId")
                or metadata.get("id")
                or metadata.get("name")
                or config_path.stem
            )
            original_id = sanitize_identifier(str(original_identifier), config_path.stem)
            default_id_candidate = metadata.get("id")
            if default_id_candidate:
                default_id = sanitize_identifier(str(default_id_candidate), generate_default_team_id(original_id))
            else:
                default_id = generate_default_team_id(original_id)
            if default_id == original_id:
                default_id = generate_default_team_id(original_id)

            display_name = metadata.get("name") or original_id
            description = metadata.get("description") or "Default team template."
            version = metadata.get("version") or "1.0"
            compiled_at = metadata.get("compiledAt") or metadata.get("updatedAt")

            metadata["id"] = default_id
            metadata.setdefault("name", display_name)
            metadata.setdefault("originalId", original_id)

            normalized_config = dict(config_data)
            normalized_config["metadata"] = metadata

            default_entries.append({
                "id": default_id,
                "name": display_name,
                "description": description,
                "version": version,
                "createdAt": compiled_at,
                "updatedAt": compiled_at,
                "nodeCount": len(nodes),
                "edgeCount": len(edges),
                "configData": normalized_config,
                "sourceFilename": config_path.name,
                "originalTeamId": original_id,
                "origin": "default",
            })
        except Exception as exc:
            print(f"⚠️ Failed to load default config '{config_path}': {exc}")
            default_entries.append({
                "id": sanitize_identifier(config_path.stem, "default_team"),
                "name": config_path.stem,
                "description": "Unable to load configuration file.",
                "version": "1.0",
                "nodeCount": 0,
                "edgeCount": 0,
                "configData": {},
                "sourceFilename": config_path.name,
                "originalTeamId": None,
                "origin": "default",
                "error": str(exc),
            })

    return default_entries


def sync_default_configs_from_files() -> List[Dict[str, Any]]:
    defaults = _scan_default_team_configs_from_files()
    for entry in defaults:
        config_payload = entry.get("configData") or {}
        team_id = entry.get("id")
        try:
            db.save_team(
                config_payload,
                team_id=team_id,
                origin="default",
                source_filename=entry.get("sourceFilename"),
                original_team_id=entry.get("originalTeamId"),
            )
        except Exception as exc:
            print(f"⚠️ Failed to persist default team '{team_id}': {exc}")
    return defaults


def load_default_team_configs() -> List[Dict[str, Any]]:
    return db.get_all_teams(origin="default")


sync_default_configs_from_files()

def save_default_team_config(team_id: str, config: dict, original_team_id: Optional[str] = None) -> str:
    """Persist a default team configuration to the SourceFiles directory."""
    DEFAULT_CONFIG_DIR.mkdir(parents=True, exist_ok=True)

    safe_id = sanitize_identifier(team_id, "default_team")
    filename = f"{safe_id}.yaml"
    path = DEFAULT_CONFIG_DIR / filename

    metadata = dict(config.get("metadata") or {})
    metadata.setdefault("id", safe_id)
    metadata.setdefault("name", metadata.get("name") or safe_id)
    if original_team_id:
        metadata["originalId"] = sanitize_identifier(str(original_team_id), safe_id)
    else:
        metadata.setdefault("originalId", safe_id)

    persisted_config = dict(config)
    persisted_config["metadata"] = metadata

    with path.open("w", encoding="utf-8") as handle:
        yaml.safe_dump(persisted_config, handle, allow_unicode=True, sort_keys=False)

    return filename

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接�?"""
    stats = db.get_stats()
    return jsonify({
        'status': 'ok',
        'message': 'Multi-Agent Team Runner API is running',
        'database': stats
    })

@app.route('/api/teams', methods=['GET'])
def get_teams():
    """获取所有团队信息"""
    try:
        requested_origin = request.args.get('origin')
        normalized_origin = None
        if requested_origin:
            lower_origin = requested_origin.lower()
            if lower_origin not in ('default', 'user'):
                return jsonify({
                    'success': False,
                    'error': 'Invalid origin filter'
                }), 400
            normalized_origin = lower_origin

        teams = db.get_all_teams(origin=normalized_origin)
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
        sync_default_configs_from_files()
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
        raw_config = data.get('config')
        if not isinstance(raw_config, dict) or not raw_config:
            return jsonify({
                'success': False,
                'error': 'Config payload is required'
            }), 400

        metadata = dict(raw_config.get('metadata') or {})
        original_candidate = (
            data.get('teamId')
            or metadata.get('originalId')
            or metadata.get('id')
            or metadata.get('name')
        )
        if not original_candidate:
            original_candidate = f"user_team_{int(time.time())}"
        original_team_id = sanitize_identifier(str(original_candidate), f"user_team_{int(time.time())}")

        default_team_id = generate_default_team_id(original_team_id)
        display_name = metadata.get('name') or original_team_id
        description = metadata.get('description') or "Default team template."

        metadata['id'] = default_team_id
        metadata['name'] = display_name
        metadata['description'] = description
        metadata['originalId'] = original_team_id

        config_payload = dict(raw_config)
        config_payload['metadata'] = metadata

        filename = save_default_team_config(default_team_id, config_payload, original_team_id)
        db.save_team(
            config_payload,
            team_id=default_team_id,
            origin='default',
            source_filename=filename,
            original_team_id=original_team_id,
        )

        return jsonify({
            'success': True,
            'teamId': default_team_id,
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
        print(f"Attempting to delete default team: {team_id}")
        data = request.get_json(silent=True) or {}
        filename_hint = data.get('filename')
        requested_original_id = data.get('originalTeamId')

        team = db.get_team(team_id)
        if not team or team.get('origin') != 'default':
            return jsonify({
                'success': False,
                'error': 'Default team not found'
            }), 404

        source_filename = filename_hint or team.get('sourceFilename')
        candidate_paths = []
        if source_filename:
            candidate_paths.append(DEFAULT_CONFIG_DIR / source_filename)

        safe_id = sanitize_identifier(team_id, team_id)
        for name in {team_id, safe_id}:
            candidate_paths.extend([
                DEFAULT_CONFIG_DIR / f"{name}.yaml",
                DEFAULT_CONFIG_DIR / f"{name}.yml",
                DEFAULT_CONFIG_DIR / f"{name}.json",
            ])

        deleted_file = False
        seen_paths = set()
        for path in candidate_paths:
            if path in seen_paths:
                continue
            seen_paths.add(path)
            if path.exists():
                path.unlink()
                deleted_file = True
                break

        db.delete_team(team_id)

        original_id = requested_original_id or team.get('originalTeamId')
        if not original_id:
            metadata = (team.get('configData') or {}).get('metadata') or {}
            original_id = metadata.get('originalId')

        removed_original = False
        if original_id and original_id != team_id:
            removed_original = db.delete_team(str(original_id))

        return jsonify({
            'success': True,
            'removedOriginal': removed_original,
            'removedFile': deleted_file
        })
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
        print(f"�?Error saving team: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/teams/<team_id>', methods=['GET'])
def get_team(team_id):
    """获取指定团队"""
    try:
        team = db.get_team(team_id)
        "Also try to load from default teams in SourceFiles, add those to the teams too."
        if not team:
            default_teams = load_default_team_configs()
            team = next((t for t in default_teams if t.get('id') == team_id), None)

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
        print(f"Attempting to delete team: {team_id}")
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
        print(f"⚠️ Error deleting team: {e}")
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
        
        # 创建runner实例并设置配�?
        runner = SimpleTeamRunner()
        runner.config = config
        runner.nodes = config.get('nodes', [])
        runner.edges = config.get('edges', [])
        
        # 保存当前配置
        current_runner = runner
        current_config = config
        
        print(f"�?Successfully loaded team: {team['name']}")
        print(f"   Nodes: {len(config.get('nodes', []))}")
        print(f"   Edges: {len(config.get('edges', []))}")
        
        return jsonify({
            'success': True,
            'team': team,
            'message': f'Successfully loaded team: {team["name"]}'
        })
        
    except Exception as e:
        print(f"�?Error loading team: {e}")
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
            print("�?ERROR: No team loaded")
            return jsonify({
                'success': False,
                'error': 'No team loaded. Please load a team first.'
            }), 400
        
        data = request.get_json()
        print(f"🔍 DEBUG: Received data = {data}")
        
        if not data:
            print("�?ERROR: No JSON data received")
            return jsonify({
                'success': False,
                'error': 'No JSON data received'
            }), 400
            
        user_input = data.get('input', '').strip()
        print(f"🔍 DEBUG: user_input = '{user_input}'")
        
        if not user_input:
            print("�?ERROR: Input is empty")
            return jsonify({
                'success': False,
                'error': 'Input is required'
            }), 400
        
        # 处理输入并生成输�?
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
        
        processing_log.append("�?处理完成")
        
        response_data = {
            'success': True,
            'input': user_input,
            'output': result,
            'processingLog': processing_log,
            'timestamp': time.time()
        }
        
        print(f"�?Successfully processed input: '{user_input}'")
        print(f"   Output: '{result}'")
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"�?ERROR: Exception in process_input: {e}")
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
            print("�?ERROR: No team loaded")
            return jsonify({
                'success': False,
                'error': 'No team loaded. Please load a team first.'
            }), 400

        user_input = request.args.get('input', '').strip()
        print(f"🔍 DEBUG: user_input = '{user_input}'")
        
        if not user_input:
            print("�?ERROR: Input is empty")
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
        sync_default_configs_from_files()
        teams = db.get_all_teams()
        configs = []
        for team in teams:
            configs.append({
                'filename': f"{team['id']}.yaml",
                'name': team['name'],
                'version': team['version'],
                'compiledAt': team['updatedAt'],
                'nodeCount': team['nodeCount'],
                'edgeCount': team['edgeCount'],
                'origin': team.get('origin', 'user'),
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
        filename = data.get('filename')
        requested_original_id = data.get('originalTeamId')
        
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
        
        # 创建runner实例并设置配�?
        runner = SimpleTeamRunner()
        runner.config = config
        runner.nodes = config.get('nodes', [])
        runner.edges = config.get('edges', [])
        
        # 保存当前配置
        current_runner = runner
        current_config = config
        
        print(f"�?Successfully loaded config: {filename}")
        print(f"   Nodes: {len(config.get('nodes', []))}")
        print(f"   Edges: {len(config.get('edges', []))}")
        
        return jsonify({
            'success': True,
            'config': config,
            'message': f'Successfully loaded {filename}'
        })
        
    except Exception as e:
        print(f"�?Error loading config: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("🚀 启动 Multi-Agent Team Runner API 服务�?..")
    print("📡 服务器地址: http://localhost:5000")
    print("🗄�?数据�? SQLite (teams.db)")
    print("📋 可用接口:")
    print("   GET  /api/health - 健康检查接口")
    print("   GET  /api/teams - 获取所有团队信息")
    print("   POST /api/teams - 保存团队配置")
    print("   GET  /api/teams/<id> - 获取指定团队")
    print("   DELETE /api/teams/<id> - 删除团队")
    print("   POST /api/teams/<id>/export - 导出团队到YAML")
    print("   POST /api/load-team - 加载团队用于运行")
    print("   POST /api/process-input - 处理用户输入")
    print("   POST /api/reset - 重置会话")
    print("   --- 兼容性接�?---")
    print("   GET  /api/configs - 获取配置列表（兼容）")
    print("   POST /api/load-config - 加载配置（兼容）")
    print("-" * 50)
    
    app.run(host='0.0.0.0', port=5000, debug=True)

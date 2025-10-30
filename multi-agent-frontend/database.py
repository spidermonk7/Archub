#!/usr/bin/env python3
"""
数据库管理模块
使用 SQLite 存储团队配置，确保数据持久化
"""

import sqlite3
import json
import yaml
import re
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Set

class TeamDatabase:
    def __init__(self, db_path: str = "./teams.db"):
        self.db_path = Path(db_path)
        self.init_database()
    
    def init_database(self):
        """初始化数据库表"""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # 创建团队表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS teams (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    config_data TEXT NOT NULL,
                    node_count INTEGER DEFAULT 0,
                    edge_count INTEGER DEFAULT 0,
                    version TEXT DEFAULT '1.0',
                    origin TEXT DEFAULT 'user',
                    source_filename TEXT,
                    original_team_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 检查并添加缺失的列
            existing_columns = self._get_table_columns(cursor, 'teams')
            if 'origin' not in existing_columns:
                cursor.execute("ALTER TABLE teams ADD COLUMN origin TEXT DEFAULT 'user'")
            if 'source_filename' not in existing_columns:
                cursor.execute("ALTER TABLE teams ADD COLUMN source_filename TEXT")
            if 'original_team_id' not in existing_columns:
                cursor.execute("ALTER TABLE teams ADD COLUMN original_team_id TEXT")
            
            # 创建索引 - 在列确保存在后
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_teams_created_at ON teams(created_at)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_teams_origin ON teams(origin)')
            
            conn.commit()
            print(f"✅ 数据库初始化完成: {self.db_path.resolve()}")
    
    def _get_table_columns(self, cursor: sqlite3.Cursor, table_name: str) -> Set[str]:
        cursor.execute(f"PRAGMA table_info({table_name})")
        return {row[1] for row in cursor.fetchall()}
    
    def save_team(
        self,
        team_config: Dict[str, Any],
        *,
        team_id: Optional[str] = None,
        origin: str = 'user',
        source_filename: Optional[str] = None,
        original_team_id: Optional[str] = None,
    ) -> str:
        """保存团队配置"""
        try:
            # 优先使用用户提供的名称和描述
            metadata = dict(team_config.get('metadata') or {})
            candidate_id = team_id or metadata.get('id') or metadata.get('name')
            normalized_id = str(candidate_id).strip() if candidate_id else ''
            if not normalized_id:
                normalized_id = f"team_{int(datetime.now().timestamp())}"
            safe_id = re.sub(r'[^a-zA-Z0-9_-]+', '_', normalized_id) or f"team_{int(datetime.now().timestamp())}"
            team_id = safe_id
            name = metadata.get('name') or team_id
            description = metadata.get('description') or f"包含 {len(team_config.get('nodes', []))} 个节点和 {len(team_config.get('edges', []))} 个连接的多智能体系统"
            
            metadata.setdefault('id', team_id)
            metadata.setdefault('name', name)
            metadata.setdefault('description', description)
            if original_team_id:
                metadata.setdefault('originalId', original_team_id)
            
            persisted_config = dict(team_config)
            persisted_config['metadata'] = metadata
            
            config_json = json.dumps(persisted_config, ensure_ascii=False, indent=2)
            node_count = len(persisted_config.get('nodes', []))
            edge_count = len(persisted_config.get('edges', []))
            version = metadata.get('version', '1.0')
            normalized_origin = origin if origin in ('default', 'user') else 'user'
            cleaned_source = str(source_filename).strip() if source_filename else None
            cleaned_original_id = str(original_team_id).strip() if original_team_id else None
            
            def _write():
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    
                    # 检查是否已存在
                    cursor.execute('SELECT id FROM teams WHERE id = ?', (team_id,))
                    exists = cursor.fetchone()
                    
                    if exists:
                        # 更新现有团队
                        cursor.execute('''
                            UPDATE teams 
                            SET name = ?, description = ?, config_data = ?, 
                                node_count = ?, edge_count = ?, version = ?, origin = ?,
                                source_filename = ?, original_team_id = ?,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        ''', (
                            name,
                            description,
                            config_json,
                            node_count,
                            edge_count,
                            version,
                            normalized_origin,
                            cleaned_source,
                            cleaned_original_id,
                            team_id
                        ))
                        print(f"✅ 更新团队: {name} - {description}")
                    else:
                        # 创建新团队
                        cursor.execute('''
                            INSERT INTO teams (id, name, description, config_data, 
                                             node_count, edge_count, version, origin,
                                             source_filename, original_team_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            team_id,
                            name,
                            description,
                            config_json,
                            node_count,
                            edge_count,
                            version,
                            normalized_origin,
                            cleaned_source,
                            cleaned_original_id
                        ))
                        print(f"✅ 创建新团队: {name} - {description}")
                    
                    conn.commit()

            try:
                _write()
            except sqlite3.OperationalError as db_error:
                if 'no such table' in str(db_error):
                    print("⚠️ 检测到缺失的数据库表，正在重新初始化数据库结构...")
                    self.init_database()
                    _write()
                else:
                    raise

            return team_id
                
        except Exception as e:
            print(f"❌ 保存团队失败: {e}")
            raise
    
    def get_all_teams(self, origin: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取所有团队"""
        try:
            def _read():
                with sqlite3.connect(self.db_path) as conn:
                    conn.row_factory = sqlite3.Row  # 使返回结果可以按列名访问
                    cursor = conn.cursor()
                    
                    filtered_origin = None
                    if origin:
                        lower_origin = origin.lower()
                        if lower_origin in ('default', 'user'):
                            filtered_origin = lower_origin
                    query = 'SELECT * FROM teams'
                    params: List[Any] = []
                    if filtered_origin:
                        query += ' WHERE origin = ?'
                        params.append(filtered_origin)
                    query += ' ORDER BY updated_at DESC'
                    cursor.execute(query, params)
                    
                    teams = []
                    for row in cursor.fetchall():
                        team = {
                            'id': row['id'],
                            'name': row['name'],
                            'description': row['description'],
                            'nodeCount': row['node_count'],
                            'edgeCount': row['edge_count'],
                            'version': row['version'],
                            'createdAt': row['created_at'],
                            'updatedAt': row['updated_at'],
                            'origin': row['origin'] or 'user',
                            'sourceFilename': row['source_filename'],
                            'originalTeamId': row['original_team_id'],
                            'configData': json.loads(row['config_data']) if row['config_data'] else {}
                        }
                        teams.append(team)
                    
                    return teams

            try:
                return _read()
            except sqlite3.OperationalError as db_error:
                if 'no such table' in str(db_error):
                    self.init_database()
                    return _read()
                raise
                
        except Exception as e:
            print(f"❌ 获取团队列表失败: {e}")
            return []
    
    def get_team(self, team_id: str) -> Optional[Dict[str, Any]]:
        """获取指定团队"""
        try:
            def _read_one():
                with sqlite3.connect(self.db_path) as conn:
                    conn.row_factory = sqlite3.Row
                    cursor = conn.cursor()
                    
                    cursor.execute('SELECT * FROM teams WHERE id = ?', (team_id,))
                    row = cursor.fetchone()
                    
                    if row:
                        return {
                            'id': row['id'],
                            'name': row['name'],
                            'description': row['description'],
                            'nodeCount': row['node_count'],
                            'edgeCount': row['edge_count'],
                            'version': row['version'],
                            'createdAt': row['created_at'],
                            'updatedAt': row['updated_at'],
                            'origin': row['origin'] or 'user',
                            'sourceFilename': row['source_filename'],
                            'originalTeamId': row['original_team_id'],
                            'configData': json.loads(row['config_data']) if row['config_data'] else {}
                        }
                    return None

            try:
                return _read_one()
            except sqlite3.OperationalError as db_error:
                if 'no such table' in str(db_error):
                    self.init_database()
                    return _read_one()
                raise
                
        except Exception as e:
            print(f"❌ 获取团队失败: {e}")
            return None
    
    def delete_team(self, team_id: str) -> bool:
        """删除团队"""
        try:
            def _delete():
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute('DELETE FROM teams WHERE id = ?', (team_id,))
                    conn.commit()
                    
                    if cursor.rowcount > 0:
                        print(f"✅ 删除团队: {team_id}")
                        return True
                    else:
                        print(f"⚠️ 团队不存在: {team_id}")
                        return False

            try:
                return _delete()
            except sqlite3.OperationalError as db_error:
                if 'no such table' in str(db_error):
                    self.init_database()
                    return _delete()
                raise
                    
        except Exception as e:
            print(f"❌ 删除团队失败: {e}")
            return False
    
    def export_team_to_yaml(self, team_id: str, output_dir: str = "./SourceFiles") -> Optional[str]:
        """导出团队配置到YAML文件"""
        try:
            team = self.get_team(team_id)
            if not team:
                return None
            
            output_path = Path(output_dir)
            output_path.mkdir(exist_ok=True)
            
            filename = f"{team_id}.yaml"
            file_path = output_path / filename
            
            with open(file_path, 'w', encoding='utf-8') as f:
                yaml.dump(team['configData'], f, allow_unicode=True, default_flow_style=False, indent=2)
            
            print(f"✅ 导出团队配置: {file_path}")
            return str(file_path)
            
        except Exception as e:
            print(f"❌ 导出团队配置失败: {e}")
            return None
    
    def get_stats(self) -> Dict[str, Any]:
        """获取数据库统计信息"""
        try:
            def _stats():
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    
                    cursor.execute('SELECT COUNT(*) as total_teams FROM teams')
                    total_teams = cursor.fetchone()[0]
                    
                    cursor.execute('SELECT SUM(node_count) as total_nodes FROM teams')
                    total_nodes = cursor.fetchone()[0] or 0
                    
                    cursor.execute('SELECT SUM(edge_count) as total_edges FROM teams')
                    total_edges = cursor.fetchone()[0] or 0
                    
                    return {
                        'totalTeams': total_teams,
                        'totalNodes': total_nodes,
                        'totalEdges': total_edges,
                        'databaseSize': self.db_path.stat().st_size if self.db_path.exists() else 0
                    }

            try:
                return _stats()
            except sqlite3.OperationalError as db_error:
                if 'no such table' in str(db_error):
                    self.init_database()
                    return _stats()
                raise
                
        except Exception as e:
            print(f"❌ 获取统计信息失败: {e}")
            return {
                'totalTeams': 0,
                'totalNodes': 0,
                'totalEdges': 0,
                'databaseSize': 0
            }

# 测试代码
if __name__ == "__main__":
    db = TeamDatabase()
    
    # 示例团队配置
    sample_config = {
        "nodes": [
            {"id": "input-1", "type": "input", "name": "用户输入"},
            {"id": "output-1", "type": "output", "name": "结果输出"}
        ],
        "edges": [],
        "metadata": {
            "name": "test-team",
            "version": "1.0",
            "compiledAt": datetime.now().isoformat()
        }
    }
    
    # 测试保存
    team_id = db.save_team(sample_config)
    print(f"保存的团队ID: {team_id}")
    
    # 测试获取
    teams = db.get_all_teams()
    print(f"所有团队: {len(teams)} 个")
    
    # 测试统计
    stats = db.get_stats()
    print(f"统计信息: {stats}")

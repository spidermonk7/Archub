import React from 'react';
import { Spin, Tag } from 'antd';
import './WorkflowChat.css';

export type ChatEventType = 'system' | 'processing' | 'message';
export type ChatStatus = 'processing' | 'done' | undefined;

export interface WorkflowEvent {
  id: string;
  type: ChatEventType;
  ts: number;
  nodeId?: string;
  nodeName?: string;
  targetName?: string;
  content?: string;
  status?: ChatStatus;
}

interface WorkflowChatProps {
  events: WorkflowEvent[];
}

const colorFromName = (name: string | undefined) => {
  if (!name) return '#8884d8';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 60%)`;
};

const initials = (name?: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const WorkflowChat: React.FC<WorkflowChatProps> = ({ events }) => {
  return (
    <div className="workflow-chat">
      {events.map((e) => {
        if (e.type === 'system') {
          // Do not render system events per requirements
          return null;
        }
        if (e.type === 'processing') {
          const color = colorFromName(e.nodeName);
          return (
            <div key={e.id} className="chat-row left">
              <div className="avatar" style={{ backgroundColor: color }}>{initials(e.nodeName)}</div>
              <div className="bubble processing">
                <div className="meta">
                  <span className="name">{e.nodeName}</span>
                  <Tag color={'orange'}>处理中</Tag>
                </div>
                <div className="content">
                  <><Spin size="small" /> 正在处理...</>
                </div>
              </div>
            </div>
          );
        }
        // message
        const color = colorFromName(e.nodeName);
        return (
          <div key={e.id} className="chat-row left">
            <div className="avatar" style={{ backgroundColor: color }}>{initials(e.nodeName)}</div>
            <div className="bubble message">
              <div className="meta">
                <span className="name">{e.nodeName}</span>
                {e.targetName && <span className="arrow">→ {e.targetName}</span>}
              </div>
              <div className="content">{e.content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WorkflowChat;

import React from 'react';
import { Spin, Tag } from 'antd';
import {
  FileOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileZipOutlined,
  AudioOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import './WorkflowChat.css';
import { UploadedFileMeta } from '../types/uploads';

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
  attachments?: UploadedFileMeta[];
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

const pickIcon = (mime?: string, filename?: string) => {
  const safeMime = (mime || '').toLowerCase();
  const safeName = (filename || '').toLowerCase();
  if (safeMime.startsWith('image/') || /\.(png|jpg|jpeg|gif|bmp|svg)$/.test(safeName)) return <FileImageOutlined />;
  if (safeMime === 'application/pdf' || safeName.endsWith('.pdf')) return <FilePdfOutlined />;
  if (safeMime.startsWith('text/') || /\.(txt|md|csv|log)$/.test(safeName)) return <FileTextOutlined />;
  if (safeMime.startsWith('audio/') || /\.(mp3|wav|aac)$/.test(safeName)) return <AudioOutlined />;
  if (safeMime.startsWith('video/') || /\.(mp4|mov|avi|mkv)$/.test(safeName)) return <VideoCameraOutlined />;
  if (safeMime.includes('zip') || /\.(zip|tar|gz|7z)$/.test(safeName)) return <FileZipOutlined />;
  return <FileOutlined />;
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
              <div className="content markdown">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const language = match ? match[1] : 'text';
                      
                      if (!inline) {
                        return (
                          <pre className="code-block" {...props}>
                            <code className={`language-${language}`}>
                              {String(children).replace(/\n$/, '')}
                            </code>
                          </pre>
                        );
                      }
                      
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {e.content || ''}
                </ReactMarkdown>
              </div>
              {e.attachments && e.attachments.length > 0 && (
                <div className="attachment-list">
                  {e.attachments.map((att) => {
                    const label = att.displayName || att.fileName || att.fileId;
                    const href = att.downloadUrl || att.storageUri || att.storagePath || '#';
                    return (
                      <a
                        key={`${e.id}_${att.fileId}`}
                        className="attachment-pill"
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={label}
                      >
                        <span className="attachment-icon">{pickIcon(att.mimeType, label)}</span>
                        <span className="attachment-name">{label}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WorkflowChat;

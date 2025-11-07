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
  assetBaseUrl?: string;
}

const HTTP_PATTERN = /^https?:\/\//i;
const DATA_URL_PATTERN = /^data:/i;
const IMAGE_EXT_PATTERN = /\.(png|jpe?g|gif|bmp|svg|webp|heic|heif|tiff?)$/i;
const DRIVE_PATTERN = /^[a-z]:/i;

const formatBytes = (input?: number) => {
  if (!input || input <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = input;
  let unitIdx = 0;
  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024;
    unitIdx += 1;
  }
  return unitIdx === 0 ? `${Math.round(size)} ${units[unitIdx]}` : `${size.toFixed(1)} ${units[unitIdx]}`;
};

const isImageAttachment = (mime?: string, filename?: string) => {
  const safeMime = (mime || '').toLowerCase();
  const safeName = (filename || '').toLowerCase();
  return safeMime.startsWith('image/') || IMAGE_EXT_PATTERN.test(safeName);
};

const normalizeBase = (base?: string) => {
  if (!base) return '';
  return base.replace(/\/+$/, '');
};

const canTreatAsRelative = (value: string) => !DRIVE_PATTERN.test(value) && !value.startsWith('\\\\');

const resolveAttachmentUrl = (att: UploadedFileMeta, assetBaseUrl?: string): string => {
  const base = normalizeBase(assetBaseUrl);
  const attempt = (raw?: string) => {
    const candidate = (raw || '').trim();
    if (!candidate) return '';
    if (HTTP_PATTERN.test(candidate) || DATA_URL_PATTERN.test(candidate)) return candidate;
    if (candidate.startsWith('/')) {
      return base ? `${base}${candidate}` : candidate;
    }
    if (!canTreatAsRelative(candidate)) {
      return '';
    }
    if (base && !candidate.includes('://')) {
      return `${base}/${candidate}`;
    }
    return '';
  };

  const preferred = [att.publicUrl, att.previewUrl, att.downloadUrl];
  for (const option of preferred) {
    const resolved = attempt(option);
    if (resolved) return resolved;
  }

  const fallbacks = [att.storageUri, att.storagePath];
  for (const option of fallbacks) {
    const resolved = attempt(option);
    if (resolved) return resolved;
  }

  return '#';
};

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
  if (safeMime.startsWith('image/') || /\.(png|jpg|jpeg|gif|bmp|svg|webp|heic|heif|tif|tiff)$/.test(safeName)) return <FileImageOutlined />;
  if (safeMime === 'application/pdf' || safeName.endsWith('.pdf')) return <FilePdfOutlined />;
  if (safeMime.startsWith('text/') || /\.(txt|md|csv|log)$/.test(safeName)) return <FileTextOutlined />;
  if (safeMime.startsWith('audio/') || /\.(mp3|wav|aac)$/.test(safeName)) return <AudioOutlined />;
  if (safeMime.startsWith('video/') || /\.(mp4|mov|avi|mkv)$/.test(safeName)) return <VideoCameraOutlined />;
  if (safeMime.includes('zip') || /\.(zip|tar|gz|7z)$/.test(safeName)) return <FileZipOutlined />;
  return <FileOutlined />;
};

const WorkflowChat: React.FC<WorkflowChatProps> = ({ events, assetBaseUrl }) => {
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
        const preparedAttachments = (e.attachments || []).map((att) => {
          const label = att.displayName || att.fileName || att.fileId || 'Attachment';
          const url = resolveAttachmentUrl(att, assetBaseUrl);
          const sizeText = formatBytes(att.sizeBytes);
          const canPreview = url && url !== '#';
          const asImage = canPreview && isImageAttachment(att.mimeType, label);
          return { source: att, label, url, sizeText, isImage: asImage };
        });
        const imageAttachments = preparedAttachments.filter((item) => item.isImage);
        const fileAttachments = preparedAttachments.filter((item) => !item.isImage);
        const hasAttachments = preparedAttachments.length > 0;
        return (
          <div key={e.id} className="chat-row left">
            <div className="avatar" style={{ backgroundColor: color }}>{initials(e.nodeName)}</div>
            <div className="bubble message">
              <div className="meta">
                <span className="name">{e.nodeName}</span>
                {e.targetName && <span className="arrow">-&gt; {e.targetName}</span>}
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
              {hasAttachments && (
                <>
                  {imageAttachments.length > 0 && (
                    <div className="attachment-gallery">
                      {imageAttachments.map(({ source, label, url, sizeText }) => (
                        <figure
                          key={`${e.id}_${source.fileId || label}_preview`}
                          className="attachment-card image"
                        >
                          <a
                            className="attachment-image-link"
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img src={url} alt={label} loading="lazy" />
                          </a>
                          <figcaption>
                            <span className="attachment-name">{label}</span>
                            {sizeText && <span className="attachment-size">{sizeText}</span>}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                  {fileAttachments.length > 0 && (
                    <div className="attachment-list">
                      {fileAttachments.map(({ source, label, url }) => {
                        const href = url !== '#' ? url : undefined;
                        if (!href) {
                          return (
                            <div
                              key={`${e.id}_${source.fileId || label}`}
                              className="attachment-pill attachment-pill--disabled"
                              title={label}
                            >
                              <span className="attachment-icon">{pickIcon(source.mimeType, label)}</span>
                              <span className="attachment-name">{label}</span>
                            </div>
                          );
                        }
                        return (
                          <a
                            key={`${e.id}_${source.fileId || label}`}
                            className="attachment-pill"
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={label}
                          >
                            <span className="attachment-icon">{pickIcon(source.mimeType, label)}</span>
                            <span className="attachment-name">{label}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WorkflowChat;

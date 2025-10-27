import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Typography } from 'antd';
import MarkdownRenderer from './MarkdownRenderer';
import './TerminalOutput.css';

const { Text } = Typography;

interface TerminalOutputProps {
  output: string[];
  isRunning: boolean;
}

const TerminalOutput = forwardRef<HTMLDivElement, TerminalOutputProps>(
  ({ output, isRunning }, ref) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const endRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => terminalRef.current!);

    // 自动滚动到底部
    useEffect(() => {
      if (endRef.current) {
        endRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, [output]);

    const formatTimestamp = (index: number) => {
      const now = new Date();
      const timestamp = new Date(now.getTime() + index * 1000);
      return timestamp.toLocaleTimeString();
    };

    const getLogLevel = (line: string): string => {
      if (line.includes('[ERROR]') || line.includes('错误')) return 'error';
      if (line.includes('[WARN]') || line.includes('警告')) return 'warning';
      if (line.includes('[INFO]') || line.includes('信息')) return 'info';
      if (line.includes('[DEBUG]') || line.includes('调试')) return 'debug';
      if (line.includes('[SUCCESS]') || line.includes('成功')) return 'success';
      return 'default';
    };

    return (
      <div className="terminal-output" ref={terminalRef}>
        <div className="terminal-header">
          <div className="terminal-controls">
            <div className="terminal-button red"></div>
            <div className="terminal-button yellow"></div>
            <div className="terminal-button green"></div>
          </div>
          <div className="terminal-title">运行日志</div>
        </div>
        
        <div className="terminal-content">
          {output.length === 0 && !isRunning && (
            <div className="terminal-empty">
              <Text type="secondary">等待运行开始...</Text>
            </div>
          )}
          
          {output.map((line, index) => {
            const level = getLogLevel(line);
            return (
              <div key={index} className={`terminal-line level-${level}`}>
                <span className="terminal-timestamp">[{formatTimestamp(index)}]</span>
                <div className="terminal-text">
                  <MarkdownRenderer content={line} className="terminal-markdown" />
                </div>
              </div>
            );
          })}
          
          {isRunning && (
            <div className="terminal-line">
              <span className="terminal-timestamp">
                [{new Date().toLocaleTimeString()}]
              </span>
              <span className="terminal-cursor">
                <span className="blinking-cursor">▊</span>
              </span>
            </div>
          )}
          
          <div ref={endRef} />
        </div>
      </div>
    );
  }
);

TerminalOutput.displayName = 'TerminalOutput';

export default TerminalOutput;

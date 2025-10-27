import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

type MarkdownCodeProps = React.HTMLAttributes<HTMLElement> & {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
};

const markdownComponents: Components = {
  code({ inline, className, children, ...rest }: MarkdownCodeProps) {
    const match = /language-(\w+)/.exec(className || '');
    const languageClass = match ? ` language-${match[1]}` : '';
    const content = String(children ?? '').replace(/\n$/, '');

    if (inline) {
      return (
        <code className={className} {...rest}>
          {children}
        </code>
      );
    }

    return (
      <pre className={`code-block${languageClass}`}>
        <code {...rest}>{content}</code>
      </pre>
    );
  },
  table({ children }) {
    return (
      <div style={{ overflowX: 'auto' }}>
        <table>{children}</table>
      </div>
    );
  },
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;

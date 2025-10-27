import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 完全抑制 ResizeObserver 错误的解决方案（更健壮）
const isROError = (msg?: any): boolean => {
  const s = typeof msg === 'string' ? msg : (msg?.message || msg?.toString?.());
  if (!s) return false;
  return (
    s.includes('ResizeObserver') ||
    s.includes('ResizeObserver loop limit exceeded') ||
    s.includes('ResizeObserver loop completed with undelivered notifications')
  );
};

const originalResizeObserver = window.ResizeObserver;
window.ResizeObserver = class extends originalResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    const wrapped: ResizeObserverCallback = (entries, observer) => {
      try {
        callback(entries, observer);
      } catch (e: any) {
        if (isROError(e)) return; // 静默忽略
        throw e;
      }
    };
    super(wrapped);
  }
};

// 更强的错误处理
const resizeObserverErrorHandler = (e: ErrorEvent) => {
  if (isROError(e.message) || isROError((e as any).error)) {
    e.preventDefault();
    e.stopImmediatePropagation();
    return false;
  }
};

// 监听所有类型的错误
window.addEventListener('error', resizeObserverErrorHandler, true);
window.addEventListener('unhandledrejection', (e) => {
  const r: any = (e as any).reason;
  if (isROError(r?.message) || isROError(r)) {
    e.preventDefault();
  }
});

// 兜底 onerror 覆盖（某些 overlay 走这里）
const originalOnError = window.onerror;
window.onerror = function (message: any, source?: any, lineno?: any, colno?: any, error?: any) {
  if (isROError(message) || isROError(error)) {
    return true; // 阻止默认处理
  }
  if (typeof originalOnError === 'function') {
    // @ts-ignore
    return originalOnError.apply(this, arguments as any);
  }
  return false;
};

// 重写 console.error
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args.some(a => isROError(a))) return;
  originalConsoleError.apply(console, args as any);
};

const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  if (args.some(a => isROError(a))) return;
  originalConsoleWarn.apply(console, args as any);
};

// 拦截 webpack-dev-server 的错误显示
// 尝试拦截 dev overlay（不同版本实现不同，尽量兜底）
try {
  if (process.env.NODE_ENV === 'development') {
    const anyWin: any = window as any;
    const originalCreateOverlay = anyWin.__webpack_dev_server_overlay_create__;
    if (originalCreateOverlay) {
      anyWin.__webpack_dev_server_overlay_create__ = (error: any) => {
        if (isROError(error?.message) || isROError(error)) return;
        return originalCreateOverlay(error);
      };
    }
    // 额外兜底：移除或隐藏 overlay 元素/iframe
    const hideOverlay = () => {
      const iframes = document.querySelectorAll('iframe#webpack-dev-server-client-overlay');
      iframes.forEach((f) => {
        try { (f as HTMLElement).style.display = 'none'; } catch {}
        try { (f as HTMLElement).remove(); } catch {}
      });
      const nodes = document.querySelectorAll('#webpack-dev-server-client-overlay, .webpack-dev-server-client-overlay, #react-error-overlay, #react-dev-overlay');
      nodes.forEach((n) => {
        try { (n as HTMLElement).style.display = 'none'; } catch {}
      });
    };
    hideOverlay();
    const mo = new MutationObserver(() => hideOverlay());
    try {
      mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
    } catch {}
  }
} catch {}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(<App />);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

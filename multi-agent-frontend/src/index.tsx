import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 完全抑制 ResizeObserver 错误的解决方案
const originalResizeObserver = window.ResizeObserver;
window.ResizeObserver = class extends originalResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    const wrappedCallback: ResizeObserverCallback = (entries, observer) => {
      try {
        callback(entries, observer);
      } catch (e: any) {
        // 静默忽略 ResizeObserver 相关错误
        if (e.message?.includes('ResizeObserver')) {
          return;
        }
        throw e;
      }
    };
    super(wrappedCallback);
  }
};

// 更强的错误处理
const resizeObserverErrorHandler = (e: ErrorEvent) => {
  if (e.message?.includes('ResizeObserver')) {
    e.preventDefault();
    e.stopImmediatePropagation();
    return false;
  }
};

// 监听所有类型的错误
window.addEventListener('error', resizeObserverErrorHandler, true);
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.message?.includes('ResizeObserver')) {
    e.preventDefault();
  }
});

// 重写 console.error
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args.length > 0 && typeof args[0] === 'string' && 
      (args[0].includes('ResizeObserver') || 
       args[0].includes('antd v5 support React is 16 ~ 18'))) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// 拦截 webpack-dev-server 的错误显示
if (process.env.NODE_ENV === 'development') {
  const originalCreateOverlay = (window as any).__webpack_dev_server_overlay_create__;
  if (originalCreateOverlay) {
    (window as any).__webpack_dev_server_overlay_create__ = (error: any) => {
      if (error?.message?.includes('ResizeObserver')) {
        return;
      }
      return originalCreateOverlay(error);
    };
  }
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(<App />);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

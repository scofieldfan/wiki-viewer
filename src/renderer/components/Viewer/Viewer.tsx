import { Component, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

class RenderErrorBoundary extends Component<
  { children: ReactNode; fallback?: (err: string) => ReactNode },
  { error: string | null }
> {
  constructor(props: RenderErrorBoundary['props']) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err: Error) {
    return { error: err.message };
  }
  componentDidCatch(err: Error) {
    console.error('[RenderErrorBoundary]', err);
  }
  render() {
    if (this.state.error) {
      return this.props.fallback ? (
        this.props.fallback(this.state.error)
      ) : (
        <pre className="text-red-400 text-xs p-4 whitespace-pre-wrap">
          渲染错误: {this.state.error}
        </pre>
      );
    }
    return this.props.children;
  }
}

interface Props {
  content: string;
  activePath: string;
  onNavigate: (path: string) => void;
  pinnedPath?: string;
}

function getExt(path: string) {
  return path.split('.').pop()?.toLowerCase() ?? '';
}

export default function Viewer({
  content,
  activePath,
  onNavigate,
  pinnedPath,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef<Map<string, number>>(new Map());
  const prevPathRef = useRef<string>('');
  const needsRestoreRef = useRef(false);

  // Save scroll position when leaving a page, reset to 0 immediately
  useEffect(() => {
    if (prevPathRef.current && scrollRef.current) {
      scrollPositions.current.set(
        prevPathRef.current,
        scrollRef.current.scrollTop,
      );
    }
    prevPathRef.current = activePath;
    needsRestoreRef.current = true;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [activePath]);

  // Restore saved scroll position once content has loaded
  useEffect(() => {
    if (needsRestoreRef.current && scrollRef.current && content) {
      const saved = scrollPositions.current.get(activePath) ?? 0;
      needsRestoreRef.current = false;
      // Wait for DOM to fully lay out (images, mermaid, etc.)
      // Double rAF + short timeout to let async rendering settle
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = saved;
          }, 50);
        });
      });
    }
  }, [content, activePath]);

  const showHome = pinnedPath && activePath !== pinnedPath;

  const goHome = useCallback(() => {
    if (pinnedPath) onNavigate(pinnedPath);
  }, [pinnedPath, onNavigate]);

  // Escape key to go back to index
  useEffect(() => {
    if (!showHome) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === 'Escape') {
        e.preventDefault();
        goHome();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showHome, goHome]);

  if (!activePath) {
    return (
      <div
        className="h-full w-full flex items-center justify-center text-sm"
        style={{ background: 'var(--bg-main)', color: 'var(--text-dim)' }}
      >
        <div className="text-center">
          <div className="text-4xl mb-3">📖</div>
          <div>从左侧选择文件开始阅读</div>
        </div>
      </div>
    );
  }

  const ext = getExt(activePath);

  if (ext === 'pdf') {
    const fileName = activePath.split('/').pop() ?? 'file.pdf';
    return (
      <div
        className="h-full w-full flex flex-col"
        style={{ background: 'var(--bg-main)' }}
      >
        <div className="flex-1 overflow-hidden">
          <iframe
            src={`wiki-file://local${activePath}`}
            className="w-full h-full border-0"
            title={fileName}
          />
        </div>
        {showHome && <FloatingHomeButton onClick={goHome} />}
      </div>
    );
  }

  if (activePath && !content) {
    return (
      <div
        className="h-full w-full flex items-center justify-center text-sm"
        style={{ background: 'var(--bg-main)', color: 'var(--text-dim)' }}
      >
        <div>加载中...</div>
      </div>
    );
  }

  if (ext === 'txt') {
    return (
      <div
        ref={scrollRef}
        className="h-full w-full overflow-y-auto"
        style={{ background: 'var(--bg-main)' }}
      >
        <div className="max-w-6xl mx-auto px-16 py-14">
          <pre
            className="whitespace-pre-wrap font-mono text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {content}
          </pre>
        </div>
        {showHome && <FloatingHomeButton onClick={goHome} />}
      </div>
    );
  }

  // Markdown
  return (
    <div
      ref={scrollRef}
      className="h-full w-full overflow-y-auto"
      style={{ background: 'var(--bg-main)' }}
    >
      <div className="max-w-6xl mx-auto px-16 py-14">
        <RenderErrorBoundary
          fallback={(err) => (
            <div>
              <p className="text-red-400 text-xs mb-4">渲染错误: {err}</p>
              <pre
                className="text-xs whitespace-pre-wrap font-mono"
                style={{ color: 'var(--text-muted)' }}
              >
                {content}
              </pre>
            </div>
          )}
        >
          <MarkdownRenderer
            content={content}
            filePath={activePath}
            onNavigate={onNavigate}
          />
        </RenderErrorBoundary>
      </div>
      {showHome && <FloatingHomeButton onClick={goHome} />}
    </div>
  );
}

function FloatingHomeButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="返回首页 (Esc)"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 50,
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: '1px solid var(--border)',
        background: hovered ? 'var(--bg-hover)' : 'var(--bg-sidebar)',
        color: hovered ? 'var(--text-active)' : 'var(--text-muted)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'background 0.15s, color 0.15s, transform 0.15s',
        transform: hovered ? 'scale(1.1)' : 'scale(1)',
      }}
    >
      ←
    </button>
  );
}

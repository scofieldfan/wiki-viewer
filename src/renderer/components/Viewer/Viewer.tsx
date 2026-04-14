import { Component, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import MarkdownRenderer from './MarkdownRenderer'

class RenderErrorBoundary extends Component<
  { children: ReactNode; fallback?: (err: string) => ReactNode },
  { error: string | null }
> {
  constructor(props: RenderErrorBoundary['props']) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(err: Error) {
    return { error: err.message }
  }
  componentDidCatch(err: Error) {
    console.error('[RenderErrorBoundary]', err)
  }
  render() {
    if (this.state.error) {
      return this.props.fallback
        ? this.props.fallback(this.state.error)
        : <pre className="text-red-400 text-xs p-4 whitespace-pre-wrap">渲染错误: {this.state.error}</pre>
    }
    return this.props.children
  }
}

interface Props {
  content: string
  activePath: string
  onNavigate: (path: string) => void
  pinnedPath?: string
}

function getExt(path: string) {
  return path.split('.').pop()?.toLowerCase() ?? ''
}

export default function Viewer({ content, activePath, onNavigate, pinnedPath }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [activePath])

  const showHome = pinnedPath && activePath !== pinnedPath

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
    )
  }

  const ext = getExt(activePath)

  if (ext === 'pdf') {
    const fileName = activePath.split('/').pop() ?? 'file.pdf'
    return (
      <div className="h-full w-full flex flex-col" style={{ background: 'var(--bg-main)' }}>
        {showHome && (
          <div className="flex-shrink-0 flex items-center px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <HomeButton onClick={() => onNavigate(pinnedPath!)} />
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <iframe
            src={`wiki-file://local${activePath}`}
            className="w-full h-full border-0"
            title={fileName}
          />
        </div>
      </div>
    )
  }

  if (activePath && !content) {
    return (
      <div
        className="h-full w-full flex items-center justify-center text-sm"
        style={{ background: 'var(--bg-main)', color: 'var(--text-dim)' }}
      >
        <div>加载中...</div>
      </div>
    )
  }

  if (ext === 'txt') {
    return (
      <div
        ref={scrollRef}
        className="h-full w-full overflow-y-auto"
        style={{ background: 'var(--bg-main)' }}
      >
        <div className="max-w-6xl mx-auto px-16 py-14">
          {showHome && <HomeButton onClick={() => onNavigate(pinnedPath!)} />}
          <pre
            className="whitespace-pre-wrap font-mono text-sm leading-relaxed mt-6"
            style={{ color: 'var(--text-secondary)' }}
          >
            {content}
          </pre>
        </div>
      </div>
    )
  }

  // Markdown
  return (
    <div
      ref={scrollRef}
      className="h-full w-full overflow-y-auto"
      style={{ background: 'var(--bg-main)' }}
    >
      <div className="max-w-6xl mx-auto px-16 py-14">
        {showHome && <HomeButton onClick={() => onNavigate(pinnedPath!)} />}
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
    </div>
  )
}

function HomeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm mb-6 transition-colors"
      style={{ color: 'var(--text-muted)' }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-active)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
    >
      <span>←</span>
      <span>Home</span>
    </button>
  )
}

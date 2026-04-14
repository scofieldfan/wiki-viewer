import { useState, useEffect, useCallback } from 'react'
import type { TreeNode } from '../shared/types'
import Sidebar from './components/Sidebar/Sidebar'
import Viewer from './components/Viewer/Viewer'

declare global {
  interface Window {
    wikiAPI: {
      buildTree: () => Promise<TreeNode[]>
      readFile: (filePath: string) => Promise<string>
      resolveImage: (markdownPath: string, imgSrc: string) => Promise<string>
      openExternal: (url: string) => Promise<void>
      getWikiRoot: () => Promise<string>
      selectFolder: () => Promise<string | null>
      onFolderSelected: (cb: (path: string) => void) => void
    }
  }
}

function findPinned(nodes: TreeNode[]): TreeNode | null {
  for (const node of nodes) {
    if (node.isPinned) return node
    if (node.type === 'dir' && node.children) {
      const found = findPinned(node.children)
      if (found) return found
    }
  }
  return null
}

type Theme = 'dark' | 'light'

const SIDEBAR_MIN = 160
const SIDEBAR_MAX = 500

export default function App() {
  const [tree, setTree] = useState<TreeNode[]>([])
  const [treeKey, setTreeKey] = useState(0)
  const [activePath, setActivePath] = useState<string>('')
  const [content, setContent] = useState<string>('')
  const [pinnedPath, setPinnedPath] = useState<string>('')

  const [wikiRoot, setWikiRoot] = useState<string>('')

  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme | null) ?? 'dark'
  )
  const [sidebarWidth, setSidebarWidth] = useState<number>(
    () => parseInt(localStorage.getItem('sidebarWidth') ?? '260', 10)
  )
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem('sidebarCollapsed') === 'true'
  )

  const toggleTheme = () =>
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', next)
      return next
    })

  const toggleSidebar = () =>
    setSidebarCollapsed((v) => {
      localStorage.setItem('sidebarCollapsed', String(!v))
      return !v
    })

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const startX = e.clientX
      const startWidth = sidebarWidth

      const clamp = (w: number) => Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, w))

      const onMove = (ev: MouseEvent) => setSidebarWidth(clamp(startWidth + ev.clientX - startX))
      const onUp = (ev: MouseEvent) => {
        const final = clamp(startWidth + ev.clientX - startX)
        setSidebarWidth(final)
        localStorage.setItem('sidebarWidth', String(final))
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [sidebarWidth]
  )

  const refresh = useCallback(() => {
    window.wikiAPI
      .buildTree()
      .then((t) => {
        setTree(t)
        setTreeKey((k) => k + 1)
        const pinned = findPinned(t)
        if (pinned && !activePath) {
          setPinnedPath(pinned.path)
          setActivePath(pinned.path)
        }
      })
      .catch((e: unknown) => console.error('buildTree failed:', e))
    if (activePath) {
      const ext = activePath.split('.').pop()?.toLowerCase() ?? ''
      if (ext !== 'pdf') {
        window.wikiAPI
          .readFile(activePath)
          .then(setContent)
          .catch((e: unknown) => { console.error('readFile failed:', e); setContent('') })
      }
    }
  }, [activePath])

  useEffect(() => {
    window.wikiAPI.getWikiRoot().then(setWikiRoot).catch(() => {})
    refresh()
  }, [])

  const applyFolder = useCallback((selected: string) => {
    setWikiRoot(selected)
    setActivePath('')
    setContent('')
    setPinnedPath('')
    window.wikiAPI.buildTree().then((t) => {
      setTree(t)
      setTreeKey((k) => k + 1)
      const pinned = findPinned(t)
      if (pinned) {
        setPinnedPath(pinned.path)
        setActivePath(pinned.path)
      }
    }).catch((e: unknown) => console.error('buildTree failed:', e))
  }, [])

  const handleSelectFolder = useCallback(async () => {
    const selected = await window.wikiAPI.selectFolder()
    if (!selected) return
    applyFolder(selected)
  }, [applyFolder])

  useEffect(() => {
    window.wikiAPI.onFolderSelected(applyFolder)
  }, [applyFolder])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'r') { e.preventDefault(); refresh() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [refresh])

  useEffect(() => {
    if (!activePath) return
    const ext = activePath.split('.').pop()?.toLowerCase() ?? ''
    if (ext === 'pdf') { setContent(''); return }
    window.wikiAPI
      .readFile(activePath)
      .then(setContent)
      .catch((e: unknown) => { console.error('readFile failed:', e); setContent('') })
  }, [activePath])

  return (
    <div
      data-theme={theme}
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: 'var(--bg-main)', color: 'var(--text-primary)' }}
    >
      {/* macOS titlebar */}
      <div
        className="drag-region flex-shrink-0 flex items-center"
        style={{
          height: 'var(--titlebar-height)',
          background: 'var(--bg-sidebar)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="no-drag" style={{ paddingLeft: 84 }}>
          <button
            onClick={toggleSidebar}
            title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
            className="w-7 h-7 flex items-center justify-center rounded text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            ☰
          </button>
        </div>

        <div className="drag-region flex-1 flex items-center justify-center">
          {wikiRoot && (
            <button
              onClick={handleSelectFolder}
              title="选择 Wiki 目录"
              className="no-drag flex items-center gap-1 px-2 rounded transition-colors"
              style={{
                fontSize: 12,
                color: 'var(--text-dim)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                maxWidth: 300,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 13 }}>📁</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {wikiRoot.split('/').pop() || wikiRoot}
              </span>
            </button>
          )}
        </div>

        <div className="no-drag flex items-center gap-1" style={{ paddingRight: 12 }}>
          <button
            onClick={refresh}
            title="刷新 (⌘R)"
            className="w-7 h-7 flex items-center justify-center rounded text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            ↺
          </button>
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? '切换到日间模式' : '切换到夜间模式'}
            className="w-7 h-7 flex items-center justify-center rounded text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {!sidebarCollapsed && (
          <Sidebar
            tree={tree}
            treeKey={treeKey}
            activePath={activePath}
            onSelect={setActivePath}
            width={sidebarWidth}
          />
        )}

        {!sidebarCollapsed && (
          <div
            onMouseDown={handleResizeMouseDown}
            className="flex-shrink-0 transition-colors"
            style={{
              width: 4,
              cursor: 'col-resize',
              background: 'var(--border)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#3b82f680')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--border)')}
          />
        )}

        <main className="flex-1 min-w-0 overflow-hidden">
          <Viewer
            content={content}
            activePath={activePath}
            onNavigate={setActivePath}
            pinnedPath={pinnedPath}
          />
        </main>
      </div>
    </div>
  )
}

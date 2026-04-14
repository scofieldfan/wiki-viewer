import { useState } from 'react'
import type { TreeNode } from '../../../shared/types'
import FileTree from './FileTree'

interface Props {
  node: TreeNode
  activePath: string
  onSelect: (path: string) => void
  depth: number
}

export default function FileNode({ node, activePath, onSelect, depth }: Props) {
  const [isOpen, setIsOpen] = useState(depth === 0 && node.priority === 'primary')
  const indent = depth * 12 + 20

  if (node.isPinned) return null

  const isSecondary = node.priority === 'secondary'

  if (node.type === 'dir') {
    return (
      <li>
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="w-full text-left flex items-center gap-1.5 py-1 pr-2 text-sm transition-colors"
          style={{
            paddingLeft: indent,
            color: isSecondary ? 'var(--text-dim)' : 'var(--text-muted)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span className="text-[10px] w-3 inline-block" style={{ color: 'var(--text-dim2)' }}>
            {isOpen ? '▾' : '▸'}
          </span>
          <span className="text-[13px]">📁</span>
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen && node.children && (
          <FileTree
            nodes={node.children}
            activePath={activePath}
            onSelect={onSelect}
            depth={depth + 1}
          />
        )}
      </li>
    )
  }

  const isActive = activePath === node.path
  const ext = node.name.split('.').pop() ?? ''
  const icon = ext === 'pdf' ? '📄' : '📝'

  return (
    <li style={{ position: 'relative' }}>
      {isActive && (
        <span style={{
          position: 'absolute',
          left: 0,
          top: '2px',
          bottom: '2px',
          width: 3,
          borderRadius: 2,
          background: '#3b82f6',
        }} />
      )}
      <button
        onClick={() => onSelect(node.path)}
        title={node.name}
        className="w-full text-left flex items-center gap-1.5 py-1 pr-2 text-sm transition-colors"
        style={{
          paddingLeft: indent + 16,
          background: isActive ? 'var(--bg-active)' : 'transparent',
          color: isActive
            ? 'var(--text-active)'
            : isSecondary
            ? 'var(--text-dim)'
            : 'var(--text-secondary)',
        }}
        onMouseEnter={e => {
          if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = isActive ? 'var(--bg-active)' : 'transparent'
        }}
      >
        <span className="text-[12px]">{icon}</span>
        <span className="truncate text-xs">{node.name}</span>
      </button>
    </li>
  )
}

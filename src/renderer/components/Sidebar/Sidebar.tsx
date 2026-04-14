import type { TreeNode } from '../../../shared/types'
import FileTree from './FileTree'

interface Props {
  tree: TreeNode[]
  treeKey: number
  activePath: string
  onSelect: (path: string) => void
  width: number
}

export default function Sidebar({ tree, treeKey, activePath, onSelect, width }: Props) {
  const findPinned = (nodes: TreeNode[]): TreeNode | null => {
    for (const node of nodes) {
      if (node.isPinned) return node
      if (node.type === 'dir' && node.children) {
        const found = findPinned(node.children)
        if (found) return found
      }
    }
    return null
  }

  const pinnedNode = findPinned(tree)

  return (
    <aside
      style={{
        width,
        minWidth: width,
        background: 'var(--bg-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Sidebar header */}
      <div
        style={{
          padding: '10px 0 10px 20px',
          flexShrink: 0,
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 14 }}>📚</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-dim)',
          }}
        >
          Wiki
        </span>
      </div>

      {/* Pinned: wiki/index.md */}
      {pinnedNode && (
        <div
          style={{
            flexShrink: 0,
            padding: '6px 8px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button
            onClick={() => onSelect(pinnedNode.path)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '5px 10px 5px 12px',
              borderRadius: 6,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: activePath === pinnedNode.path ? 'var(--bg-active-pin)' : 'transparent',
              color: activePath === pinnedNode.path ? 'var(--text-active)' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              if (activePath !== pinnedNode.path)
                e.currentTarget.style.background = 'var(--bg-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                activePath === pinnedNode.path ? 'var(--bg-active-pin)' : 'transparent'
            }}
          >
            <span style={{ fontSize: 14 }}>📌</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              index.md
            </span>
          </button>
        </div>
      )}

      {/* File tree */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 6, paddingBottom: 6 }}>
        <FileTree key={treeKey} nodes={tree} activePath={activePath} onSelect={onSelect} depth={0} />
      </div>
    </aside>
  )
}

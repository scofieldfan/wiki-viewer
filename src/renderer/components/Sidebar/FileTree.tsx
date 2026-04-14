import type { TreeNode } from '../../../shared/types'
import FileNode from './FileNode'

interface Props {
  nodes: TreeNode[]
  activePath: string
  onSelect: (path: string) => void
  depth: number
}

export default function FileTree({ nodes, activePath, onSelect, depth }: Props) {
  return (
    <ul className="list-none">
      {nodes.map((node) => (
        <FileNode
          key={node.path}
          node={node}
          activePath={activePath}
          onSelect={onSelect}
          depth={depth}
        />
      ))}
    </ul>
  )
}

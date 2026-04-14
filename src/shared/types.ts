export interface TreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: TreeNode[]
  isPinned?: boolean
  priority: 'primary' | 'secondary'
}

import { readdir, stat, readFile as readFileAsync, access, writeFile } from 'fs/promises'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join, resolve, dirname, relative } from 'path'
import { app } from 'electron'
import type { TreeNode } from '../shared/types'

const DEFAULT_WIKI_ROOT = '/Users/mi/work-work/my-wiki'
const MAX_DEPTH = 8
const SUPPORTED_EXTS = new Set(['.md', '.txt', '.pdf'])
const SECONDARY_DIRS = new Set(['raw', 'outputs', 'note'])
const IGNORED = new Set(['.git', '.obsidian', '.vscode', 'node_modules', '.DS_Store'])

function getConfigPath(): string {
  return join(app.getPath('userData'), 'wiki-viewer-config.json')
}

let _wikiRoot: string | null = null

export function getWikiRoot(): string {
  if (_wikiRoot !== null) return _wikiRoot
  const p = getConfigPath()
  if (existsSync(p)) {
    try {
      const cfg = JSON.parse(readFileSync(p, 'utf-8'))
      if (typeof cfg.wikiRoot === 'string') {
        _wikiRoot = cfg.wikiRoot
        return _wikiRoot!
      }
    } catch { /* ignore malformed config */ }
  }
  _wikiRoot = DEFAULT_WIKI_ROOT
  return _wikiRoot
}

export function setWikiRoot(path: string): void {
  _wikiRoot = path
  writeFileSync(getConfigPath(), JSON.stringify({ wikiRoot: path }, null, 2), 'utf-8')
}

function safePath(p: string): string {
  const abs = resolve(p)
  if (!abs.startsWith(getWikiRoot())) throw new Error(`Path outside wiki root: ${abs}`)
  return abs
}

async function buildNode(absPath: string, rootPath: string, depth: number): Promise<TreeNode | null> {
  const name = absPath.split('/').pop()!
  if (IGNORED.has(name)) return null

  let st
  try {
    st = await stat(absPath)
  } catch {
    return null
  }

  const rel = relative(rootPath, absPath)
  const topLevel = rel.split('/')[0]
  const priority: 'primary' | 'secondary' = SECONDARY_DIRS.has(topLevel) ? 'secondary' : 'primary'

  if (st.isDirectory()) {
    if (depth >= MAX_DEPTH) return null
    let entries: string[]
    try {
      entries = await readdir(absPath)
    } catch {
      return null
    }
    const childResults = await Promise.all(
      entries.map((entry) => buildNode(join(absPath, entry), rootPath, depth + 1))
    )
    const children = childResults.filter((c): c is TreeNode => c !== null)
    children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name, 'zh')
    })
    // Skip empty directories
    if (children.length === 0) return null
    return { name, path: absPath, type: 'dir', children, priority }
  } else {
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
    if (!SUPPORTED_EXTS.has(ext)) return null
    const isPinned = rel === 'wiki/index.md'
    return { name, path: absPath, type: 'file', priority, ...(isPinned ? { isPinned: true } : {}) }
  }
}

export async function buildFileTree(): Promise<TreeNode[]> {
  const root = getWikiRoot()
  let entries: string[]
  try {
    entries = await readdir(root)
  } catch (e) {
    console.error('[fileSystem] readdir failed for root:', root, e)
    return []
  }

  const nodeResults = await Promise.all(
    entries.map((entry) => buildNode(join(root, entry), root, 0))
  )
  const nodes = nodeResults.filter((n): n is TreeNode => n !== null)

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name, 'zh')
  })

  return nodes
}

export async function readFile(filePath: string): Promise<string> {
  const safe = safePath(filePath)
  return readFileAsync(safe, 'utf-8')
}

export function resolveImagePath(markdownFilePath: string, imgSrc: string): string {
  if (imgSrc.startsWith('/') || imgSrc.startsWith('http')) return imgSrc
  const markdownDir = dirname(safePath(markdownFilePath))
  return resolve(markdownDir, imgSrc)
}

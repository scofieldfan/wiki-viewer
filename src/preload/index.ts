import { contextBridge, ipcRenderer } from 'electron'
import type { TreeNode } from '../shared/types'

contextBridge.exposeInMainWorld('wikiAPI', {
  buildTree: (): Promise<TreeNode[]> => ipcRenderer.invoke('fs:buildTree'),
  readFile: (filePath: string): Promise<string> => ipcRenderer.invoke('fs:readFile', filePath),
  resolveImage: (markdownPath: string, imgSrc: string): Promise<string> =>
    ipcRenderer.invoke('fs:resolveImage', markdownPath, imgSrc),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),
  getWikiRoot: (): Promise<string> => ipcRenderer.invoke('fs:getWikiRoot'),
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectFolder'),
  onFolderSelected: (cb: (path: string) => void) => {
    ipcRenderer.on('folder-selected', (_event, path: string) => cb(path))
  },
})

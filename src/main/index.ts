import { app, BrowserWindow, ipcMain, shell, protocol, net, dialog, Menu } from 'electron'
import { join } from 'path'
import { buildFileTree, readFile, resolveImagePath, getWikiRoot, setWikiRoot } from './fileSystem'

// Register wiki-file:// scheme BEFORE app ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'wiki-file',
    privileges: { secure: true, standard: true, stream: true, bypassCSP: true }
  }
])

async function openFolderDialog(): Promise<string | null> {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  if (!win) return null
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    title: '选择 Wiki 目录',
    buttonLabel: '选择目录',
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const selected = result.filePaths[0]
  setWikiRoot(selected)
  return selected
}

function buildAppMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Folder…',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const selected = await openFolderDialog()
            if (selected) {
              const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
              win?.webContents.send('folder-selected', selected)
            }
          },
        },
        { type: 'separator' },
        { role: process.platform === 'darwin' ? 'close' : 'quit' },
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win.show())

  // Cmd+Option+I / Ctrl+Shift+I opens DevTools
  win.webContents.on('before-input-event', (_event, input) => {
    const devToolsShortcut =
      (process.platform === 'darwin' && input.meta && input.alt && input.key === 'i') ||
      (process.platform !== 'darwin' && input.control && input.shift && input.key === 'I')
    if (devToolsShortcut) win.webContents.openDevTools()
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.on('ready', () => {
  buildAppMenu()

  // wiki root is lazily loaded from config by fileSystem.ts on first access
  // Serve local files via wiki-file:// to avoid file:// permission issues
  protocol.handle('wiki-file', (request) => {
    const url = new URL(request.url)
    const filePath = decodeURIComponent(url.pathname)
    return net.fetch(`file://${filePath}`)
  })

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// IPC handlers
ipcMain.handle('fs:buildTree', async () => {
  try {
    const tree = await buildFileTree()
    console.log('[main] buildTree ok, root entries:', tree.length)
    return tree
  } catch (e) {
    console.error('[main] buildTree error:', e)
    throw e
  }
})

ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
  try {
    const content = await readFile(filePath)
    console.log('[main] readFile ok:', filePath.split('/').pop(), content.length, 'chars')
    return content
  } catch (e) {
    console.error('[main] readFile error:', filePath, e)
    throw e
  }
})

ipcMain.handle('fs:resolveImage', (_event, markdownPath: string, imgSrc: string) =>
  resolveImagePath(markdownPath, imgSrc)
)

ipcMain.handle('shell:openExternal', (_event, url: string) => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    shell.openExternal(url)
  } else if (url.startsWith('/')) {
    // Local file path — open with system default app
    shell.openPath(url)
  }
})

ipcMain.handle('fs:getWikiRoot', () => getWikiRoot())

ipcMain.handle('dialog:selectFolder', () => openFolderDialog())

const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API到渲染进程
contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        invoke: (channel, data) => ipcRenderer.invoke(channel, data)
    },
    // 显示文件选择对话框
    showOpenDialog: (options) => ipcRenderer.invoke('showOpenDialog', options),
    
    // 显示文件保存对话框
    showSaveDialog: (options) => ipcRenderer.invoke('showSaveDialog', options),
    
    // 读取文件内容
    readFile: (filePath) => ipcRenderer.invoke('readFile', filePath),
    
    // 写入文件内容
    writeFile: (filePath, content) => ipcRenderer.invoke('writeFile', filePath, content)
}); 
const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API到渲染进程
contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        invoke: (channel, data) => ipcRenderer.invoke(channel, data)
    }
}); 
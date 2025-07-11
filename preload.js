const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  processCommand: async (command, modifier, filename) => {
    return await ipcRenderer.invoke('process-command', command, modifier, filename);
  }
});
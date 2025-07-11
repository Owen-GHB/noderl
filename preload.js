const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  processCommand: (command, modifier, filename) =>
    ipcRenderer.invoke('process-command', command, modifier, filename),
});

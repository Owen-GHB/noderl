const { contextBridge } = require('electron');
const { processCommand } = require('./interface.js');

// Expose a secure API to the renderer process
contextBridge.exposeInMainWorld('api', {
  processCommand: (command, modifier, filename) => {
    try {
      const result = processCommand(command, modifier, filename);
      return result;
    } catch (err) {
      return { error: 'Unhandled error in processCommand', details: err.message };
    }
  }
});

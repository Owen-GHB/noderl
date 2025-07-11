const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { processCommand } = require('./engine/interface.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('ui/index.html');

  // Open DevTools, optional
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('process-command', async (event, command, modifier, filename) => {
  const originalCwd = process.cwd();
  const engineDir = path.join(__dirname, 'engine');

  try {
    process.chdir(engineDir);
    // console.log(`Changed CWD to: ${process.cwd()} for command: ${command}`);
    const result = processCommand(command, modifier, filename);
    // console.log(`Result from processCommand:`, result);
    return result;
  } catch (error) {
    console.error('Error executing processCommand in main process:', error);
    return { error: 'Failed to execute command in main process', details: error.message, status: 500 };
  } finally {
    process.chdir(originalCwd);
    // console.log(`Restored CWD to: ${process.cwd()}`);
  }
});

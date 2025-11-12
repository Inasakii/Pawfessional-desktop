const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Disable GPU acceleration globally
app.disableHardwareAcceleration();

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 600,
        icon: path.join(__dirname, './assets/images/desktop-logo.png'),
        webPreferences: {
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false,
        }
    });

    // Remove the default application menu
    Menu.setApplicationMenu(null);

    // Corrected the path to load login.html from within the src directory
    win.loadFile(path.join(__dirname, '../src/html/login.html'));
    
    // Listen for keyboard shortcuts
    win.webContents.on('before-input-event', (event, input) => {
        // F5 or Ctrl+R to reload the window
        if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
            win.reload();
            event.preventDefault();
        }

        // // F12 to toggle DevTools
        // if (input.key === 'F12' && input.type === 'keyDown') {
        //     if (win.webContents.isDevToolsOpened()) {
        //         win.webContents.closeDevTools();
        //     } else {
        //         win.webContents.openDevTools();
        //     }
        //     event.preventDefault();
        // }
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
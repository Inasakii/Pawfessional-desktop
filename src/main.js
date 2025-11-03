const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Disable GPU acceleration globally
app.disableHardwareAcceleration();

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 600,
        webPreferences: {
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false,
        }
    });

    // Remove the default application menu
    Menu.setApplicationMenu(null);

    // Corrected the path to load login.html from within the src directory
    win.loadFile(path.join(__dirname, 'html/login.html'));
    
    // para sa devtools
    // win.webContents.openDevTools();
    // Listen for F12 to toggle DevTools manually
    // win.webContents.on('before-input-event', (event, input) => {
    //     if (input.key === 'F12' && input.type === 'keyDown') {
    //         if (win.webContents.isDevToolsOpened()) {
    //             win.webContents.closeDevTools();
    //         } else {
    //             win.webContents.openDevTools();
    //         }
    //     }
    // });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

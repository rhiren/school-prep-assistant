const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    autoHideMenuBar: true,
    backgroundColor: "#ffffff",
    title: "Math Practice",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      contextIsolation: true,
    },
  });

  win.webContents.setZoomFactor(1);
  win.webContents.setVisualZoomLevelLimits(1, 1);
  win.webContents.on('will-navigate', (e) => e.preventDefault());

  win.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(() => {
  // Intercept file:// requests to map /content to actual folder
  protocol.interceptFileProtocol('file', (request, callback) => {
    try {
      const requestUrl = new URL(request.url);
      const decodedPath = decodeURIComponent(requestUrl.pathname);
      const normalizedPath =
        process.platform === 'win32' && decodedPath.startsWith('/')
          ? decodedPath.slice(1)
          : decodedPath;
      const contentSegment = `${path.sep}content${path.sep}`;

      if (normalizedPath.includes(contentSegment)) {
        const relativePath = normalizedPath.split(contentSegment)[1];
        callback({ path: path.join(__dirname, '../content', relativePath) });
        return;
      }

      callback({ path: normalizedPath });
    } catch {
      const fallbackPath = decodeURIComponent(request.url.replace('file://', ''));
      callback({ path: fallbackPath });
    }
  });

  createWindow();
});

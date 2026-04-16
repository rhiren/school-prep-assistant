const { app, BrowserWindow, protocol } = require('electron');
const fs = require('fs');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
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
  win.once('ready-to-show', () => {
    win.setFullScreen(true);
  });

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
      const repoBaseSegment = `${path.sep}math-prep-assistant${path.sep}`;
      const contentSegment = `${path.sep}content${path.sep}`;

      if (normalizedPath.includes(repoBaseSegment)) {
        const relativePath = normalizedPath.split(repoBaseSegment)[1];
        const mappedPath = relativePath.startsWith(`content${path.sep}`)
          ? path.join(__dirname, '../public', relativePath)
          : path.join(__dirname, '../dist', relativePath);
        callback({ path: mappedPath });
        return;
      }

      if (normalizedPath.includes(contentSegment)) {
        const relativePath = normalizedPath.split(contentSegment)[1];
        const publicContentPath = path.join(__dirname, '../public/content', relativePath);
        callback({ path: fs.existsSync(publicContentPath) ? publicContentPath : normalizedPath });
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

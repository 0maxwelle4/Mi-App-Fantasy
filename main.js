const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url'); // Añadimos este módulo nativo de Node

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,  // 🔒 RECOMENDACIÓN: Fíjalo en false en producción por seguridad
      contextIsolation: true,  // 🔒 Fíjalo en true en producción si no usas librerías nativas de Node en el frontend
      webSecurity: false       // 🛠️ EL SECRETO: Sigue desactivando la seguridad web para saltar CORS en las APIs reales
    }
  });

  // CONTROL DE ENTORNO: Desarrollo vs Producción
  // Si ejecutas con una variable de entorno de desarrollo apuntará a localhost, si no, cargará el archivo físico
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    // 📦 PRODUCCIÓN: Carga el index.html que genera el comando 'ng build'
    // IMPORTANTE: Asegúrate de comprobar el nombre exacto de la carpeta de salida dentro de 'dist/'
    mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, 'dist', 'mi-app-fantasy', 'browser', 'index.html'),
      protocol: 'file:',
      slashes: true
    }));

    //mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

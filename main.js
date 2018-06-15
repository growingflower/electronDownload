const {app, BrowserWindow} = require('electron');
const path = require('path');
const glob = require('glob');

class DemoDownload {
    constructor () {
      this.mainWindow = null
    }

    init(){
      this.loadmainJs();
      this.initApp();
    }

    createWindow(){
      let windowOpts = {
        width : 800,
        height :600
      };
      this.mainWindow = new BrowserWindow(windowOpts);
      let url = path.join('file://', __dirname, '/clientDownloadnew/index.html');
      this.mainWindow.loadURL(url);
      this.mainWindow.on('closed',() => {
        this.mainWindow = null;
      });
    }

    initApp(){
      app.on('ready',() => {
        this.createWindow();
      });
      app.on('window-all-closed',() =>{
        if (process.platform !== 'darwin') {
          app.quit()
        }
      });
      app.on('activate', () => {
        if (this.mainWindow === null) {
         this. createWindow()
        }
      })
    }

    loadmainJs(){
      const otherMainJs = path.join(__dirname, 'mainProcess/**/*.js');
      const files = glob.sync(otherMainJs);
      files.forEach((file) => { require(file) })
    }
}

new DemoDownload().init();
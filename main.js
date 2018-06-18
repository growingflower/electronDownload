const {app, BrowserWindow,ipcMain,shell} = require('electron');
const path = require('path');
const glob = require('glob');

class DemoDownload {
    constructor () {
      this.mainWindow = null
    }

    init(){
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
      this.initReceiveInfo(this.mainWindow);
      this.listenToDownload(this.mainWindow);
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

    initReceiveInfo(win){
      ipcMain.on('startdownload',(event, arg) => {
        try{
          win.webContents.downloadURL("file:///Users/wuqian/Desktop/electronDownload/clientDownloadnew/index.html")
        }catch(err){
          console.log(err)
        }
      })
    }

    listenToDownload(win){
      try{
        win.webContents.session.on('will-download', (event, item, webContents) => {
          try{
            let filesize = item.getTotalBytes();
            let startTime = item.getStartTime();
            let downloadedSize = item.getReceivedBytes();
            let filename = item.getFilename();
            let fileUrl = item.getURL();
            let flieInfos = [];
            flieInfos.push(filesize,startTime,downloadedSize,filename,fileUrl);
            let flieString = flieInfos.join("+");
            webContents.send('downloading',flieString)
            ipcMain.on('cancelDownload',(event,arg)=>{
              item.cancel()
            })
            ipcMain.on('continueDownload',(event,arg)=>{
              item.resume()
            })
            ipcMain.on('pauseDownload',(event,arg)=>{
              item.pause()
            })
            item.on('done',(event, state)=>{
              if (state === 'completed') {
                console.log('Download successfully')
                webContents.send('completed',state)
                ipcMain.on('openDir',(event,arg)=>{
                  console.log("eee",fileUrl)
                  shell.showItemInFolder(fileUrl)
                })
              } else {
                console.log(`Download failed: ${state}`)
              }
            })
            item.on('updated',(event, state)=>{
              if (item.isPaused()) {  
                console.log('Download is paused')  
              }
            })
          }catch(err){
            console.log(err)
          }
         
        })
      }catch(err){
        console.log(err)
      }
      
    }
}

new DemoDownload().init();
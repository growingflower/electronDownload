const {app, BrowserWindow,ipcMain,shell} = require('electron');
const path = require('path');
const glob = require('glob');
const LokiDB = require('lokijs');
const db = new LokiDB();
const itemsCollection = db.addCollection('itemsCollection');

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
          win.webContents.downloadURL("http://dldir1.qq.com/qqfile/QQforMac/QQ_V6.4.0.dmg")
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
            let startTime = item.getStartTime().toString();
            let filename = item.getFilename();
            let fileUrl = item.getURL();
            let flieInfos = [];
            flieInfos.push(filesize,startTime,filename,fileUrl);
            let flieString = flieInfos.join("+");
            //savedownloaditems
            itemsCollection.insert({name:filename,startTime:startTime, downloaditem: item,webContents:webContents});
            let downloaditem = itemsCollection.find({'startTime':startTime})[0].downloaditem;
            // item.setSavePath('/Users/mingdao/Downloads/'+filename);
            item.setSavePath('/Users/wuqian/Downloads/'+filename);
            webContents.send('downloading',flieString)
            ipcMain.on('downloadingInfo',(event,arg) => {
              let fileInfos = arg.split("+");
              let [filesize,startTimeBack,downloadedSize,filename,fileUrl] = fileInfos
              let downloaditeminfo = itemsCollection.find({'startTime':startTimeBack})
              let webContents = itemsCollection.find({'startTime':startTimeBack})[0].webContents
              this.listenToOneItem(downloaditeminfo,webContents)
            })
          }catch(err){
            console.log(err)
          }
         
        })
      }catch(err){
        console.log(err)
      }
    }

    listenToOneItem(downloaditeminfo,webContents){
      let downloaditem = downloaditeminfo[0].downloaditem;
      // let fileurl = '/Users/mingdao/Downloads/' + downloaditeminfo[0].name;
      let fileurl = app.getPath('downloads') + downloaditeminfo[0].name;
      ipcMain.on('cancelDownload',(event,arg)=>{
        downloaditem.cancel()
      });

      ipcMain.on('continueDownload',(event,arg)=>{
        console.log(222) 
        console.log(downloaditem.isDestroyed(),'22222')
        downloaditem.resume()
      });

      ipcMain.on('pauseDownload',(event,arg)=>{
        downloaditem.pause()
      });

      downloaditem.on('done',(event, state)=>{
        if (state === 'completed') {
          console.log('Download successfully')
          webContents.send('completed',state)
          ipcMain.on('openDir',(event,arg)=>{
            shell.showItemInFolder(fileurl)
          })
        }else if(state === 'cancelled'){
          webContents.send('interrupted')
          console.log(`Download failed: ${state}`)
        } else {
          webContents.send('interrupted')
          console.log(`Download failed: ${state}`)
        }
      });

      downloaditem.on('updated',(event, state)=>{
        if (state === 'interrupted') {
          console.log('Download is interrupted but can be resumed')
        } else if (state === 'progressing') {
          if (downloaditem.isPaused()) {
            console.log('isPaused')
            webContents.send('isPaused')
          } else {
            console.log(`Received bytes: ${downloaditem.getReceivedBytes()}`)
            let receivedBytes = downloaditem.getReceivedBytes()
            webContents.send('receivedBytes',receivedBytes)
          }
        }
      }) ;
    }
}

new DemoDownload().init();
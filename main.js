const {app, BrowserWindow,ipcMain,shell,dialog} = require('electron');
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
          // "https://dldir1.qq.com/qqfile/QQIntl/QQi_PC/QQIntl2.11.exe"
          // "http://dldir1.qq.com/qqfile/QQforMac/QQ_V6.4.0.dmg"  testurl
          win.webContents.downloadURL("https://docs.qq.com/?adtag=QQxiazaiyeanniu#id-home-download")
        }catch(err){
          console.log(err)
        }
      })
    }

    listenToDownload(win){
        win.webContents.session.on('will-download', (event, item, webContents) => {
            if(null === item || null ===webContents){
              event.preventDefault()
              let opts = {type:'warning',message:"wrong downloadUrl"}
              dialog.showMessageBox(win,opts)
              return
            }
            let filesize = item.getTotalBytes();
            let startTime = item.getStartTime();
            let filename = item.getFilename();
            let fileUrl = item.getURL();
            let receivedBytes = item.getReceivedBytes();
            let getETag = item.getETag();
            
            let flieInfos = [];
            flieInfos.push(filesize,startTime,filename,fileUrl);
            let flieString = flieInfos.join("+");
            //savedownloaditems
            let itembeginning = itemsCollection.insert({itemid:startTime.toString(),downloaditem:item})
            // itemsCollection.insert({name:filename,startTime:startTime, downloaditem: item,webContents:webContents});
            // let downloaditem = itemsCollection.find({'startTime':startTime})[0].downloaditem;
            item.setSavePath('/Users/mingdao/Downloads/'+filename);
            // item.setSavePath('/Users/wuqian/Downloads/'+filename);
            webContents.send('downloading',flieString)
            // ipcMain.on('downloadingInfo',(event,arg) => {
            //   let fileInfos = arg.split("+");
            //   let [filesize,startTimeBack,downloadedSize,filename,fileUrl] = fileInfos
            //   let downloaditeminfo = itemsCollection.find({'startTime':startTimeBack})
            //   let webContents = itemsCollection.find({'startTime':startTimeBack})[0].webContents
            //   this.listenToOneItem(downloaditeminfo,webContents,win)
            // })
            this.listenToOneItem(item,webContents,itembeginning,win)
        })
    }

    listenToOneItem(downloaditem,webContents,itembeginning,win){
      // let downloaditem = downloaditeminfo[0].downloaditem;
      // let fileurl = '/Users/mingdao/Downloads/' + downloaditeminfo[0].name;
      let fileurl = app.getPath('downloads')+'/' + downloaditem.getFilename();
      console.log(fileurl,"mainfileurl")
      ipcMain.on('cancelDownload',(event,arg)=>{
        downloaditem.cancel()
      });

      ipcMain.on('continueDownload',(event,arg)=>{
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
            console.log("mianopenDir")
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
        if(downloaditem.isDestroyed()){
          event.preventDefault()
          let opts = {type:'warning',message:" download failed"}
          dialog.showMessageBox(win,opts)
        }
        if (state === 'interrupted') {
          console.log('Download is interrupted but can be resumed')
        } else if (state === 'progressing') {
          if (downloaditem.isPaused()) {
            console.log('isPaused')
            webContents.send('isPaused')
          } else {
            console.log(`LastModifiedTime: ${downloaditem.getLastModifiedTime()}`)
            console.log(`getTag: ${downloaditem.getETag()}`)
            console.log(`Received bytes: ${downloaditem.getReceivedBytes()}`)
            itembeginning.downloaditem = downloaditem;
            let receivedBytes = downloaditem.getReceivedBytes();
            let startTime = downloaditem.getStartTime();
            let completedbytes = 0
            completedbytes += receivedBytes;
            let speed = completedbytes/(Number(new Date().getTime()/1000) - Number(startTime))
            itemsCollection.update(itembeginning)
            webContents.send('receivedBytes',receivedBytes,speed,completedbytes)
          }
        }
      }) ;
    }
}

new DemoDownload().init();
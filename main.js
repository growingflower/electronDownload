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
          win.webContents.downloadURL(arg)
        }catch(err){
          console.log(err)
        }
      })
    }

    getDowanloadInfos(downloadItem){
      let startTime = downloadItem.getStartTime();
      let Etag = downloadItem.getETag();
      let lastModifiedTime = downloadItem.getLastModifiedTime();
      let URLChain = downloadItem.getURLChain();
      let state = downloadItem.getState();
      let contentDisposition = downloadItem.getContentDisposition();
      let receivedBytes = downloadItem.getReceivedBytes();
      let totalBytes = downloadItem.getTotalBytes();
      let filename = downloadItem.getFilename();
      let mimeType = downloadItem.getMimeType();
      let url = downloadItem.getURL(); 
      return {
        startTime:startTime,
        Etag:Etag,
        lastModifiedTime:lastModifiedTime,
        URLChain:URLChain,
        state:state,
        contentDisposition:contentDisposition,
        receivedBytes:receivedBytes,
        totalBytes:totalBytes,
        filename:filename,
        mimeType:mimeType,
        url:url
      }
    }

    restoreDownload(){
      
    }

    listenToDownload(win){
        win.webContents.session.on('will-download', (event, item, webContents) => {
            if(null === item || null ===webContents){
              event.preventDefault()
              let opts = {type:'warning',message:"wrong downloadUrl"}
              dialog.showMessageBox(win,opts)
              return
            }
            let downloadItemInfos =  this.getDowanloadInfos(item)
            let startTime = downloadItemInfos.startTime*1000000;
            let filename = downloadItemInfos.filename;
            //savedownloaditems
            let itembeginning = itemsCollection.insert({itemid:startTime,downloaditem:item})
            // itemsCollection.insert({name:filename,startTime:startTime, downloaditem: item,webContents:webContents});
            // let downloaditem = itemsCollection.find({'startTime':startTime})[0].downloaditem;
            item.setSavePath('/Users/mingdao/Downloads/'+filename);
            // item.setSavePath('/Users/wuqian/Downloads/'+filename);
            webContents.send('downloading',downloadItemInfos)
            // ipcMain.on('downloadingInfo',(event,arg) => {
            //   let fileInfos = arg.split("+");
            //   let [filesize,startTimeBack,downloadedSize,filename,fileUrl] = fileInfos
            //   let downloaditeminfo = itemsCollection.find({'startTime':startTimeBack})
            //   let webContents = itemsCollection.find({'startTime':startTimeBack})[0].webContents
            //   this.listenToOneItem(downloaditeminfo,webContents,win)
            // })
            this.listenToOneItem(item,startTime,webContents,itembeginning,win)
        })
    }

    listenToOneItem(downloaditem,startTime,webContents,itembeginning,win){
      // let downloaditem = downloaditeminfo[0].downloaditem;
      // let fileurl = '/Users/mingdao/Downloads/' + downloaditeminfo[0].name;
      let fileurl = app.getPath('downloads')+'/' + downloaditem.getFilename();
      ipcMain.on('cancelDownload',(event,arg)=>{
        if(downloaditem.isDestroyed()){
          console.log("destroy")
        }
        if(startTime == arg){
          downloaditem.cancel()
        }
      });

      ipcMain.on('continueDownload',(event,arg)=>{
        if(startTime == arg){
          downloaditem.resume()
        }
      });

      ipcMain.on('pauseDownload',(event,arg)=>{
        if(startTime == arg){
          downloaditem.pause()
        }
      });

      downloaditem.on('done',(event, state)=>{
        let downloadingInfos = this.getDowanloadInfos(downloaditem)
        if (state === 'completed') {
          console.log('Download successfully')
          webContents.send('completed',downloadingInfos)
          ipcMain.on('openDir',(event,arg)=>{
            console.log("mianopenDir")
            shell.showItemInFolder(fileurl)
            ipcMain.removeAllListeners(['pauseDownload','continueDownload','cancelDownload'])
          })
        }else if(state === 'cancelled'){
          webContents.send('cancelled',downloadingInfos)
          console.log(`Download failed: ${state}`)
          ipcMain.removeAllListeners(['pauseDownload','continueDownload','cancelDownload'])

        } else {
          webContents.send('cancelled',downloadingInfos)
          console.log(`Download failed: ${state}`)
          ipcMain.removeAllListeners(['pauseDownload','continueDownload','cancelDownload'])
        }
      });

      downloaditem.on('updated',(event, state)=>{
        if(downloaditem.isDestroyed()){
          event.preventDefault()
          let opts = {type:'warning',message:" download failed"}
          dialog.showMessageBox(win,opts)
        }
        let downloadingInfos = this.getDowanloadInfos(downloaditem)
        if (state === 'interrupted') {
          console.log('Download is interrupted but can be resumed')
        } else if (state === 'progressing') {
          if (downloaditem.isPaused()) {
            console.log('isPaused')
            let hasDownloadedBytes = 0
            hasDownloadedBytes += downloadingInfos.receivedBytes;
            downloadingInfos.hasDownloadedBytes = hasDownloadedBytes;
            webContents.send('isPaused',downloadingInfos)
          } else {
            console.log(`Received bytes: ${downloaditem.getReceivedBytes()}`)
            itembeginning.downloaditem = downloaditem;
            let receivedBytes = downloaditem.getReceivedBytes();
            let startTime = downloaditem.getStartTime();
            let filesize = downloaditem.getTotalBytes();
            let filename = downloaditem.getFilename();
            let fileUrl = downloaditem.getURL(); 
            // console.log(`StartTime: ${downloaditem.getStartTime()}`)
            let hasDownloadedBytes = 0
            hasDownloadedBytes += receivedBytes;
            let speed = hasDownloadedBytes/(Number(new Date().getTime()/1000) - Number(startTime))
            itemsCollection.update(itembeginning)
            webContents.send('receivedBytes',receivedBytes,speed,hasDownloadedBytes,startTime,fileUrl,filename,filesize)
          }
        }
      }) ;
    }
}




new DemoDownload().init();
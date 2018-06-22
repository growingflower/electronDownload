const {app, BrowserWindow,ipcMain,shell,dialog} = require('electron');
const _ = require('lodash');
const path = require('path');
const glob = require('glob');
const LokiDB = require('lokijs');
const db = new LokiDB('download',{
  autoload:true,
  autoloadCallback:databaseInitialize
});
function databaseInitialize() {
  var entries = db.getCollection("download");
  if (entries === null) {
    entries = db.addCollection("download");
  }
  runProgramLogic()
}
function runProgramLogic() {
  itemsCollection = db.getCollection('download')
  console.log(db,"3333")
}
console.log(db,"wwwwww")
class DemoDownload {
    constructor () {
      this.mainWindow = null;
      this.activeDownloadItems = null;
      this.progressDownloadItems = null;
      this.tempDownloadItems = new Set();

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
        let allDownloadItemsInfos = itemsCollection.find({});
        console.log("allDownloadItemsInfos",allDownloadItemsInfos)
        this.createWindow();
      });
      app.on('window-all-closed',() =>{
        if (process.platform !== 'darwin') {
          app.quit()
        }
        if(this.activeDownloadItems){
          app.setBadgeCount(this.activeDownloadItems());
        }
      });
      app.on('activate', () => {
        if (this.mainWindow === null) {
          
         this. createWindow()
        }
        if(this.activeDownloadItems){
          let allDownloadItemsInfos = itemsCollection.find({});
          console.log("allDownloadItemsInfos",allDownloadItemsInfos)
          this.mainWindow.webContents.send('reloadActiveDownloadItems',allDownloadItemsInfos)
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
      ses.createInterruptedDownload(options)
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
          this.tempDownloadItems.add(item)
          this.activeDownloadItems = () => this.tempDownloadItems.size;
          //savedownloaditems
          let itembeginning = itemsCollection.insert({itemid:startTime,downloaditem:item})
          db.save()
          item.setSavePath('/Users/mingdao/Downloads/'+filename);
          // item.setSavePath('/Users/wuqian/Downloads/'+filename);
          let fileurl = app.getPath('downloads')+'/' + item.getFilename();
          webContents.send('downloading',downloadItemInfos)
          this.listenToOneItem(item,startTime,fileurl,webContents,itembeginning,win)
      })
    }

    listenToOneItem(downloaditem,startTime,fileurl,webContents,itembeginning,win){
      let selectedwin = BrowserWindow.fromWebContents(webContents)
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
        this.tempDownloadItems.delete(downloaditem);
        if (!webContents.isDestroyed() && !this.activeDownloadItems()) {
          selectedwin.setProgressBar(-1);
        }
        let downloadingInfos = this.getDowanloadInfos(downloaditem)
        if (state === 'completed') {
          console.log('Download successfully')
          webContents.send('completed',downloadingInfos)
          if (process.platform === 'darwin') {
            app.dock.downloadFinished(fileurl);
          }
          ipcMain.on('openDir',(event,arg)=>{
            console.log("mianopenDir")
            shell.showItemInFolder(fileurl)
            ipcMain.removeAllListeners(['pauseDownload','continueDownload','cancelDownload'])
          })
        }else if(state === 'cancelled'){
          if(!webContents.isDestroyed()){
            webContents.send('cancelled',downloadingInfos)
            console.log(`Download failed: ${state}`)
          }
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
            // console.log(`StartTime: ${downloaditem.getStartTime()}`)
            console.log(`Received bytes: ${downloaditem.getReceivedBytes()}`)
            itembeginning.downloaditem = downloaditem;
            let receivedBytes = downloaditem.getReceivedBytes();
            let startTime = downloaditem.getStartTime();
            let filesize = downloaditem.getTotalBytes();
            let filename = downloaditem.getFilename();
            let fileUrl = downloaditem.getURL(); 
            let hasDownloadedBytes = 0
            hasDownloadedBytes += receivedBytes;
            let speed = hasDownloadedBytes/(Number(new Date().getTime()/1000) - Number(startTime))
            itemsCollection.update(itembeginning)
            db.save()
            if(!webContents.isDestroyed()){
              let progressDownloadItems = () => hasDownloadedBytes/filesize
              selectedwin.setProgressBar(progressDownloadItems())
              webContents.send('receivedBytes',receivedBytes,speed,hasDownloadedBytes,startTime,fileUrl,filename,filesize)
            }
          }
        }
      }) ;
    }

   
}




new DemoDownload().init();
const {app, BrowserWindow,ipcMain,shell,dialog} = require('electron');
const _ = require('lodash');
const path = require('path');
const glob = require('glob');
const LokiDB = require('lokijs');
// const db = new LokiDB('download',{
//   autoload:true,
//   autoloadCallback:databaseInitialize
// });
// function databaseInitialize(){
//   let entries = db.getCollection("download");
//   if (entries === null) {
//     entries = db.addCollection("download");
//   }
// }

class DemoDownload {
    constructor () {
      this.mainWindow = null;
      this.activeDownloadItems = null;
      this.progressDownloadItems = null;
      this.tempDownloadItems = new Set();
      this.db = null;
      this.itemsCollection = null;
      this.initApp()
      this.reload = null
    }
    databaseInitialize(db){
      let entries = db.getCollection("download");
      if (entries === null) {
        entries = db.addCollection("download");
      }
      return entries
    }
    createWindow(arg){
      let windowOpts = {
        width : 800,
        height :600,
        show:false
      };
      this.mainWindow = new BrowserWindow(windowOpts);
      let url = path.join('file://', __dirname, '/clientDownloadnew/index.html');
      this.mainWindow.loadURL(url);
      this.mainWindow.on('closed',() => {
        console.log(ipcMain.listenerCount('reload'),'before')
        ipcMain.removeAllListeners('removedowanload') 
        ipcMain.removeAllListeners('cancelinterrupted') 
        ipcMain.removeAllListeners('reload') 
        ipcMain.removeAllListeners('openDir') 
        ipcMain.removeAllListeners('startdownload') 
        ipcMain.removeAllListeners('pauseDownload') 
        ipcMain.removeAllListeners('continueDownload')
        ipcMain.removeAllListeners('cancelDownload') 
        console.log(ipcMain.listenerCount('reload'),'after')
        this.mainWindow = null;
        // ipcMain.removeAllListeners()
      });
      this.initReceiveInfo(this.mainWindow);
      if(!arg){
        this.listenToDownload(this.mainWindow);
      }
      
        this.mainWindow.once('ready-to-show', () => {
        // if(!arg){
        let allDownloadItemsInfos = this.itemsCollection.find({})
        this.mainWindow.webContents.send('initAlldownloaditems',allDownloadItemsInfos)
        this.mainWindow.show()
        // if(!arg){
        //     let allDownloadItemsInfos = this.itemsCollection.find({});
        //     this.mainWindow.webContents.send('initAlldownloaditems',allDownloadItemsInfos)
        //     this.mainWindow.show()
      
        // }else{
        //     let allDownloadItemsInfos = this.itemsCollection.find({})
        //     this.mainWindow.webContents.send('reloadActiveDownloadItems',allDownloadItemsInfos)
        //     this.mainWindow.show()
        // }
      })
    }

    initApp(){
      app.on('ready',() => {
        console.log('ready')
        this.db = new LokiDB('download',{
          autoload:true,
        });
        this.db.addListener('loaded',event => {
          this.itemsCollection = this.databaseInitialize(this.db)
          this.createWindow()
        })
      });
      app.on('window-all-closed',() =>{
        if (process.platform !== 'darwin') {
          app.quit()
        }
        // if(this.activeDownloadItems){
        //   app.setBadgeCount(this.activeDownloadItems());
        // }
      });
      app.on('activate', () => {
        console.log('activate')
        if (this.mainWindow === null) {
          console.log('activatenull')
          this.createWindow(true)
        }
        // console.log(this.activeDownloadItems(),22222)
        // console.log(this.mainWindow,33333)
        // if(this.mainWindow === null && this.activeDownloadItems()>0){
        //   console.log("activeactiveactiveactive")
        //   this. createWindow("active")
        //   // let allDownloadItemsInfos = this.itemsCollection.find({});
        //   // this.mainWindow.webContents.send('reloadActiveDownloadItems',allDownloadItemsInfos)
        // }
      })
    }

    initReceiveInfo(win){
      ipcMain.on('removedowanload',(event,id)=>{
        
        this.itemsCollection.chain().find({itemid:id}).remove()
        this.db.save()
      })

      ipcMain.on('cancelinterrupted',(event,id)=>{
        var cancelinterruptedupdate = function(obj){
          obj.state = 'isCancelled';
          return obj
        }
        this.itemsCollection.findAndUpdate({itemid:id},cancelinterruptedupdate)
        this.db.save()
      })
      ipcMain.on('reload',(event,id)=>{
        let interruptedItemsInfos = this.itemsCollection.find({itemid:id})
        let downloaditem = interruptedItemsInfos[0].downloaditem
        let opts = {
          path : downloaditem.url,
          urlChain : downloaditem.URLChain,
          mimeType :downloaditem.mimeType,
          offset : downloaditem.offset,
          length : downloaditem.totalBytes,
          lastModified : downloaditem.lastModifiedTime,
          eTag : downloaditem.Etag,
          startTime : downloaditem.startTime
        }
        this.restoreDownload(win,opts)
      });
      ipcMain.on('openDir',(event,arg,filename)=>{
        let fileurl = app.getPath('downloads')+'/' + filename;
        shell.showItemInFolder(fileurl)
       
      })
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
        url:url,
        offset:null
      }
    }
    restoreDownload(win,options){
      console.log("i am reload")
      console.log("options",options)
      this.mainWindow.webContents.session.createInterruptedDownload(options)
    }
    listenToDownload(win){
      win.webContents.session.on('will-download', (event, item, webContents) => {
          console.log(item.getState(),"44444")
          if(item.getTotalBytes() === 0 ){
            event.preventDefault()
            let opts = {type:'warning',message:"wrong downloadUrl"}
            dialog.showMessageBox(win,opts)
            return
          }
          var webContents = this.mainWindow.webContents;
          var itembeginning
          if(item.getState() === 'interrupted'){
            console.log(item.getState(),"beginreload")
            item.resume()
            console.log(item.getState(),"resumebeginreload")
            var reloadFlag = true
            let start = item.getStartTime()*1000000
            var hasdownload = this.itemsCollection.find({itemid:start})[0].downloaditem.offset
            var startTime = this.itemsCollection.find({itemid:start})[0].downloaditem.startTime*1000000
            var interrupteStartTime = new Date().getTime()/1000
            var filename = item.getFilename();
            var downloadItemInfos = this.getDowanloadInfos(item)
          }else{
            console.log(item.getState(),"begin")
            var downloadItemInfos =  this.getDowanloadInfos(item)
            var startTime = (downloadItemInfos.startTime*1000000);
            var filename = downloadItemInfos.filename;
            var state = downloadItemInfos.state
            this.tempDownloadItems.add(downloadItemInfos)
            this.activeDownloadItems = () => this.tempDownloadItems.size;
            //savedownloaditems
            itembeginning = this.itemsCollection.insert({itemid:startTime,state:state,downloaditem:downloadItemInfos})
            this.db.save()
          }
          // item.setSavePath('/Users/mingdao/Downloads/'+filename);
          let fileurl = app.getPath('downloads')+'/' + filename;
          item.setSavePath(fileurl);
          webContents.send('downloading',downloadItemInfos,reloadFlag)
          
          this.listenToOneItem(item,startTime,fileurl,webContents,itembeginning,win,interrupteStartTime,hasdownload)
      })
    }

    listenToOneItem(downloaditem,startTime,fileurl,webContents,itembeginning,win,interrupteStartTime,hasdownload){
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
        console.log(arg,"continueDownloadid")
        if(startTime == arg){
          downloaditem.resume()
        }
       
      });
      ipcMain.on('pauseDownload',(event,arg)=>{
        if(startTime == arg){
          downloaditem.pause()
        }
      }); 
      app.on('will-quit',()=>{
        if(!downloaditem.isDestroyed()){
          downloaditem.pause()
        }
      })
      app.on('window-all-closed',() =>{
        if (process.platform !== 'darwin') {
          app.quit()
        }
        if(!downloaditem.isDestroyed()){
          
          downloaditem.pause()
        }
      });
      downloaditem.on('done',(event, state)=>{
        let downloadItemInfos =  this.getDowanloadInfos(downloaditem)
        this.tempDownloadItems.delete(downloadItemInfos);
        if(webContents.isDestroyed()){
          return event.preventDefault();
        }
        // if (!webContents.isDestroyed() && !this.activeDownloadItems()) {
        //   selectedwin.setProgressBar(-1);
        // }
        console.log('done')
        let downloadingInfos = this.getDowanloadInfos(downloaditem)
        if (state === 'completed') {
          console.log('Download successfully')
          if(!itembeginning){
            var time_completed = downloaditem.getStartTime()*1000000;
            var cancelupdate = function(obj){
              obj.state = 'isCompleted';
              return obj
            }
            this.itemsCollection.findAndUpdate({itemid:time_completed},cancelupdate)
            this.db.save()
            webContents.send('completed',downloadingInfos)
            return
          }
          itembeginning.state = 'isCompleted';
          this.itemsCollection.update(itembeginning)
          this.db.save()
          webContents.send('completed',downloadingInfos)

          if (process.platform === 'darwin') {
            app.dock.downloadFinished(fileurl);
          }
          
        }else if(state === 'cancelled'){
          if(itembeginning){
            itembeginning.state = 'isCancelled';
            this.itemsCollection.update(itembeginning)
            this.db.save()
          }else{
            var time_cancel = downloaditem.getStartTime()*1000000;
            var cancelupdate = function(obj){
              obj.state = 'isCancelled';
              return obj
            }
            this.itemsCollection.findAndUpdate({itemid:time_cancel},cancelupdate)
            this.db.save()
          }
          if(!webContents.isDestroyed()){
            webContents.send('cancelled',downloadingInfos)
            console.log(`Download failed: ${state}`)
          }
          ipcMain.removeAllListeners(['pauseDownload','continueDownload','cancelDownload'])

        } else {
          itembeginning.state = 'isCancelled';
          this.itemsCollection.update(itembeginning)
          this.db.save()
          webContents.send('cancelled',downloadingInfos)
          console.log(`Download failed: ${state}`)
          ipcMain.removeAllListeners(['pauseDownload','continueDownload','cancelDownload'])
        }
      });
      downloaditem.on('updated',(event, state)=>{
        console.log(downloaditem.getState(),"iam in updated")
        if(downloaditem.isDestroyed()){
          event.preventDefault()
          let opts = {type:'warning',message:" download failed"}
          dialog.showMessageBox(win,opts)
        }
        let downloadingInfos = this.getDowanloadInfos(downloaditem)
        if(webContents.isDestroyed()||!this.mainWindow){
          event.preventDefault()
          return
        }
        if (state === 'interrupted') {
          downloaditem.resume()
          console.log('Download is interrupted but can be resumed')
        } else if (state === 'progressing') {
          if (downloaditem.isPaused()) {
            if(!itembeginning){
              let saves = this.getDowanloadInfos(downloaditem)
              var time = saves.startTime*1000000;
              var startTime = saves.startTime;
              var filesize = saves.totalBytes;
              var filename = saves.filename;
              var fileUrl = saves.url; 
              var receivedBytes = saves.receivedBytes;
              var hasDownloadedBytes = saves.offset;
              hasDownloadedBytes += receivedBytes;
              saves.offset = (saves.Etag != "" ? hasDownloadedBytes : 0);
              var pasueupdate = function(obj){
                obj.state = 'interrupted';
                obj.downloaditem = saves 
                return obj
              }
              this.itemsCollection.findAndUpdate({itemid:time},pasueupdate)
              this.db.save()
              return
            }
            var hasDownloadedBytes = 0
            hasDownloadedBytes += downloadingInfos.receivedBytes;
            downloadingInfos.hasDownloadedBytes = hasDownloadedBytes;
            itembeginning.state = 'interrupted';
            itembeginning.downloaditem.offset = itembeginning.Etag != ""? hasDownloadedBytes : 0;
            this.mainWindow.webContents.send('isPaused',downloadingInfos)
            this.itemsCollection.update(itembeginning)
            this.db.save()
          } else {
            // console.log(`StartTime: ${downloaditem.getStartTime()}`)
            let saves = this.getDowanloadInfos(downloaditem)
            let speed ;
            let receivedBytes;
            let filesize;
            let filename;
            let fileUrl;
            let hasDownloadedBytes
            if(itembeginning){
              console.log(`Received bytes: ${downloaditem.getReceivedBytes()}`)
              itembeginning.downloaditem = saves;
              receivedBytes = saves.receivedBytes;
              startTime = saves.startTime;
              filesize = saves.totalBytes;
              filename = saves.filename;
              fileUrl = saves.url; 
              hasDownloadedBytes = 0
              hasDownloadedBytes += receivedBytes;
              itembeginning.downloaditem.offset = itembeginning.Etag != ""? hasDownloadedBytes : 0;
              itembeginning.state = 'isProgressing'
              speed = hasDownloadedBytes/(Number(new Date().getTime()/1000) - Number(startTime))
              this.itemsCollection.update(itembeginning)
              this.db.save()
            }else{
              console.log(`reload Received bytes: ${downloaditem.getReceivedBytes()}`)
              // console.log(`reload id: ${downloaditem.getStartTime()}`)
              time = saves.startTime*1000000;
              startTime = saves.startTime;
              filesize = saves.totalBytes;
              filename = saves.filename;
              fileUrl = saves.url; 
              receivedBytes = saves.receivedBytes;
              hasDownloadedBytes = hasdownload;
              var nowDowaload = 0;
              nowDowaload += receivedBytes;
              hasDownloadedBytes += receivedBytes;
              saves.offset = saves.Etag != ""? hasDownloadedBytes : 0;
              speed = nowDowaload/(Number(new Date().getTime()/1000) - Number(interrupteStartTime))
              var update = function (obj){
                  obj.state = 'isProgressing';
                  obj.downloaditem = saves 
                  return obj
                }
              console.log(hasDownloadedBytes,"3333333333")
              this.itemsCollection.findAndUpdate({itemid:time},update)
              this.db.save()
            }

           
            
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



new DemoDownload()
// new DemoDownload().init();
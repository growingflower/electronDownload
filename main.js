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
    }
    databaseInitialize(db){
      let entries = db.getCollection("download");
      if (entries === null) {
        entries = db.addCollection("download");
      }
      return entries
    }
    createWindow(){
      let windowOpts = {
        width : 800,
        height :600,
        show:false
      };
      this.mainWindow = new BrowserWindow(windowOpts);
      let url = path.join('file://', __dirname, '/clientDownloadnew/index.html');
      this.mainWindow.loadURL(url);
      this.mainWindow.on('closed',() => {
        this.mainWindow = null;
      });
      this.initReceiveInfo(this.mainWindow);
      this.listenToDownload(this.mainWindow);
      this.mainWindow.once('ready-to-show', () => {
        // let interruptedItemsInfos = this.itemsCollection.find({state:"isPaused"});
        // console.log(interruptedItemsInfos.length,"interruptedItemsInfos.length")
        // if(interruptedItemsInfos.length > 0){
        //   for(let i = 0;i< interruptedItemsInfos.length ; i++){
        //     let downloaditem = interruptedItemsInfos[i].downloaditem
        //     let opts = {
        //       path : downloaditem.url,
        //       urlChain : downloaditem.URLChain,
        //       mimeType :downloaditem.mimeType,
        //       offset : downloaditem.offset,
        //       length : downloaditem.totalBytes,
        //       lastModified : downloaditem.lastModifiedTime,
        //       eTag : downloaditem.Etag,
        //       startTime : downloaditem.startTime
        //     }
        //     this.restoreDownload(this.mainWindow,opts)
        //   }
        // }
        let allDownloadItemsInfos = this.itemsCollection.find({})
        this.mainWindow.webContents.send('initAlldownloaditems',allDownloadItemsInfos)
        if(this.activeDownloadItems){
          //  this.tempDownloadItems.forEach((element)=>{
          //     console.log(element.startTime,"element.startTimeelement.startTime")
          //     this.mainWindow.webContents.send('downloading',null,element.startTime)
          //  })
         
        }
        this.mainWindow.show()
      })
    }

    initApp(){
      app.on('ready',() => {
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
        if (this.mainWindow === null) {
          this. createWindow()
        }
        // if(this.mainWindow === null && this.activeDownloadItems){
        //   this. createWindow()
        //   let allDownloadItemsInfos = this.itemsCollection.find({});
        //   this.mainWindow.webContents.send('reloadActiveDownloadItems',allDownloadItemsInfos)
        // }
      })
    }

    initReceiveInfo(win){
      ipcMain.on('cancelinterrupted',(event,id)=>{
        console.log(id,"id")
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
      win.webContents.session.createInterruptedDownload(options)
    }

    listenToDownload(win){
      win.webContents.session.on('will-download', (event, item, webContents ) => {
          var webContents = win.webContents;
          if(null === item || null === webContents){
            event.preventDefault()
            let opts = {type:'warning',message:"wrong downloadUrl"}
            dialog.showMessageBox(win,opts)
            return
          }
          var itembeginning
          if(item.getState() === 'interrupted'){
            item.resume()
            let start = item.getStartTime()*1000000
            var hasdownload = this.itemsCollection.find({itemid:start})[0].downloaditem.offset
            var startTime = this.itemsCollection.find({itemid:start})[0].downloaditem.startTime*1000000
            var interrupteStartTime = new Date().getTime()/1000
            var downloadItemInfos = this.getDowanloadInfos(item)
          }else{
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
          webContents.send('downloading',downloadItemInfos,startTime)
          
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
        console.log(arg,"id")
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
      
      downloaditem.on('done',(event, state)=>{
        let downloadItemInfos =  this.getDowanloadInfos(downloaditem)
        this.tempDownloadItems.delete(downloadItemInfos);
        if(webContents.isDestroyed()){
          return event.preventDefault();
        }

        // if (!webContents.isDestroyed() && !this.activeDownloadItems()) {
        //   selectedwin.setProgressBar(-1);
        // }
        let downloadingInfos = this.getDowanloadInfos(downloaditem)
        if (state === 'completed') {
          console.log('Download successfully')
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
        if(downloaditem.isDestroyed()){
          event.preventDefault()
          let opts = {type:'warning',message:" download failed"}
          dialog.showMessageBox(win,opts)
        }
        let downloadingInfos = this.getDowanloadInfos(downloaditem)
        if(webContents.isDestroyed()){
          event.preventDefault()
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
              saves.offset = hasDownloadedBytes;
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
            itembeginning.downloaditem.offset = hasDownloadedBytes;
            this.mainWindow.webContents.send('isPaused',downloadingInfos)
            this.itemsCollection.update(itembeginning)
            this.db.save()
          } else {
            console.log(`StartTime: ${downloaditem.getStartTime()}`)
            let saves = this.getDowanloadInfos(downloaditem)
            let speed ;
            let receivedBytes;
            let filesize;
            let filename;
            let fileUrl;
            let hasDownloadedBytes
            if(itembeginning){
              // console.log(`Received bytes: ${downloaditem.getReceivedBytes()}`)
              itembeginning.downloaditem = saves;
              receivedBytes = saves.receivedBytes;
              startTime = saves.startTime;
              filesize = saves.totalBytes;
              filename = saves.filename;
              fileUrl = saves.url; 
              hasDownloadedBytes = 0
              hasDownloadedBytes += receivedBytes;
              itembeginning.downloaditem.offset = hasDownloadedBytes;
              itembeginning.state = 'isProgressing'
              speed = hasDownloadedBytes/(Number(new Date().getTime()/1000) - Number(startTime))
              this.itemsCollection.update(itembeginning)
              this.db.save()
            }else{
              console.log(`reload Received bytes: ${downloaditem.getReceivedBytes()}`)
              console.log(`reload id: ${downloaditem.getStartTime()}`)
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
              saves.offset = hasDownloadedBytes;
              speed = nowDowaload/(Number(new Date().getTime()/1000) - Number(interrupteStartTime))
              var update = function (obj){
                  obj.state = 'isProgressing';
                  obj.downloaditem = saves 
                  return obj
                }
                
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
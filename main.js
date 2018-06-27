const {app, BrowserWindow,ipcMain,shell,dialog,Menu} = require('electron');
const _ = require('lodash');
const path = require('path');
const glob = require('glob');
const LokiDB = require('lokijs');
const menuTemplate = require('./mainProcess/download/menutemplate.js')

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
      console.log(this.mainWindow.webContents.session.getMaxListeners(),'MAX')
      this.mainWindow.on('closed',() => {
        ipcMain.removeAllListeners('removedowanload') 
        ipcMain.removeAllListeners('cancelinterrupted') 
        ipcMain.removeAllListeners('reload') 
        ipcMain.removeAllListeners('openDir') 
        ipcMain.removeAllListeners('startdownload') 
        ipcMain.removeAllListeners('pauseDownload') 
        ipcMain.removeAllListeners('continueDownload')
        ipcMain.removeAllListeners('cancelDownload') 
        this.mainWindow = null;
      });
      this.initReceiveInfo(this.mainWindow);
      if(!arg){
        this.listenToDownload(this.mainWindow);
      }
        this.mainWindow.once('ready-to-show', () => {
        let allDownloadItemsInfos = this.itemsCollection.find({})
        this.mainWindow.webContents.send('initAlldownloaditems',allDownloadItemsInfos)
        this.mainWindow.show()
      })
    }

    initApp(){
      app.on('ready',() => {
        this.addReloadEvent()
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
       
      });
      app.on('activate', () => {
        if (this.mainWindow === null) {
          console.log('activatenull')
          this.createWindow(true)
        }
      })
    }

    initReceiveInfo(win){
      if(!this.activeDownloadItems){
        win.webContents.on('dom-ready',()=>{
          let allDownloadItemsInfos = this.itemsCollection.find({})
          this.mainWindow.webContents.send('initAlldownloaditems',allDownloadItemsInfos)
        })
      }
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
          if(item.getTotalBytes() === 0 ){
            event.preventDefault()
            let opts = {type:'warning',message:"wrong downloadUrl"}
            dialog.showMessageBox(win,opts)
            return
          }
          var webContents = this.mainWindow.webContents;
          var itembeginning
          if(item.getState() === 'interrupted'){
            console.log('startstartrload:',item.getStartTime())
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
            console.log('startstartbegin:',item.getStartTime())
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
          let fileurl = app.getPath('downloads')+'/' + filename;
          item.setSavePath(fileurl);
          webContents.send('downloading',downloadItemInfos,reloadFlag)
          
          this.listenToOneItem(item,startTime,fileurl,webContents,itembeginning,win,interrupteStartTime,hasdownload)
      })
    }
    

    listenToOneItem(downloaditem,startTime,fileurl,webContents,itembeginning,win,interrupteStartTime,hasdownload){
      let selectedwin = BrowserWindow.fromWebContents(webContents)
      ipcMain.on('cancelDownload',(event,arg)=>{
        if(!downloaditem.isDestroyed()){
          if(startTime == arg){
            downloaditem.cancel()
          }
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

        } else {
          itembeginning.state = 'isCancelled';
          this.itemsCollection.update(itembeginning)
          this.db.save()
          webContents.send('cancelled',downloadingInfos)
          console.log(`Download failed: ${state}`)
          
        }
      });
      downloaditem.on('updated',(event, state)=>{
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
            itembeginning.downloaditem.offset = (itembeginning.downloaditem.Etag !="" ? hasDownloadedBytes : 0);
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
              itembeginning.downloaditem.offset = (itembeginning.downloaditem.Etag != ""? hasDownloadedBytes : 0);
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
              this.itemsCollection.findAndUpdate({itemid:time},update)
              this.db.save()
            }
            if(!webContents.isDestroyed()){
              // let progressDownloadItems = () => hasDownloadedBytes/filesize
              // selectedwin.setProgressBar(progressDownloadItems())
              webContents.send('receivedBytes',receivedBytes,speed,hasDownloadedBytes,startTime,fileUrl,filename,filesize)
            }
          }
        }
      });
    }

    addReloadEvent(){
      
    }
   
}



new DemoDownload()
// new DemoDownload().init();
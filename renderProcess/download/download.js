const {ipcRenderer} = nodeRequire('electron');

class DownloadBlock {
    constructor(){
    }
    initBlock(){
        this.sendDownloadMS();
       
    }
    sendDownloadMS(){
        let downloadBtn = document.getElementById('downloadButton')
        let downloadUrlinput = document.getElementById('downloadUrl')
        downloadBtn.addEventListener('click',(event)=>{
            let url = downloadUrlinput.value;
            if(url){
                ipcRenderer.send('startdownload',url)
                this.listenDownloading();
            }else{
                return
            }
        })
    }

    listenDownloading(){
        ipcRenderer.on("downloading",(event, arg)=>{
            ipcRenderer.send('downloadingInfo',arg)
            let fileInfos = arg.split("+")
            let [filesize,startTime,filename,fileUrl] = fileInfos
            let fileValue = {
                'name': filename,
                'url': fileUrl,
                'status': 1,
                'downloaded': 1000000,
                'total': filesize,
                'speed': 1000,
                'id': Array.apply(null, new Array(5)).
                    map(a => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)).
                    join('-')
                };
            addFile(fileValue)
            ipcRenderer.on('receivedBytes',(event,arg)=>{
                fileValue.downloaded = Number(arg);
                updateFile(fileValue.id, Object.assign({}, fileValue, {
                        status: fileValue.downloaded === fileValue.total ? STATUS.completed : STATUS.progressing
                      }));
                let cancelBtn = document.getElementsByClassName('cancel');
                let continueBtn = document.getElementsByClassName('continue');
                let pauseBtn = document.getElementsByClassName('pause');
                this.addClassEvent(cancelBtn,'cancelDownload',fileValue);   
                this.addClassEvent(continueBtn,'continueDownload',fileValue);   
                this.addClassEvent(pauseBtn,'pauseDownload',fileValue);   
                
            })
            ipcRenderer.on('isPaused',(event,arg)=>{
                // updateFile(fileValue.id, Object.assign({}, fileValue, {
                //     status:STATUS.paused
                //   }));
            })
            
            // let data = [
            //       {
            //         name: filename,
            //         url: fileUrl,
            //         status: 1,
            //         downloaded: 0,
            //         total: filesize,
            //         speed: 1000
            //       }].map(function (v) {
            //             return Object.assign({}, v, {
            //             id: Array.apply(null, new Array(5)).
            //                 map(a => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)).
            //                 join('-')
            //             });
            //         });
            // render(data);
            // let cancelBtn = document.getElementsByClassName('cancel');
            // let continueBtn = document.getElementsByClassName('continue');
            // let pauseBtn = document.getElementsByClassName('pause');
            // this.addClassEvent(cancelBtn,'cancelDownload',fileValue);   
            // this.addClassEvent(continueBtn,'continueDownload',fileValue);   
            // this.addClassEvent(pauseBtn,'pauseDownload',fileValue);   
            ipcRenderer.on('completed',(event,arg)=>{
                updateFile(fileValue.id, Object.assign({}, fileValue, {
                        status:  STATUS.completed
                      }));                
                // let data = [
                //     {
                //       name: filename,
                //       url: fileUrl,
                //       status: 3,
                //       downloaded: downloadedSize,
                //       total: filesize,
                //       speed: 1000
                //     }].map(function (v) {
                //           return Object.assign({}, v, {
                //           id: Array.apply(null, new Array(5)).
                //               map(a => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)).
                //               join('-')
                //           });
                //       });
            //   render(data)  
              let popenDirBtn = document.getElementsByClassName('openDir');
              this.addClassEvent(popenDirBtn,'openDir')
            })   
            ipcRenderer.on('interrupted',(event,arg)=>{
                updateFile(fileValue.id, Object.assign({}, fileValue, {
                    status:  STATUS.error
                  }));      
            }) 
            let retryBtn = document.getElementsByClassName('retry');
            this.addClassEvent(retryBtn,'retryDownload',fileValue);  
           
        })
        
    }

    addClassEvent(elements,type,fileValue){
        switch(type){
            case "openDir":
                $('.body .con').on('click', '.fileItem .openDir', function (e) {
                    var name = $('.openDir').parents('.fileItem').find('.data').data('item').name;
                    ipcRenderer.send('openDir');
                });
                break;
            case "cancelDownload":
                $('.body .con').on('click', '.fileItem .cancel', function (item) {
                    var value = $('.cancel').parents('.fileItem').find('.data').data('item');
                    updateFile(value.id, Object.assign({}, value, {
                    status: STATUS.cancaled
                    }));
                    ipcRenderer.send('cancelDownload');
                    console.log('取消 id.', value.id, ' ' + value.name);
                });
          
                break;
            case "continueDownload":
                $('.body .con').on('click', '.fileItem .continue', function (e) {
                    var value = $('.continue').parents('.fileItem').find('.data').data('item');
                    updateFile(value.id, Object.assign({}, value, {
                    status: STATUS.progressing
                    }));
                    ipcRenderer.send('continueDownload');
                });
                break;
            case "pauseDownload":
                $('.body .con').on('click', '.fileItem .pause', function (e) {
                    var value = $('.pause').parents('.fileItem').find('.data').data('item');
                    updateFile(value.id, Object.assign({}, value, {
                      status: STATUS.paused
                    }));
                    ipcRenderer.send('pauseDownload',value.url);
                });
                break;
            case "retryDownload":
                console.log(2222)
                $('.body .con').on('click', '.fileItem .retry', function (e) {
                    var value = $('.retry').parents('.fileItem').find('.data').data('item');
                    console.log(value,"value")
                    updateFile(value.id, Object.assign({}, value, {
                      status: STATUS.progressing
                    }));
                    ipcRenderer.send('startdownload',url)
                });
                break;
            default:
                console.log('err')
        }
       
    }
}
new DownloadBlock().initBlock()
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
            let url = $.trim(downloadUrlinput.value);
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
            // ipcRenderer.send('downloadingInfo',arg)
            let fileInfos = arg.split("+")
            let [filesize,startTime,filename,fileUrl] = fileInfos
            let fileValue = {
                'name': filename,
                'url': fileUrl,
                'status': 1,
                'downloaded': 0,
                'total': filesize,
                'speed': 0,
                'id': Array.apply(null, new Array(5)).
                    map(a => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)).
                    join('-')
                };
            addFile(fileValue)
            ipcRenderer.on('receivedBytes',(event,arg,speed,completedbytes)=>{
                fileValue.downloaded = Number(arg);
                updateFile(fileValue.id, Object.assign({}, fileValue, {
                        downloaded:completedbytes,
                        speed:speed,
                        status: fileValue.downloaded === fileValue.total ? STATUS.completed : STATUS.progressing
                      }));
                this.addClassEvent('cancelDownload',fileValue);   
                this.addClassEvent('continueDownload',fileValue);   
                this.addClassEvent('pauseDownload',fileValue);   
                
            })
            ipcRenderer.on('isPaused',(event,arg)=>{
                // updateFile(fileValue.id, Object.assign({}, fileValue, {
                //     status:STATUS.paused
                //   }));
            })
            ipcRenderer.on('completed',(event,arg)=>{
                updateFile(fileValue.id, Object.assign({}, fileValue, {
                        status:  STATUS.completed
                      }));                
              this.addClassEvent('openDir',fileValue)
            })   
            ipcRenderer.on('interrupted',(event,arg)=>{
                updateFile(fileValue.id, Object.assign({}, fileValue, {
                    status:  STATUS.error
                  }));      
            }) 
            let retryBtn = document.getElementsByClassName('retry');
            this.addClassEvent('retryDownload',fileValue);  
           
        })
        
    }

    addClassEvent(type,fileValue){
        let id = fileValue.id;
        switch(type){
            case "openDir":
                $("#"+id).on('click','.openDir',function(e){
                    console.log('openDir')
                    let value = $('.openDir').parents('.fileItem').find('.data').data('item').name;
                    ipcRenderer.send('openDir');
                })
                // $('.body .con').on('click', '.fileItem .openDir', function (e) {
                //     var name = $('.openDir').parents('.fileItem').find('.data').data('item').name;
                //     ipcRenderer.send('openDir');
                // });
                break;
            case "cancelDownload":
                $("#"+id).on('click','.cancel',function(e){
                    console.log('cancel')
                    let value = $('.cancel').parents('.fileItem').find('.data').data('item');
                    updateFile(id, Object.assign({}, value, {
                            status: STATUS.cancel
                    }));
                    ipcRenderer.send('cancelDownload');
                })
                // $('.body .con').on('click', '.fileItem .cancel', function (item) {
                //     var value = $('.cancel').parents('.fileItem').find('.data').data('item');
                //     updateFile(value.id, Object.assign({}, value, {
                //     status: STATUS.cancaled
                //     }));
                //     ipcRenderer.send('cancelDownload');
                //     console.log('取消 id.', value.id, ' ' + value.name);
                // });
          
                break;
            case "continueDownload":
                $("#"+id).on('click','.continue',function(e){
                    console.log('continue')
                    let value = $('.continue').parents('.fileItem').find('.data').data('item');
                    updateFile(id, Object.assign({}, value, {
                            status: STATUS.cancel
                    }));
                    ipcRenderer.send('continueDownload');
                })
                // $('.body .con').on('click', '.fileItem .continue', function (e) {
                //     var value = $('.continue').parents('.fileItem').find('.data').data('item');
                //     updateFile(value.id, Object.assign({}, value, {
                //     status: STATUS.progressing
                //     }));
                //     ipcRenderer.send('continueDownload');
                // });
                break;
            case "pauseDownload":
                $("#"+id).on('click','.pause',function(e){
                    console.log('pause')
                    let count = 0;
                    count++
                    console.log(count)
                    let value = $('.pause').parents('.fileItem').find('.data').data('item');
                    updateFile(id, Object.assign({}, value, {
                                status: STATUS.paused
                    }));
                    ipcRenderer.send('pauseDownload');
                })
                // $('.body .con').on('click', '.fileItem .pause', function (e) {
                //     var value = $('.pause').parents('.fileItem').find('.data').data('item');
                //     updateFile(value.id, Object.assign({}, value, {
                //       status: STATUS.paused
                //     }));
                //     ipcRenderer.send('pauseDownload',value.url);
                // });
                break;
            case "retryDownload":
                $("#"+id).on('click','.retry',function(e){
                    console.log('retry')
                    let value = $('.retry').parents('.fileItem').find('.data').data('item');
                    updateFile(id, Object.assign({}, value, {
                            status: STATUS.paused
                    }));
                    ipcRenderer.send('startdownload',url)
                })

                // $('.body .con').on('click', '.fileItem .retry', function (e) {
                //     var value = $('.retry').parents('.fileItem').find('.data').data('item');
                //     console.log(value,"value")
                //     updateFile(value.id, Object.assign({}, value, {
                //       status: STATUS.progressing
                //     }));
                //     ipcRenderer.send('startdownload',url)
                // });
                break;
            default:
                console.log('err')
        }
       
    }
}
new DownloadBlock().initBlock()
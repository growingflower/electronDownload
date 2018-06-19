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
           
        })
        
    }

    addClassEvent(elements,type,fileValue){
        switch(type){
            case "openDir":
                $.each(elements,function(idx,element){
                    element.addEventListener('click',()=>{
                        console.log(111)
                        ipcRenderer.send('openDir');
                    }) 
                })
                break;
            case "cancelDownload":
                $.each(elements,function(idx,element){
                    element.addEventListener('click',()=>{
                        updateFile(fileValue.id, Object.assign({}, fileValue, {
                            status:  STATUS.cancaled 
                        }));
                        ipcRenderer.send('cancelDownload');
                    })
                })
                break;
            case "continueDownload":
                $.each(elements,function(idx,element){
                    element.addEventListener('click',()=>{
                        console.log('continueDownloadelement',element)
                        let count = 1
                        count++
                        console.log('continueDownload')
                        console.log('count',count)
                        updateFile(fileValue.id, Object.assign({}, fileValue, {
                            status:STATUS.paused 
                        }));
                        ipcRenderer.send('continueDownload');
                    })
                })
                break;
            case "pauseDownload":
                // $.each(elements,function(idx,element){
                //     element.addEventListener('click',()=>{
                //         console.log('pauseDownloadelement',element)
                //         let count = 1
                //         count++
                //         console.log('pauseDownload')
                //         console.log('count',count)
                //         updateFile(fileValue.id, Object.assign({}, fileValue, {
                //             status:  STATUS.progressing 
                //         }));
                //         ipcRenderer.send('pauseDownload');
                //     })
                // })
                $('.body .con').on('click', '.fileItem .pause', function (e) {
                    console.log($(this))
                    var value = $(this).parents('.fileItem').find('.data').data('item');
                    console.log(value,"value")
                    updateFile(value.id, Object.assign({}, value, {
                      status: STATUS.paused
                    }));
                    ipcRenderer.send('pauseDownload');
                  });
                break;
            default:
                console.log('err')
        }
       
    }
}
new DownloadBlock().initBlock()
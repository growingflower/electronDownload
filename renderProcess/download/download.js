const {ipcRenderer} = nodeRequire('electron');
const {dialog} = nodeRequire('electron').remote


class DownloadBlock {
    constructor(){
    }
    initBlock(){
        console.log(222)
        this.sendDownloadMS();
        this.listenDownloading();
    }
    checkIsDownloading (url){
        let downloading = $('.fileItem').find('.data')
        for(let i = 0; i<downloading.length; i++){
            if(JSON.parse(downloading[i].getAttribute('data-item')).url === url){
                let opts = {type:'info',message:"item is in DownloadingList"}
                dialog.showMessageBox(opts)
                return false
            }
            return true
        }
    }
    sendDownloadMS(){
        let downloadBtn = document.getElementById('downloadButton')
        let downloadUrlinput = document.getElementById('downloadUrl')
        downloadBtn.addEventListener('click',(event)=>{
            let url = $.trim(downloadUrlinput.value);
            if(url && this.checkIsDownloading(url)){
                ipcRenderer.send('startdownload',url)
            }else{
                return
            }
        })
    }

    getNewfileSatus(downloadingInfos){
        let fileValue = {
            'name': downloadingInfos.filename,
            'url': downloadingInfos.url,
            'status': 1,
            'downloaded':downloadingInfos.hasDownloadedBytes,
            'total': downloadingInfos.totalBytes,
            'speed': 0,
            'id':downloadingInfos.startTime*1000000
            };
        return fileValue
    }

    listenDownloading(){
        console.log(3333)
        ipcRenderer.on("downloading",(event, downloadItemInfos)=>{
            console.log(1111)
            // ipcRenderer.send('downloadingInfo',arg)
            let {filesize,startTime,filename,url} = downloadItemInfos
            let fileValue = {
                'name': filename,
                'url': url,
                'status': 1,
                'downloaded': 0,
                'total': filesize,
                'speed': 0,
                'id':startTime*1000000
                };
            addFile(fileValue)
            ipcRenderer.on('receivedBytes',(event,arg,speed,hasDownloadedBytes,startTime,fileUrl,filename,filesize)=>{
                fileValue.downloaded = Number(arg);
                updateFile(startTime*1000000, Object.assign({}, fileValue, {
                        downloaded:hasDownloadedBytes,
                        speed:speed,
                        name:filename,
                        fileUrl:fileUrl,
                        total:filesize,
                        status: fileValue.downloaded === fileValue.total ? STATUS.completed : STATUS.progressing
                      }));
            })
            this.addClassEvent('continueDownload',fileValue);   
            this.addClassEvent('pauseDownload',fileValue);  
            this.addClassEvent('cancelDownload',fileValue);  

                
            ipcRenderer.on('isPaused',(event,downloadingInfos)=>{
                let newFile = this.getNewfileSatus(downloadingInfos)
                newFile.status = STATUS.paused
                let startTime = downloadingInfos.startTime*1000000;
                updateFile(startTime, Object.assign({}, fileValue,newFile ));
            })
            ipcRenderer.on('completed',(event,downloadingInfos)=>{
                let newFile = this.getNewfileSatus(downloadingInfos)
                newFile.status = STATUS.completed
                let startTime = downloadingInfos.startTime*1000000;
                updateFile(startTime, Object.assign({}, fileValue, newFile));                
            })   
            this.addClassEvent('openDir',fileValue);
            ipcRenderer.on('cancelled',(event,downloadingInfos)=>{
                let newFile = this.getNewfileSatus(downloadingInfos)
                newFile.status = STATUS.cancaled;
                let startTime = downloadingInfos.startTime*1000000;
                console.log("startTime",startTime)
                updateFile(startTime, Object.assign({}, fileValue, newFile));      
            }) 
            this.addClassEvent('retryDownload',fileValue);  
           
        })
        
    }

    addClassEvent(type,fileValue){
        let id = fileValue.id;
        switch(type){
            case "openDir":
                $("#"+id).on('click','.openDir',function(e){
                    let value = $('.openDir').parents('.fileItem').find('.data').data('item').name;
                    ipcRenderer.send('openDir',id);
                })
                break;
            case "cancelDownload":
                $("#"+id).on('click','.cancel.ml10',function(e){
                    let value = $('.cancel').parents('.fileItem').find('.data').data('item');
                    updateFile(id, Object.assign({}, value, {
                            status: STATUS.cancel
                    }));
                    ipcRenderer.send('cancelDownload',id);
                })
                break;
            case "continueDownload":
                $("#"+id).on('click','.continue',function(e){
                    let value = $('.continue').parents('.fileItem').find('.data').data('item');
                    updateFile(id, Object.assign({}, value, {
                            status: STATUS.cancel
                    }));
                    ipcRenderer.send('continueDownload',id);
                })
                break;
            case "pauseDownload":
                $("#"+id).on('click','.pause',function(e){
                    let value = $('.pause').parents('.fileItem').find('.data').data('item');
                    updateFile(id, Object.assign({}, value, {
                                status: STATUS.paused
                    }));
                    ipcRenderer.send('pauseDownload',id);
                })
                break;
            case "retryDownload":
                $("#"+id).on('click','.retry',function(e){
                    let value = $('.retry').parents('.fileItem').find('.data').data('item');
                    updateFile(id, Object.assign({}, value, {
                            status: STATUS.cancaled
                    }));
                    let url = value.url
                    ipcRenderer.send('startdownload',url)
                })
                break;
            default:
                console.log('err')
        }
       
    }
}
new DownloadBlock().initBlock()
const {ipcRenderer} = nodeRequire('electron');

class DownloadBlock {
    constructor(){
    }
    initBlock(){
        this.sendDownloadMS();
        this.listenDownloading();
    }
    sendDownloadMS(){
        let downloadBtn = document.getElementById('downloadButton')
        let downloadUrlinput = document.getElementById('downloadUrl')
        downloadBtn.addEventListener('click',(event)=>{
            let url = downloadUrlinput.value;
            if(url){
                ipcRenderer.send('startdownload',url)
                
            }else{
                return
            }
        })
    }

    listenDownloading(){
        ipcRenderer.on("downloading",(event, arg)=>{
            let fileInfos = arg.split("+")
            let [filesize,startTime,downloadedSize,filename,fileUrl] = fileInfos
            let data = [
                  {
                    name: filename,
                    url: fileUrl,
                    status: 1,
                    downloaded: downloadedSize,
                    total: filesize,
                    speed: 1000
                  }].map(function (v) {
                        return Object.assign({}, v, {
                        id: Array.apply(null, new Array(5)).
                            map(a => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)).
                            join('-')
                        });
                    });
            render(data)   
            this.operateDownloading()
            ipcRenderer.on('completed',(event,arg)=>{
                let data = [
                    {
                      name: filename,
                      url: fileUrl,
                      status: 1,
                      downloaded: downloadedSize,
                      total: filesize,
                      speed: 1000
                    }].map(function (v) {
                          return Object.assign({}, v, {
                          id: Array.apply(null, new Array(5)).
                              map(a => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)).
                              join('-')
                          });
                      });
              render(data)  
            })     
        })
        
    }

    operateDownloading(){
        // let cancelBtn = document.getElementsByClassName('cancel');
        // let continueBtn = document.getElementsByClassName('continue');
        let pauseBtn = document.getElementsByClassName('pause');
        // let popenDirBtn = document.getElementsByClassName('openDir');
        // this.addClassEvent(cancelBtn,'cancelDownload')
        // this.addClassEvent(continueBtn,'continueDownload')
        this.addClassEvent(pauseBtn,'pauseDownload')
        // this.addClassEvent(popenDirBtn,'openDir')
        // cancelBtn.addEventListener('click',(event)=>{
        //     ipcRenderer.send('cancelDownload')
        // });
        // continueBtn.addEventListener('click',(event)=>{
        //     ipcRenderer.send('continueDownload')
        // });
        // pauseBtn.addEventListener('click',(event)=>{
        //     ipcRenderer.send('pauseDownload')
        // });
        // popenDirBtn.addEventListener('click',(event)=>{
        //     ipcRenderer.send('openDir')
        // });
    }

    addClassEvent(elements,type){
        // $.each(elements,function(idx,obj){
        //     console.log(obj)
        //     obj.addEventListener('click',()=>{
        //         console.log(111)
        //     }) 
        // })
        for(let i=0;i<elements.length;i++){
            console.log(elements[i])
            elements[i].addEventListener('click',()=>{
                console.log(111)
            }) 
        }
        // $.each([{A:1}],function(idx,element){
        //     console.log('iam coming')
        //     console.log(idx)
        //     console.log(element)
        // })
    }
}
new DownloadBlock().initBlock()
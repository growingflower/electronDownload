const {ipcRenderer} = require('electron');

class DownloadBlock {
    constructor(){

    }
    initBlock(){
        this.sendDownloadMS()
    }
    sendDownloadMS(){
        let downloadBtn = document.getElementById('downloadButton')
        let downloadUrl = document.getElementById('downloadUrl')
        downloadBtn.addEventListener('click',(event)=>{
            console.log(888)
            console.log("666",downloadUrl)
            ipcRenderer.send('startdownload',downloadUrl)
        })
    }
}
new DownloadBlock().initBlock()
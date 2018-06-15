const {ipcRenderer} = require('electron');

class DownloadBlock {
    constructor(){

    }
    initBlock(){

    }
    sendDownloadMS(){
        let downloadBtn = $('#downloadButton');
        let downloadUrl = $('#downloadUrl').val();
        if(!downloadUrl) return
        downloadBtn.on('click',(event)=>{
            ipcRenderer.send('download',downloadUrl)
        })
    }
}

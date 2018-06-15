const {webContents,ipcMain} = require('electron');

class Receiver {
    constructor() {
        
    }
    init(){
        this.receiveInfo()
    }
    receiveInfo(){
        ipcMain.on('startdownload',(event, arg)=>{
            console.log(arg)
            webContents.downloadURL(arg)
        })
    }

}

new Receiver().init()
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
            let allwins = webContents.getAllWebContents();
            allwins.webContents.downloadURL()
        })
    }

}

new Receiver().init()
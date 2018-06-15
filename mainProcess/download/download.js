const {ipcMain} = require('electron');

class Receiver {
    constructor() {
        
    }
    receiveInfo(){
        ipcMain.on('download',(event, arg)=>{
            
        })
    }

}
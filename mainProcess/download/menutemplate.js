

let initMenuTemp = function (BrowserWindow,dialog,shell,app,itemsCollection,win){
    let template = [{
        label: 'Edit',
        submenu: [{
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        }, {
          label: 'Redo',
          accelerator: 'Shift+CmdOrCtrl+Z',
          role: 'redo'
        }, {
          type: 'separator'
        }, {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        }, {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        }, {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        }, {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall'
        }]
      }, {
        label: 'View',
        submenu: [{
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              // on reload, start fresh and close any old
              // open secondary windows
              if (focusedWindow.id === 1) {
                BrowserWindow.getAllWindows().forEach(win => {
                  if (win.id > 1) win.close()
                })
              }
            //   let allDownloadItemsInfos = itemsCollection.find({})
            //   console.log(allDownloadItemsInfos)
            //   win.send('initAlldownloaditems',allDownloadItemsInfos)
            //   console.log(333333333)
            //   console.log(focusedWindow.reload,"333333333")
              focusedWindow.reload()
              
              
            }
          }
        }, {
          label: 'Toggle Full Screen',
          accelerator: (() => {
            if (process.platform === 'darwin') {
              return 'Ctrl+Command+F'
            } else {
              return 'F11'
            }
          })(),
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.setFullScreen(!focusedWindow.isFullScreen())
            }
          }
        }, {
          label: 'Toggle Developer Tools',
          accelerator: (() => {
            if (process.platform === 'darwin') {
              return 'Alt+Command+I'
            } else {
              return 'Ctrl+Shift+I'
            }
          })(),
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.toggleDevTools()
            }
          }
        }, {
          type: 'separator'
        }, {
          label: 'App Menu Demo',
          click: function (item, focusedWindow) {
            if (focusedWindow) {
              const options = {
                type: 'info',
                title: 'Application Menu Demo',
                buttons: ['Ok'],
                message: 'This demo is for the Menu section, showing how to create a clickable menu item in the application menu.'
              }
              dialog.showMessageBox(focusedWindow, options, function () {})
            }
          }
        }]
      }, {
        label: 'Window',
        role: 'window',
        submenu: [{
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize'
        }, {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          role: 'close'
        }, {
          type: 'separator'
        }, {
          label: 'Reopen Window',
          accelerator: 'CmdOrCtrl+Shift+T',
          enabled: false,
          key: 'reopenMenuItem',
          click: () => {
            app.emit('activate')
          }
        }]
      }, {
        label: 'Help',
        role: 'help',
        submenu: [{
          label: 'Learn More',
          click: () => {
            shell.openExternal('http://electron.atom.io')
          }
        }]
      }]

      return template
}

module.exports = initMenuTemp

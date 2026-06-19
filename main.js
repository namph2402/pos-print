const { app } = require("electron");

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath,
    });

    require("./index.js");
    console.log("PrintServer ready");
  });

  app.on("second-instance", () => {
    console.log("PrintServer is already running");
  });
}

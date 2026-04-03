const { app } = require("electron");

require("./index.js");

app.whenReady().then(() => {
  console.log("App ready");
});
module.exports = (item, info = null) => {
  return `
    <html>
        <head>
        <style>
          body {
            width: 40mm;
            margin: 0;
            padding: 0;
            font-family: Arial;
            font-size: 13px;
          }
        </style>
        </head>
        <body>
        <div style="padding: 10px; text-align: center; ">
            <div style="font-size: 17px; margin-bottom: 5px;">
                <strong>${item.title}</strong>
            </div>
            <div style="display: flex; justify-content: center;">
                <span style="margin-right: 5px;">Số lượng:</span>
                <strong>${item.quantity}</strong>
            </div>
        </div>
        </body>
    </html>
  `;
};
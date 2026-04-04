module.exports = (item, info = null) => {
  return `
    <html>
        <head>
        <style>
          @page {
            size: 50mm 30mm;
            margin: 0;
          }
          body {
            width: 50mm;
            height: 30mm;
            margin: 0;
            padding: 0;
            font-family: Arial;
            font-size: 13px;
          }
        </style>
        </head>
        <body>
        <div style="padding-top: 10px; text-align: center; ">
            <div style="font-size: 17px; margin-bottom: 5px;">
                <strong>${item.title}</strong>
            </div>
            <div>
                <strong style="display: block; margin-bottom: 5px;">Giá: ${item.price || 0}</strong>
                <small>${item.note || ""}</small>
            </div>
        </div>
        </body>
    </html>
  `;
};
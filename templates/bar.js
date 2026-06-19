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
            transform: rotate(180deg);
            transform-origin: center center;
          }
          * {
            box-sizing: border-box;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          .label {
            width: 43mm;
            height: 25mm;
            margin: 3mm 4mm 2mm 1mm;
            padding: 0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            gap: 2mm;
            margin-bottom: 4px;
          }
          .right {
            flex-shrink: 0;
            text-align: right;
          }
      </style>
      </head>
      <body>
        <main class="label">
          <div>
              <div class="row" style="font-size: 13px;">
                  <strong>#${info.order_number || ""}</strong>
                  <span class="right">${info.table}</span>
              </div>
              <div class="row" style="font-size: 12px;">
                  <strong>${item.title}</strong>
                  <span class="right">${(item.price_number || 0).toLocaleString('VND')}</span>
              </div>
              <div>
                  <small style="display: block; text-align:start; margin-bottom: 5px">${item.list_topping || ""}</small>
                  <small style="display: block; text-align:start; margin-bottom: 5px">${item.note || ""}</small>
                  <small style="display: block">Hotline: ${info.phone}</small>
              </div>
          </div>
        </main>
      </body>
  </html>
  `;
};

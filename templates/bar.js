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
          }
      </style>
      </head>
      <body>
        <main style="margin: auto; width: 48mm">
          <div style="padding-right: 5px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px;">
                  <strong>#${info.order_number || ""}</strong>
                  <span>${info.table}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                  <strong>${item.title}</strong>
                  <span>${(item.price_number || 0).toLocaleString('VND')}</span>
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
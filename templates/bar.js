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
              <span style="display: block; margin-bottom: 5px; font-size: 13px; font-weight: 700">PizzaHip’S</span>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                  <strong>#${info.order_number || ""}</strong>
                  <span>${info.table}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                  <strong>${item.title}</strong>
                  <span>${(item.price_number || 0).toLocaleString('VND')}</span>
              </div>
              <div>
                  <span style="display: block; text-align:start">${item.note || ""}</span>
                  <span style="display: block; margin-top: 5px;">Hotline: ${info.hot_line}</span>
              </div>
          </div>
        </main>
      </body>
  </html>
  `;
};
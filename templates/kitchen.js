module.exports = (items, info) => {
  return `
    <html>
      <head>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            width: 80mm;
            margin: 0;
            padding: 0;
            font-family: Arial;
            font-size: 12px;
          }
          table, th, td {
            padding: 5px;
            border-bottom: 1px solid #ececec;
            border-collapse: collapse;
          }
        </style>
      </head>
      <body>
        <main style="margin: auto;">
          <div style="padding: 5px">
            <div style="text-align: center; margin-bottom: 5px;">
                <span style="display: block; margin-bottom: 5px;">Phiếu đặt đồ</span>
                <strong style=" font-size: 18px;">HIPS -${info.order_number || ""}</strong>
            </div>
            <div style="margin-bottom: 5px">
                <strong>Thời gian: </strong>
                <span>${new Date().toLocaleString("vi-VN")}</span>
            </div>
            <div>
                <strong>Hình thức: </strong>
                <span>${info.table}</span>
            </div>
          </div>
          <table style="width: 100%; padding: 0; font-size: 13px">
            <thead>
              <tr>
                <th style="width: 75%; text-align: start;">Tên món</th>
                <th style="width: 25%;">SL</th>
              </tr>
            </thead>
            <tbody>
              ${(items || []).map(item => `
                <tr style="fonrt-size: 14px">
                  <td>
                    <p style="margin-top: 0; margin-bottom: 5px;">${item.title}</p>
                    <small style="display: block">${item.variations || ""}</small>
                    <small>${item.note || ""}</small>
                  </td>
                  <td>
                      <p style="margin: 0; text-align: center;">${item.quantity}</p>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </main>
      </body>
    </html>
  `;
};
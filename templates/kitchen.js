module.exports = (items, info) => {
  return `
    <html>
      <head>
        <style>
          body {
            width: 80mm;
            margin: 0;
            padding: 0;
            font-family: Arial;
            font-size: 13px;
          }
          table, th, td {
            padding: 5px;
            border-bottom: 1px solid #ececec;
            border-collapse: collapse;
          }
        </style>
      </head>
      <body>
        <div style="padding: 5px">
          <div style="padding: 5px">
            <div style="text-align: center; font-size: 16px; margin-bottom: 10px;">
                <strong>Phiếu đặt đồ</strong>
            </div>
            <div style="margin-bottom: 10px">
                <strong>Thời gian: </strong>
                <span>${new Date().toLocaleString("vi-VN")}</span>
            </div>
            <div style="margin-bottom: 10px">
                <strong>Hình thức: </strong>
                <span>${info.table}</span>
            </div>
          </div>
          <table style="width: 100%; padding: 0">
            <thead>
              <tr>
                <th style="width: 75%; text-align: start; font-size: 13px">Tên món</th>
                <th style="width: 25%; font-size: 13px">SL</th>
              </tr>
            </thead>
            <tbody style="font-size: 15px">
              ${(items || []).map(item => `
                <tr>
                  <td>
                    <p style="margin-top: 0; margin-bottom: 5px;">${item.title}</p>
                    <small>${item.note || ""}</small>
                  </td>
                  <td>
                      <p style="margin: 0; text-align: center;">${item.quantity}</p>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `;
};
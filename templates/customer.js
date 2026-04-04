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
                table,
                th,
                td {
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
                        <span style="display: block; margin-bottom: 5px;">Số đơn hàng</span>
                        <strong style=" font-size: 18px;">HIPS - ${items.order_number}</strong>
                    </div>
                    <div style="text-align: center; padding-bottom: 5px; margin-bottom: 10px; border-bottom: 1px dashed">
                        <span style="display: block; margin-bottom: 5px;">Chào mừng quý khách đến với</span>
                        <strong style=" font-size: 14px;">${info.name_store}</strong>
                    </div>
                    <div style="margin-bottom: 5px">
                        <strong>Khách hàng: </strong>
                        <span>${info.CustomerInfo?.name ? info.CustomerInfo.name : 'Khách hàng'}</span>
                    </div>
                    <div style="margin-bottom: 5px">
                        <strong>Thời gian: </strong>
                        <span>${new Date().toLocaleString("vi-VN")}</span>
                    </div>
                    <div style="margin-bottom: 5px">
                        <strong>Hình thức: </strong>
                        <span>${info.table}</span>
                    </div>
                    <div>
                        <strong>Thanh toán: </strong>
                        <span>${info.payment}</span>
                    </div>
                </div>
                <table style="width: 100%; padding: 0">
                    <thead>
                        <tr style="font-size: 12px">
                            <th style="width: 50%; text-align: start;">Tên món</th>
                            <th>SL</th>
                            <th>Giá</th>
                            <th>Tổng</th>
                        </tr>
                    </thead>
                    <tbody style="font-size: 12px">
                    ${(items.order_items || []).map(item => `
                        <tr>
                            <td>
                                <p style="margin-top: 0; margin-bottom: 5px;">${item.title}</p>
                                <small>${item.note || ""}</small>
                            </td>
                            <td>
                                <p style="margin: 0; text-align: center;">${item.quantity}</p>
                            </td>
                            <td>
                                <p style="margin: 0; text-align: center;">${item.price_number.toLocaleString('VND')}</p>
                            </td>
                            <td>
                                <p style="margin: 0; text-align: center;">${(item.quantity * item.price_number).toLocaleString('VND')}</p>
                            </td>
                        </tr>
                    `).join("")}
                        <tr>
                            <td><strong>Tổng</strong></td>
                            <td></td>
                            <td></td>
                            <td>
                                <p style="margin: 0; text-align: center;">${items.amount.toLocaleString('VND')}</p>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="3"><strong>Giảm giá</strong></td>
                            <td>
                                <p style="margin: 0; text-align: center;">${(items.discount).toLocaleString('VND')}</p>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="3"><strong>Thuế VAT</strong></td>
                            <td>
                                <p style="margin: 0; text-align: center;">${items.vat.toLocaleString('VND')}</p>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="3"><strong>Tổng thanh toán</strong></td>
                            <td>
                                <p style="margin: 0; text-align: center;">${items.total_amount.toLocaleString('VND')}</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div style="padding: 5px; text-align: center;">
                    <div style="margin-bottom: 5px; font-size: 14px;">
                        <strong>${info.user || ""}</strong>
                    </div>
                    <div style="margin-bottom: 5px;">
                        <strong>${info.bank || ""}</strong>
                        <span style="margin-left: 3px; font-size: 15px;">${info.number || ""}</span>
                    </div>
                    <div style="width: 70%; margin: auto;">
                        <img style="width: 100%; height: auto;" alt="QR Code" src="${info.qr_code || ""}" onerror="this.style.display='none'"/>
                    </div>
                    <p>
                        Mọi thắc mắc xin vui lòng liên hệ
                        <span style="display: block; margin-top: 3px;">Cửa hàng: ${info.hot_line}</span>
                        <span style="display: block; margin-top: 3px;">Hotline Pizzahips: ${info.hot_line_pizzahips}</span>
                    </p>
                    <strong>Cảm ơn Quý Khách</strong>
                </div>
            </main>
        </body>
    </html>
`;
};
import { InvoiceData } from '../types/index';

export const generateInvoiceHtml = (data: InvoiceData): string => {
  const subtotal = data.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const vat = subtotal * 0.17; // מע"מ
  const total = subtotal + vat;

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="utf-8">
      <title>${data.documentTitle}</title>
      <style>
        @page {
          size: A4;
          margin: 20mm;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          margin: 0;
          padding: 0;
          direction: rtl;
          font-size: 14px;
        }
        .header-table {
          width: 100%;
          margin-bottom: 30px;
          border-bottom: 2px solid #0066cc;
          padding-bottom: 10px;
        }
        .company-title {
          font-size: 24px;
          font-weight: bold;
          color: #0066cc;
        }
        .doc-details {
          text-align: left;
          font-size: 13px;
        }
        .info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
        }
        .info-block {
          line-height: 1.6;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .items-table th, .items-table td {
          border: 1px solid #dee2e6;
          padding: 10px;
          text-align: right;
        }
        .items-table th {
          background-color: #0066cc;
          color: white;
          font-weight: 600;
        }
        .items-table tr:nth-child(even) {
          background-color: #f8f9fa;
        }
        .summary-section {
          width: 40%;
          margin-right: auto;
          line-height: 1.8;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
        }
        .summary-row.total {
          font-weight: bold;
          font-size: 16px;
          border-top: 2px solid #333;
          color: #0066cc;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 11px;
          color: #777;
          border-top: 1px solid #eee;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>

      <table class="header-table">
        <tr>
          <td>
            <div class="company-title">הובגן פתרונות תוכנה</div>
            <div>מסמך דיגיטלי מאובטח</div>
          </td>
          <td class="doc-details">
            <h2>${data.documentTitle}</h2>
            <div><strong>מספר מסמך:</strong> ${data.documentNumber}</div>
            <div><strong>תאריך:</strong> ${data.date}</div>
          </td>
        </tr>
      </table>

      <div class="info-section">
        <div class="info-block">
          <strong>לכבוד:</strong> ${data.clientName}<br>
          <strong>ח.פ / ע.מ:</strong> ${data.clientTaxId}
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>תיאור השירות / המוצר</th>
            <th>כמות</th>
            <th>מחיר יחידה</th>
            <th>סה"כ</th>
          </tr>
        </thead>
        <tbody>
          ${data.items
            .map(
              (item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.description}</td>
              <td>${item.quantity}</td>
              <td>₪${item.price.toLocaleString()}</td>
              <td>₪${(item.quantity * item.price).toLocaleString()}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="summary-section">
        <div class="summary-row">
          <span>סכום ביניים:</span>
          <span>₪${subtotal.toLocaleString()}</span>
        </div>
        <div class="summary-row">
          <span>מע"מ (17%):</span>
          <span>₪${vat.toLocaleString()}</span>
        </div>
        <div class="summary-row total">
          <span>סה"כ לתשלום:</span>
          <span>₪${total.toLocaleString()}</span>
        </div>
      </div>

      ${
        data.notes
          ? `<div style="margin-top: 20px;"><strong>הערות:</strong><p>${data.notes}</p></div>`
          : ''
      }

      <div class="footer">
        מסמך זה הופק באמצעות המערכת המקומית המאובטחת | ללא מעבר נתונים בשרתי צד שלישי
      </div>

    </body>
    </html>
  `;
};
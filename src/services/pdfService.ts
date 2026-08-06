import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { generateInvoiceHtml } from '../templates/invoiceTemplate';
import { InvoiceData } from '../types';
import { saveInvoiceToHistory } from './storageService';

export const createAndExportPdf = async (data: InvoiceData): Promise<void> => {
  try {
    // 1. שמירה מקומית בהיסטוריה
    await saveInvoiceToHistory(data);

    // 2. הפקת קובץ ה-PDF
    const html = generateInvoiceHtml(data);

    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    } else {
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `הורדת ${data.documentTitle}`,
        });
      }
    }
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw new Error('אירעה שגיאה בייצור קובץ ה-PDF');
  }
};
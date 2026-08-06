export async function loadPDFDocument() {
  if (typeof window === 'undefined') return null;

  // אם הספרייה כבר טעונה בזיכרון
  if ((window as any).PDFLib) {
    return (window as any).PDFLib.PDFDocument;
  }

  return new Promise((resolve, reject) => {
    // מנגנון הגנה: יציאה אוטומטית משגיאה אם הטעינה אורכת מעל 8 שניות
    const timeout = setTimeout(() => {
      reject(new Error('טעינת מנוע ה-PDF אורכת זמן רב מדי'));
    }, 8000);

    const existingScript = document.getElementById('pdf-lib-script');
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if ((window as any).PDFLib) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          resolve((window as any).PDFLib.PDFDocument);
        }
      }, 50);
      return;
    }

    const script = document.createElement('script');
    script.id = 'pdf-lib-script';
    script.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

    script.onload = () => {
      clearTimeout(timeout);
      if ((window as any).PDFLib) {
        resolve((window as any).PDFLib.PDFDocument);
      } else {
        reject(new Error('PDFLib לא נמצא בחלון הדפדפן'));
      }
    };

    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('שגיאה בתקשורת מול שרת ה-PDF'));
    };

    document.head.appendChild(script);
  });
}
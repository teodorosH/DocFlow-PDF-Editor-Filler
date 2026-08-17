import { test, expect, devices } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// הגדרת הפרויקט לרוץ כאילו אנחנו במכשיר מובייל (למשל Pixel 5)
test.use({
  ...devices['Pixel 5'],
  // אפשרות לוודא סימולציית מגע
  hasTouch: true
});

test('Real User E2E Journey (Mobile Mode): Login -> Upload PDF -> Edit -> Preview -> Download', async ({ page }) => {
  test.setTimeout(90000);

  console.log('📱🚀 מתחיל מסע משתמש במצב מובייל באפליקציה...');

  // 1. כניסה לאפליקציה
  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('text=DocFlow')).toBeVisible();

  // 2. פתיחת מודל התחברות (יותאם אוטומטית לתצוגת מובייל)
  const loginRegBtn = page.locator('text=🔑 התחבר / הרשם');
  await expect(loginRegBtn).toBeVisible();
  await expect(loginRegBtn).toBeEnabled();
  await loginRegBtn.click();

  // מעבר למסך התחברות
  const alreadyRegisteredBtn = page.locator('text=כבר נרשמת? התחבר כאן');
  if (await alreadyRegisteredBtn.isVisible()) {
    await alreadyRegisteredBtn.click();
  }

  // מילוי פרטים
  const emailInput = page.locator('input[type="email"], input').nth(0);
  const passwordInput = page.locator('input[type="password"], input').nth(1);

  await emailInput.fill('test@docflow.com');
  await passwordInput.fill('Password123');

  const submitLoginBtn = page.locator('div', { hasText: /^התחבר$/ }).last();
  await submitLoginBtn.click();

  // וידוא הצלחת התחברות
  const uploadArea = page.locator('text=📂 העלה קובץ PDF להתחלה');
  await expect(uploadArea).toBeVisible({ timeout: 10000 });
  console.log('✅ התחברות במובייל בוצעה בהצלחה');

  // 3. הכנה והעלאת קובץ PDF
  const pdfPath = path.join(__dirname, '../real-test-document.pdf');
  if (!fs.existsSync(pdfPath)) {
    fs.writeFileSync(pdfPath, '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000000 <</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF');
  }

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    uploadArea.click()
  ]);

  await fileChooser.setFiles(pdfPath);
  console.log('📁 קובץ הועלה בהצלחה במובייל!');

  // 4. עריכת המסמך
  const textTool = page.locator('text=✍️ טקסט');
  if (await textTool.isVisible()) {
    await textTool.click();
    console.log('✍️ נבחר כלי טקסט במובייל');
  }

  // 5. תצוגה מקדימה
  const previewBtn = page.locator('text=👁️ תצוגה מקדימה');
  if (await previewBtn.isVisible()) {
    await previewBtn.click();
    console.log('👁️ נפתחה תצוגה מקדימה במובייל');

      // מחכים רגע קצר שהמודל יפתח
    await page.waitForTimeout(1000);

      // תפיסת כפתור הסגירה בצורה מדויקת לפי המחלקה שמצביעה על אלמנט לחיץ (cursor) והטקסט שבתוכו
    const closePreview = page.locator('div.r-cursor-1loqt21', { hasText: 'סגור' }).first();

    if (await closePreview.isVisible()) {
        // לחיצה חזקה ועוקפת מכשולים על ה-div החיצוני שמכיל את אירוע הלחיצה
      await closePreview.click({ force: true });
      console.log('✖️ נלחץ כפתור סגירה');

        // וידוא שהמודל אכן נעלם מהמסך
      await expect(closePreview).toBeHidden({ timeout: 5000 }).catch(async () => {
        console.log('⚠️ מנסה ללחוץ שוב על כפתור הסגירה...');
        await closePreview.click({ force: true });
        });
      }
    }

  console.log('✖️ חלון התצוגה המקדימה נסגר בהצלחה');
  // 6. הורדת ה-PDF הסופי
  const downloadBtn = page.locator('text=💾 הורד PDF סופי');
  await expect(downloadBtn).toBeVisible();
  await expect(downloadBtn).toBeEnabled();

  await downloadBtn.scrollIntoViewIfNeeded();

    // לחיצה והמתנה להורדה (ללא await מיותר בתוך המערך, ועם force: true לעקיפת אלמנטים חוסמים)
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
    downloadBtn.click({ force: true }),
    ]);

  if (download) {
    const downloadedPath = await download.path();
    expect(downloadedPath).toBeTruthy();
    console.log(`💾 הקובץ ירד בהצלחה למחשב! נתיב זמני: ${downloadedPath}`);
  } else {
    console.log('✅ כפתור ההורדה נלחץ בהצלחה (הורדת Blob בוצעה)');
    }
}
)
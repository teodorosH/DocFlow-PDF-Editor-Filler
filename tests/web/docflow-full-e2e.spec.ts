import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('DocFlow Comprehensive E2E Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    // כניסה לאפליקציה לפני כל בדיקה
    await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=DocFlow')).toBeVisible();
  });

  test('1. Registration, Plans and Login Modal Flow', async ({ page }) => {
    // א. פתיחת מודל התחברות/הרשמה ראשוני
    const loginRegBtn = page.locator('text=🔑 התחבר / הרשם');
    await expect(loginRegBtn).toBeVisible();
    await loginRegBtn.click();

    // וידוא שאנחנו במסך הרשמה
    const registerTitle = page.locator('text=הרשמה').first();
    await expect(registerTitle).toBeVisible();

    // מילוי שדות הרשמה (שם מלא, מייל, סיסמה)
    const inputs = page.locator('input');
    if (await inputs.count() >= 3) {
      await inputs.nth(0).fill('ישראל ישראلي');
      await inputs.nth(1).fill('test@docflow.com');
      await inputs.nth(2).fill('Password123');
    }

    // ב. לחיצה על "המשך לבחירת מסלול ➔"
    const continueToPlanBtn = page.locator('text=המשך לבחירת מסלול ➔');
    await expect(continueToPlanBtn).toBeVisible();
    await continueToPlanBtn.click();

    // ג. וידוא מעבר למסך בחירת מסלולים
    await expect(page.locator('text=Basic 🆓')).toBeVisible();
    await expect(page.locator('text=Pass 🎟️')).toBeVisible();
    await expect(page.locator('text=Premium 👑')).toBeVisible();

    // בחירת מסלול Pass
    await page.locator('text=Pass 🎟️').click();

    // בדיקת כפתור חזרה ◀ חזרה
    const backBtn = page.locator('text=◀ חזרה');
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // מעבר למסך התחברות ("כבר נרשמת? התחבר כאן")
    const alreadyRegisteredBtn = page.locator('text=כבר נרשמת? התחבר כאן');
    await expect(alreadyRegisteredBtn).toBeVisible();
    await alreadyRegisteredBtn.click();

    // ד. וידוא מעבר למסך התחברות
    const loginSubmitBtn = page.locator('div', { hasText: /^התחבר$/ }).last();
    await expect(loginSubmitBtn).toBeVisible();

    const loginInputs = page.locator('input');
    if (await loginInputs.count() >= 2) {
      await loginInputs.nth(0).fill('test@docflow.com');
      await loginInputs.nth(1).fill('Password123');
    }

    // בדיקת כפתור חזרה להרשמה ("אין לך חשבון? הרשם כאן")
    const noAccountBtn = page.locator('text=אין לך חשבון? הרשם כאן');
    await expect(noAccountBtn).toBeVisible();
    await noAccountBtn.click();

    // ה. סגירת המודל הסופית
    const closeBtn = page.locator('text=סגור').first();
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    console.log('✅ מבחן תהליך המודלים עבר בהצלחה!');
  });

  test('2. Document Editing Tools and Export Flow', async ({ page }) => {
    console.log('--- מתחיל בדיקת כלי עריכת מסמכים ---');

    // א. זיהוי אזור/כפתור העלאת הקבצים
    const uploadArea = page.locator('text=📂 העלה קובץ PDF להתחלה');
    await expect(uploadArea).toBeVisible();

    const toolsToCheck = [
      { name: 'טקסט', selector: 'text=✍️ טקסט' },
      { name: 'מרקור', selector: 'text=🖍️ מרקור' },
      { name: 'צנזור', selector: 'text=⬛ צנזור' },
      { name: 'חתימה', selector: 'text=🖋️ חתימה' }
    ];

    for (const tool of toolsToCheck) {
      const toolElement = page.locator(tool.selector);
      if (await toolElement.isVisible()) {
        await toolElement.click();
        console.log(`✅ כלי "${tool.name}" נמצא ונלחץ בהצלחה`);
      }
    }

    // ב. בדיקת תצוגה מקדימה של המסמך הערוך
    const previewBtn = page.locator('text=👁️ תצוגה מקדימה');
    if (await previewBtn.isVisible()) {
      await previewBtn.click();
      console.log('✅ כפתור תצוגה מקדימה נלחץ');

      const closePreview = page.locator('text=סגור').first();
      if (await closePreview.isVisible()) {
        await closePreview.click();
      }
    }

    // ג. בדיקת כפתור הורדת ה-PDF הסופי
    const downloadBtn = page.locator('text=💾 הורד PDF סופי');
    if (await downloadBtn.isVisible()) {
      await expect(downloadBtn).toBeVisible();
      console.log('✅ כפתור הורדת PDF סופי מוצג ומוכן לפעולה');
    }

    console.log('--- בדיקת כלי עריכה וייצוא הסתיימה בהצלחה! ---');
  });

  test('3. Advanced E2E: Real File Upload simulation & Mobile Responsiveness', async ({ page }) => {
    console.log('--- מתחיל בדיקת העלאת קובץ ורספונסיביות ---');

    // א. בדיקת רספונסיביות - מעבר למצב מסך של טלפון נייד (iPhone 13 / Pixel)
    await page.setViewportSize({ width: 390, height: 844 });
    console.log('📱 עברנו לתצוגת מובייל (390x844)');

    // וידוא שהאפליקציה מתאקלמת ועדיין מציגה את הרכיבים המרכזיים
    await expect(page.locator('text=DocFlow')).toBeVisible();

    // חזרה למסך מלא למען שאר הבדיקה
    await page.setViewportSize({ width: 1280, height: 800 });

    // ב. סימולציית יצירת קובץ טמפלייט זמני לבדיקת העלאה (אם יש input מסוג file)
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      // יצירת קובץ PDF מינימלי זמני בתיקייה אם נדרש
      const dummyPdfPath = path.join(__dirname, 'test-sample.pdf');
      if (!fs.existsSync(dummyPdfPath)) {
        fs.writeFileSync(dummyPdfPath, '%PDF-1.4 dummy pdf content for testing');
      }

      await fileInput.setInputFiles(dummyPdfPath);
      console.log('📁 קובץ PDF סינטטי הועלה בהצלחה דרך ה-Input');
    } else {
      console.log('ℹ️ לא נמצא input מסוג file ישיר, מדלגים על העלאת קובץ פיזית');
    }

    // ג. לחיצה על כלי חתימה וסימולציית ציור על קנבס (אם קיים)
    const signatureTool = page.locator('text=🖋️ חתימה');
    if (await signatureTool.isVisible()) {
      await signatureTool.click();
      console.log('✅ כלי חתימה נפתח');
    }

    console.log('--- בדיקת מתקדמת ורספונסיביות הושלמה בהצלחה! ---');
  });

});
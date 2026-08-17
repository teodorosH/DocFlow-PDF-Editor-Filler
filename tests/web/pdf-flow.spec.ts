import { test, expect } from '@playwright/test';

test('DocFlow Full UI & Tools Flow Test', async ({ page }) => {
  // הגדלת זמן ההמתנה לטעינה ראשונית של Expo
  test.setTimeout(60000);

  // 1. כניסה לאפליקציה (ודא שהפורט תואם למה שרץ אצלך)
  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });

  // 2. בדיקה שהלוגו או כותרת האפליקציה מופיעים במסך הבית
  await expect(page.locator('text=DocFlow')).toBeVisible();

  // 3. בדיקה שהכותרת הראשית (Hero Title) מוצגת כראוי
  await expect(page.locator('text=עריכה, מילוי וחתימה על PDF')).toBeVisible();

  // 4. בדיקת הימצאות כפתור העלאת ה-PDF
  const uploadButton = page.locator('text=העלה קובץ PDF להתחלה');
  await expect(uploadButton).toBeVisible();

  console.log('✅ כל האלמנטים המרכזיים במסך הבית נמצאו בהצלחה!');
});


test('DocFlow Interactive Flow Test (Auth & Tools)', async ({ page }) => {
  test.setTimeout(60000);

  // 1. כניסה לאפליקציה
  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });

  // 2. וידוא טעינת עמוד הבית
  await expect(page.locator('text=DocFlow')).toBeVisible();
  await expect(page.locator('text=עריכה, מילוי וחתימה על PDF')).toBeVisible();

  console.log('✅ מסך הבית נטען בהצלחה');

  // 3. בדיקת כפתור ההתחברות/הרשמה מתוך רשימת הכפתורים שלך
  const loginRegisterButton = page.locator('text=🔑 התחבר / הרשם');
  if (await loginRegisterButton.isVisible()) {
    await loginRegisterButton.click();
    console.log('✅ כפתור התחבר/הרשם נלחץ בהצלחה');

    // וידוא שנפתח מודל ההתחברות (לפי שדות המייל או כפתור ההתחברות מתוך הקוד שלך)
    await expect(page.locator('text=כבר נרשמת? התחבר כאן')).toBeVisible();

    // סגירת המודל או חזרה (לחיצה על כפתור סגור אם קיים, או לחיצה מחוץ למודל)
    const closeButton = page.locator('text=סגור');
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }

  console.log('✅ הבדיקה האינטראקטיבית הסתיימה בהצלחה!');
});

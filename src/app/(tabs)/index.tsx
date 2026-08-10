import { loadPDFDocument } from '@/utils/pdfLoader';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { setAppLanguage, useAppLanguage } from '../languageStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://docflow.teoplatform.com';

type ToolType = 'text' | 'highlight' | 'redact' | 'signature' | 'magnifier';
type PlanType = 'free' | 'micro_pass' | 'premium';
type Language = 'he' | 'en' | 'ar' | 'am';

interface User {
  id: number;
  email: string;
  fullName?: string;
  full_name?: string;
  plan: PlanType;
  editsCount: number;
  passCredits: number;
  language?: Language;
  preferredLanguage?: Language;
}

interface EditorElement {
  id: string;
  type: ToolType;
  text?: string;
  imageUri?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  pageIndex: number;
}

interface PdfDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

const I18N = {
  he: {
    heroTitle: 'עריכה, מילוי וחתימה על PDF 📄✍️',
    heroSubtitle: 'הפתרון המהיר והפשוט ביותר למסמכי ה-PDF שלך, בכל שפה ומכל מקלדת!',
    uploadPdf: '📂 העלה קובץ PDF להתחלה',
    changePdf: '🔄 החלף קובץ PDF',
    textTool: '✍️ טקסט',
    textToolDesc: 'מלא טפסים, שדות וטקסט חופשי',
    highlightTool: '🖍️ מרקור',
    highlightToolDesc: 'הברק קטעים חשובים במסמך',
    redactTool: '⬛ צנזור',
    redactToolDesc: 'הסתר מידע רגיש וחסוי בבטחה',
    signatureTool: '🖋️ חתימה',
    signatureToolDesc: 'חתימה בנגיעה, בעכבר או העלאת תמונה',
     magnifierTool: '🔍 זכוכית מגדלת',
     magnifierToolDesc: 'הגדל והתמקד באזור הנבחר',
    preview: '👁️ תצוגה מקדימה',
    download: '💾 הורד PDF סופי',
    loginRegister: '🔑 התחבר / הרשם',
    accountLanguageLabel: 'שפת החשבון',
    personalArea: 'אזור אישי',
    accountEmail: 'אימייל',
    accountPlan: 'מסלול',
    changeLanguage: 'שינוי שפה',
    login: 'התחבר',
    register: 'הרשמה',
    logout: 'יציאה',
    prevPage: '◀ עמוד קודם',
    nextPage: 'עמוד הבא ▶',
    pageOf: 'עמוד {current} מתוך {total}',
    guestPageLimit: '(אורח: עמוד 1 בלבד)',
    signModalTitle: '🖋️ הוסף את חתימתך:',
    uploadSigImage: '📁 העלה קובץ תמונת חתימה (PNG/JPG)',
    orDrawBelow: 'או צייר חתימה ידנית למטה:',
    clear: 'ניקוי',
    confirmSignature: '✅ אישור חתימה',
    close: 'סגור',
    selectPlanTitle: 'בחר את המסלול המתאים לך:',
    basicPlan: 'Basic 🆓',
    basicPlanDesc: '3 עריכות/חודש',
    passPlan: 'Pass 🎟️',
    passPlanDesc: '10 עריכות ושמירות',
    premiumPlan: 'Premium 👑',
    premiumPlanDesc: 'ללא הגבלה כלל',
    guestNotice: "עורכים בשפה שלך בכל מקלדת (עברית, ערבית, אמהרית, סינית וכו')",
    emailPlaceholder: 'כתובת מייל',
    passwordPlaceholder: 'סיסמה',
    fullNamePlaceholder: 'שם מלא',
    alreadyRegistered: 'כבר נרשמת? התחבר כאן',
    noAccountYet: 'אין לך חשבון? הרשם כאן',
    continueToPlan: 'המשך לבחירת מסלול ➔',
    finishRegister: 'סיום הרשמה והתחל ✅',
    finish:'✓ סיום', position:'מיקום:', font:'פונט:', width:'רוחב:', narrow:'צר-', wide:'רחב+', delete:'🗑️ מחק', addToDocument:'הוסף למסמך ✅', addTextTitle:'✍️ הוספת טקסט למסמך', addTextHint:'הקלד את הטקסט שברצונך למקם במסמך:', readOnlyPreview:'תצוגה לקריאה בלבד — הורדת הקובץ זמינה רק בכפתור "הורד PDF סופי".', selectedElement:'🎯 אלמנט נבחר', accountPlanFree:'חינמי', guestSponsored:'Sponsored', adArea:'[ שטח פרסומת AdSense / Rewarded Ad ]', availableIn:'זמין בעוד', seconds:'שניות...', continueNow:'✅ המשך כעת', mobileSignaturePad:'[פד חתימה במגע למובייל]', userAlreadyExists:'⚠️ המשתמש כבר קיים', userAlreadyExistsHint:'ייתכן שכבר נרשמת עם כתובת המייל הזו.', goToLogin:'עבור להתחברות', back:'◀ חזרה', readOnlyLabel:'קריאה בלבד', error:'שגיאה', uploadErrorTitle:'שגיאה בטעינת הקובץ', uploadError:'לא ניתן לקרוא את קובץ ה-PDF שנבחר.', previewError:'אירעה שגיאה ביצירת תצוגה מקדימה', downloadSuccessTitle:'הצלחה!', downloadSuccess:'הקובץ הורד בהצלחה.', downloadError:'אירעה שגיאה בהורדת הקובץ', requiredCredentials:'נא למלא מייל וסיסמה', loginError:'שגיאה בהתחברות', registerError:'שגיאה בהרשמה', serverError:'שגיאה בהתחברות לשרת', quotaReached:'הגעת למכסת העריכות שלך.', quotaTitle:'המכסה הסתיימה ⚠️', package10:'רכוש חבילת 10 עריכות ב-₪9.90 🎟️', guestPageMessage:'משתמשים אורחים יכולים לערוך את עמוד 1 בלבד. הרשם בחינם כדי לערוך את כל עמודי הקובץ!', adUploadTitle:'⏳ טוען קובץ PDF...', adUploadMessage:'אורח? הרשם בחינם כדי לבטל את זמן ההמתנה בהעלאת קבצים!', adPreviewTitle:'👁️ מכין תצוגה מקדימה...', adPreviewMessage:'אורחים צופים בפרסומת קצרה. הרשמה בחינם תפתח תצוגה מקדימה מיידית!', successRegister:'ההרשמה בוצעה בהצלחה! 🚀', successLogin:'התחברת בהצלחה! 👋', welcome:'ברוך הבא!',
  },
  en: {
    heroTitle: 'PDF Edit, Fill & Sign 📄✍️',
    heroSubtitle: 'The fastest and easiest solution for your PDF documents in any language!',
    uploadPdf: '📂 Upload PDF Document',
    changePdf: '🔄 Change PDF File',
    textTool: '✍️ Text',
    textToolDesc: 'Fill forms, fields, and custom text',
    highlightTool: '🖍️ Highlight',
    highlightToolDesc: 'Highlight important document parts',
    redactTool: '⬛ Redact',
    redactToolDesc: 'Hide sensitive and confidential text',
    signatureTool: '🖋️ Signature',
    signatureToolDesc: 'Sign with touch, mouse, or upload image',
     magnifierTool: '🔍 Magnifier',
     magnifierToolDesc: 'Zoom and focus on selected area',
    preview: '👁️ Preview',
    download: '💾 Download PDF',
    loginRegister: '🔑 Login / Register',
    accountLanguageLabel: 'Account language',
    personalArea: 'Personal Area',
    accountEmail: 'Email',
    accountPlan: 'Plan',
    changeLanguage: 'Change language',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    prevPage: '◀ Previous',
    nextPage: 'Next ▶',
    pageOf: 'Page {current} of {total}',
    guestPageLimit: '(Guest: Page 1 only)',
    signModalTitle: '🖋️ Add your signature:',
    uploadSigImage: '📁 Upload signature image (PNG/JPG)',
    orDrawBelow: 'Or draw signature manually below:',
    clear: 'Clear',
    confirmSignature: '✅ Apply Signature',
    close: 'Close',
    selectPlanTitle: 'Choose your plan:',
    basicPlan: 'Basic 🆓',
    basicPlanDesc: '3 edits/month',
    passPlan: 'Pass 🎟️',
    passPlanDesc: '10 edits & saves',
    premiumPlan: 'Premium 👑',
    premiumPlanDesc: 'Unlimited access',
    guestNotice: 'Supports all keyboards and languages natively (Hebrew, Arabic, Amharic, Chinese, etc.)',
    emailPlaceholder: 'Email address',
    passwordPlaceholder: 'Password',
    fullNamePlaceholder: 'Full name',
    alreadyRegistered: 'Already have an account? Login',
    noAccountYet: "Don't have an account? Register",
    continueToPlan: 'Continue to select plan ➔',
    finishRegister: 'Complete Registration ✅',
    finish:'✓ Done', position:'Position:', font:'Font:', width:'Width:', narrow:'Narrow-', wide:'Wide+', delete:'🗑️ Delete', addToDocument:'Add to document ✅', addTextTitle:'✍️ Add text to document', addTextHint:'Enter the text you want to place in the document:', readOnlyPreview:'Read-only preview — downloading is available only through the "Download PDF" button.', selectedElement:'🎯 Selected element', accountPlanFree:'Free', guestSponsored:'Sponsored', adArea:'[ AdSense / Rewarded Ad area ]', availableIn:'Available in', seconds:'seconds...', continueNow:'✅ Continue now', mobileSignaturePad:'[Touch signature pad for mobile]', userAlreadyExists:'⚠️ User already exists', userAlreadyExistsHint:'You may already be registered with this email address.', goToLogin:'Go to login', back:'◀ Back', readOnlyLabel:'Read only', error:'Error', uploadErrorTitle:'File loading error', uploadError:'Unable to read the selected PDF file.', previewError:'An error occurred while creating the preview', downloadSuccessTitle:'Success!', downloadSuccess:'The file was downloaded successfully.', downloadError:'An error occurred while downloading the file', requiredCredentials:'Please enter email and password', loginError:'Login error', registerError:'Registration error', serverError:'Server connection error', quotaReached:'You have reached your edit limit.', quotaTitle:'Edit limit reached ⚠️', package10:'Buy a 10-edit package for ₪9.90 🎟️', guestPageMessage:'Guest users can edit page 1 only. Register for free to edit all pages!', adUploadTitle:'⏳ Loading PDF...', adUploadMessage:'Guest? Register for free to remove the upload waiting time!', adPreviewTitle:'👁️ Preparing preview...', adPreviewMessage:'Guests watch a short ad. Free registration opens the preview immediately!', successRegister:'Registration completed successfully! 🚀', successLogin:'Login successful! 👋', welcome:'Welcome!',
  },
  ar: {
    heroTitle: 'تعديل وتعبئة وتوقيع PDF 📄✍️',
    heroSubtitle: 'الحل الأسرع والأسهل لمستندات PDF الخاصة بك بأي لغة!',
    uploadPdf: '📂 تحميل ملف PDF',
    changePdf: '🔄 تغيير الملف',
    textTool: '✍️ نص',
    textToolDesc: 'تعبئة النماذج والتحرير الحر',
    highlightTool: '🖍️ تظليل',
    highlightToolDesc: 'تمييز النصوص الهامة في المستند',
    redactTool: '⬛ إخفاء',
    redactToolDesc: 'إخفاء المعلومات الحساسة',
    signatureTool: '🖋️ توقيع',
    signatureToolDesc: 'التوقيع باللمس، الماوس أو رفع صورة',
    magnifierTool: '🔍 عدسة مكبرة',
    magnifierToolDesc: 'تكبير والتركيز على المنطقة المحددة',
    preview: '👁️ معاينة',
    download: '💾 تحميل PDF',
    loginRegister: '🔑 تسجيل الدخول',
    accountLanguageLabel: 'لغة الحساب',
    personalArea: 'المنطقة الشخصية',
    accountEmail: 'البريد الإلكتروني',
    accountPlan: 'الخطة',
    changeLanguage: 'تغيير اللغة',
    login: 'دخول',
    register: 'تسجيل جديد',
    logout: 'خروج',
    prevPage: '◀ السابق',
    nextPage: 'التالي ▶',
    pageOf: 'صفحة {current} من {total}',
    guestPageLimit: '(زائر: الصفحة 1 فقط)',
    signModalTitle: '🖋️ أضف توقيعك:',
    uploadSigImage: '📁 رفع صورة التوقيع (PNG/JPG)',
    orDrawBelow: 'أو ارسم التوقيع ידנית أدناه:',
    clear: 'مسح',
    confirmSignature: '✅ تأكيد التوقيع',
    close: 'إغلاق',
    selectPlanTitle: 'اختر الخطة المناسبة لك:',
    basicPlan: 'مجاني 🆓',
    basicPlanDesc: '3 تعديلات/شهر',
    passPlan: 'تذكرة 🎟️',
    passPlanDesc: '10 تعديلات وحفظ',
    premiumPlan: 'ممتاز 👑',
    premiumPlanDesc: 'بلا حدود',
    guestNotice: 'يدعم جميع اللغات ولوحات المفاتيح تلقائياً',
    emailPlaceholder: 'البريد الإلكتروني',
    passwordPlaceholder: 'كلمة المرور',
    fullNamePlaceholder: 'الاسم الكامل',
    alreadyRegistered: 'لديك حساب بالفعل؟ تسجيل الدخول',
    noAccountYet: 'ليس لديك حساب؟ سجل الآن',
    continueToPlan: 'متابعة لاختيار الخطة ➔',
    finishRegister: 'إكمال التسجيل ✅',
    finish:'✓ إنهاء', position:'الموضع:', font:'الخط:', width:'العرض:', narrow:'أضيق-', wide:'أوسع+', delete:'🗑️ حذف', addToDocument:'إضافة إلى المستند ✅', addTextTitle:'✍️ إضافة نص إلى المستند', addTextHint:'اكتب النص الذي تريد وضعه في المستند:', readOnlyPreview:'معاينة للقراءة فقط — التنزيل متاح فقط من زر "تحميل PDF".', selectedElement:'🎯 العنصر المحدد', accountPlanFree:'مجاني', guestSponsored:'إعلان', adArea:'[ مساحة إعلان ]', availableIn:'متاح خلال', seconds:'ثوانٍ...', continueNow:'✅ متابعة الآن', mobileSignaturePad:'[لوحة توقيع باللمس للموبايل]', userAlreadyExists:'⚠️ المستخدم موجود بالفعل', userAlreadyExistsHint:'قد تكون مسجلاً بالفعل باستخدام هذا البريد الإلكتروني.', goToLogin:'الانتقال لتسجيل الدخول', back:'◀ رجوع', readOnlyLabel:'للقراءة فقط', error:'خطأ', uploadErrorTitle:'خطأ في تحميل الملف', uploadError:'تعذر قراءة ملف PDF المحدد.', previewError:'حدث خطأ أثناء إنشاء المعاينة', downloadSuccessTitle:'نجاح!', downloadSuccess:'تم تنزيل الملف بنجاح.', downloadError:'حدث خطأ أثناء تنزيل الملف', requiredCredentials:'يرجى إدخال البريد الإلكتروني وكلمة المرور', loginError:'خطأ في تسجيل الدخول', registerError:'خطأ في التسجيل', serverError:'خطأ في الاتصال بالخادم', quotaReached:'لقد وصلت إلى حد التعديلات.', quotaTitle:'انتهى الحد ⚠️', package10:'شراء حزمة 10 تعديلات مقابل ₪9.90 🎟️', guestPageMessage:'يمكن للزوار تعديل الصفحة الأولى فقط. سجل مجاناً لتعديل جميع الصفحات!', adUploadTitle:'⏳ جارٍ تحميل ملف PDF...', adUploadMessage:'زائر؟ سجل مجاناً لإلغاء وقت الانتظار عند رفع الملفات!', adPreviewTitle:'👁️ جارٍ تجهيز المعاينة...', adPreviewMessage:'يشاهد الزوار إعلاناً قصيراً. التسجيل المجاني يفتح المعاينة فوراً!', successRegister:'تم التسجيل بنجاح! 🚀', successLogin:'تم تسجيل الدخول بنجاح! 👋', welcome:'مرحباً!',
  },
  am: {
    heroTitle: 'ፒዲኤፍ ማስተካከል፣ መሙላት እና መፈረም 📄✍️',
    heroSubtitle: 'ለእርስዎ ፒዲኤፍ ሰነዶች ፈጣን እና ቀላሉ መፍትሄ!',
    uploadPdf: '📂 ፒዲኤፍ ፋይል ጫን',
    changePdf: '🔄 ፋይል ቀይር',
    textTool: '✍️ ጽሑፍ',
    textToolDesc: 'ቅጾችን እና ነፃ ጽሑፎችን ይሙሉ',
    highlightTool: '🖍️ አጉላ',
    highlightToolDesc: 'አስፈላጊ ሰነዶችን ያደምቁ',
    redactTool: '⬛ ሰርዝ',
    redactToolDesc: 'ሚስጥራዊ መረጃዎችን ደብቅ',
    signatureTool: '🖋️ ፊርማ',
    signatureToolDesc: 'በንክኪ፣ በሲያን ወይም ምስል በመጫን ይፈርሙ',
     magnifierTool: '🔍 ማጉያ',
     magnifierToolDesc: 'የተመረጠውን ቦታ አጉላ',
    preview: '👁️ ቅድመ እይታ',
    download: '💾 ፒዲኤፍ አውርድ',
    loginRegister: '🔑 ግባ / ተመዝገብ',
    accountLanguageLabel: 'የመለያ ቋንቋ',
    personalArea: 'የግል አካባቢ',
    accountEmail: 'ኢሜይል',
    accountPlan: 'እቅድ',
    changeLanguage: 'ቋንቋ ቀይር',
    login: 'ግባ',
    register: 'ተመዝገብ',
    logout: 'ውጣ',
    prevPage: '◀ የቀደመው ገጽ',
    nextPage: 'ቀጣይ ገጽ ▶',
    pageOf: 'ገጽ {current} ከ {total}',
    guestPageLimit: '(እንግዳ: ገጽ 1 ብቻ)',
    signModalTitle: '🖋️ ፊርማዎን ያክሉ:',
    uploadSigImage: '📁 የፊርማ ምስል ስቀል (PNG/JPG)',
    orDrawBelow: 'ወይም ከታች በእጅ ይሳሉ:',
    clear: 'አጽዳ',
    confirmSignature: '✅ ፊርማ አረጋግጥ',
    close: 'ዝጋ',
    selectPlanTitle: 'እባክዎን ዕቅድዎን ይምረጡ:',
    basicPlan: 'ነፃ 🆓',
    basicPlanDesc: '3 ማስተካከያ/ወር',
    passPlan: 'ቲኬት 🎟️',
    passPlanDesc: '10 ማስተካከያ እና ማስቀመጥ',
    premiumPlan: 'ፕሪሚየም 👑',
    premiumPlanDesc: 'ያልተገደበ',
    guestNotice: 'በማንኛውም ቋንቋ እና የቁልፍ ሰሌዳ ይሰራሉ',
    emailPlaceholder: 'ኢሜይል',
    passwordPlaceholder: 'የይለፍ ቃል',
    fullNamePlaceholder: 'ሙሉ ስም',
    alreadyRegistered: 'መለያ አለዎት? ይግቡ',
    noAccountYet: 'መለያ የለዎትም? ይመዝገቡ',
    continueToPlan: 'ወደ ዕቅድ ምርጫ ቀጥል ➔',
    finishRegister: 'ምዝገባ ጨርስ ✅',
    finish:'✓ ጨርስ', position:'ቦታ:', font:'ፊደል:', width:'ስፋት:', narrow:'ጠባብ-', wide:'ሰፊ+', delete:'🗑️ ሰርዝ', addToDocument:'ወደ ሰነዱ ጨምር ✅', addTextTitle:'✍️ ጽሑፍ ወደ ሰነዱ ጨምር', addTextHint:'በሰነዱ ላይ ማስቀመጥ የሚፈልጉትን ጽሑፍ ያስገቡ:', readOnlyPreview:'ለንባብ ብቻ — ማውረድ የሚቻለው በ"PDF አውርድ" ቁልፍ ብቻ ነው።', selectedElement:'🎯 የተመረጠ ኤለመንት', accountPlanFree:'ነፃ', guestSponsored:'ማስታወቂያ', adArea:'[ የማስታወቂያ ቦታ ]', availableIn:'ይገኛል በ', seconds:'ሰከንዶች...', continueNow:'✅ አሁን ቀጥል', mobileSignaturePad:'[የሞባይል ንክኪ ፊርማ ፓድ]', userAlreadyExists:'⚠️ ተጠቃሚው አለ', userAlreadyExistsHint:'በዚህ ኢሜይል አስቀድመው ተመዝግበው ሊሆን ይችላል።', goToLogin:'ወደ መግቢያ ሂድ', back:'◀ ተመለስ', readOnlyLabel:'ለንባብ ብቻ', error:'ስህተት', uploadErrorTitle:'የፋይል መጫኛ ስህተት', uploadError:'የተመረጠውን PDF ማንበብ አልተቻለም።', previewError:'ቅድመ እይታ ሲፈጠር ስህተት ተፈጥሯል', downloadSuccessTitle:'ተሳክቷል!', downloadSuccess:'ፋይሉ በተሳካ ሁኔታ ወርዷል።', downloadError:'ፋይሉን ሲያወርዱ ስህተት ተፈጥሯል', requiredCredentials:'እባክዎ ኢሜይል እና የይለፍ ቃል ያስገቡ', loginError:'የመግቢያ ስህተት', registerError:'የምዝገባ ስህተት', serverError:'የአገልግሎት ሰርቨር ግንኙነት ስህተት', quotaReached:'የአርትዖት ገደብዎ ደርሷል።', quotaTitle:'የአርትዖት ገደብ ደርሷል ⚠️', package10:'10 አርትዖት ፓኬጅ በ₪9.90 ይግዙ 🎟️', guestPageMessage:'እንግዶች ገጽ 1 ብቻ ማስተካከል ይችላሉ። ሁሉንም ገጾች ለማስተካከል በነፃ ይመዝገቡ!', adUploadTitle:'⏳ PDF በመጫን ላይ...', adUploadMessage:'እንግዳ? የፋይል መጫኛ የመጠበቂያ ጊዜን ለማስወገድ በነፃ ይመዝገቡ!', adPreviewTitle:'👁️ ቅድመ እይታ በመዘጋጀት ላይ...', adPreviewMessage:'እንግዶች አጭር ማስታወቂያ ያያሉ። ነፃ ምዝገባ ቅድመ እይታን ወዲያውኑ ይከፍታል!', successRegister:'ምዝገባው በተሳካ ሁኔታ ተጠናቋል! 🚀', successLogin:'መግባት ተሳክቷል! 👋', welcome:'እንኳን ደህና መጡ!',
  },
};

function DocFlowLogo() {
  return (
    <View style={styles.logoContainer}>
      <View style={styles.logoBadgeIcon}>
        <Text style={styles.logoBadgeText}>PDF</Text>
      </View>
      <Text style={styles.logoText}>Doc<Text style={styles.logoHighlight}>Flow</Text></Text>
    </View>
  );
}

async function getPdfLib() {
  const pdfLibModule = await loadPDFDocument();
  if (!pdfLibModule) throw new Error('מנוע ה-PDF לא נטען');

  const PDFDocument = pdfLibModule.PDFDocument || pdfLibModule.default?.PDFDocument || pdfLibModule;
  const rgb = pdfLibModule.rgb || pdfLibModule.default?.rgb || ((r: number, g: number, b: number) => ({ type: 'RGB', red: r, green: g, blue: b }));

  return { PDFDocument, rgb };
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function _base64ToArrayBuffer(base64: string): ArrayBuffer {
  const cleanBase64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const len = cleanBase64.length;
  let bufferLength = len * 0.75;
  if (cleanBase64.endsWith('==')) bufferLength -= 2;
  else if (cleanBase64.endsWith('=')) bufferLength -= 1;

  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = BASE64_CHARS.indexOf(cleanBase64[i]);
    const encoded2 = BASE64_CHARS.indexOf(cleanBase64[i + 1]);
    const encoded3 = BASE64_CHARS.indexOf(cleanBase64[i + 2]);
    const encoded4 = BASE64_CHARS.indexOf(cleanBase64[i + 3]);

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== 64 && encoded3 !== -1) {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (encoded4 !== 64 && encoded4 !== -1) {
      bytes[p++] = ((encoded3 & 3) << 6) | encoded4;
    }
  }
  return bytes.buffer;
}

function _uint8ArrayToBase64(bytes: Uint8Array): string {
  let base64 = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;

    const c1 = b1 >> 2;
    const c2 = ((b1 & 3) << 4) | (b2 >> 4);
    const c3 = ((b2 & 15) << 2) | (b3 >> 6);
    const c4 = b3 & 63;

    if (i + 1 >= len) {
      base64 += BASE64_CHARS.charAt(c1) + BASE64_CHARS.charAt(c2) + '==';
    } else if (i + 2 >= len) {
      base64 += BASE64_CHARS.charAt(c1) + BASE64_CHARS.charAt(c2) + BASE64_CHARS.charAt(c3) + '=';
    } else {
      base64 += BASE64_CHARS.charAt(c1) + BASE64_CHARS.charAt(c2) + BASE64_CHARS.charAt(c3) + BASE64_CHARS.charAt(c4);
    }
  }
  return base64;
}

export default function PdfEditorScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const BASE_CONTAINER_WIDTH = Math.min(windowWidth - 24, 600);

  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const CONTAINER_WIDTH = BASE_CONTAINER_WIDTH * zoomScale;

  const [defaultFontSize, setDefaultFontSize] = useState<number>(15);
  const [isScrollEnabled, setIsScrollEnabled] = useState<boolean>(true);

  const [lang, setLang] = useAppLanguage();
  const t = I18N[lang];

  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pdfDimensions, setPdfDimensions] = useState<PdfDimensions | null>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  const [activeTool, setActiveTool] = useState<ToolType>('text');
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const [activeInput, setActiveInput] = useState<{ x: number; y: number } | null>(null);
  const [currentText, setCurrentText] = useState('');
  const [loading, setLoading] = useState(false);

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureClickPos, setSignatureClickPos] = useState<{ x: number; y: number } | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingSignature = useRef(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [authStep, setAuthStep] = useState<1 | 2>(1);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('free');
  const [authLanguage, setAuthLanguage] = useState<Language>('he');

  const [userAlreadyExistsError, setUserAlreadyExistsError] = useState(false);

  const [showAdModal, setShowAdModal] = useState(false);
  const [adTitle, setAdTitle] = useState('📢 פרסומת חסות');
  const [adMessage, setAdMessage] = useState('');
  const [adTimer, setAdTimer] = useState(10);
  const [isAdFinished, setIsAdFinished] = useState(false);
  const [pendingAction, setPendingAction] = useState<'upload' | 'preview' | 'download' | null>(null);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPdfBytes, setPreviewPdfBytes] = useState<Uint8Array | null>(null);
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [previewZoom, setPreviewZoom] = useState(1.0);

  // V1 interaction restored: magnifier
  const [magnifierPos, setMagnifierPos] = useState<{ x: number; y: number } | null>(null);
  const [magZoom, setMagZoom] = useState(2.0);
  const [magnifierSnapshot, setMagnifierSnapshot] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const containerHeight = pdfDimensions
    ? CONTAINER_WIDTH / pdfDimensions.aspectRatio
    : CONTAINER_WIDTH * 1.41;

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  useEffect(() => {
    let interval: any = null;
    if (showAdModal && adTimer > 0) {
      interval = setInterval(() => {
        setAdTimer((prev) => prev - 1);
      }, 1000);
    } else if (adTimer === 0) {
      setIsAdFinished(true);
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showAdModal, adTimer]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !pdfBytes || !pdfDimensions || !canvasRef.current) return;
    let cancelled = false;
    const render = async () => {
      await renderPdfPageToCanvas(pdfBytes, canvasRef.current!, CONTAINER_WIDTH, currentPageIndex + 1);
      if (!cancelled && canvasRef.current) {
        setMagnifierSnapshot(canvasRef.current.toDataURL('image/png'));
      }
    };
    render();
    return () => { cancelled = true; };
  }, [pdfBytes, pdfDimensions, currentPageIndex, CONTAINER_WIDTH]);

  useEffect(() => {
    if (!showPreviewModal || !previewPdfBytes || Platform.OS !== 'web' || !previewCanvasRef.current) return;
    let cancelled = false;
    const renderPreview = async () => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const baseWidth = Math.min(Math.max(BASE_CONTAINER_WIDTH - 34, 360), 560);
      await renderPdfPageToCanvas(
        previewPdfBytes.buffer.slice(
          previewPdfBytes.byteOffset,
          previewPdfBytes.byteOffset + previewPdfBytes.byteLength
        ) as ArrayBuffer,
        canvas,
        baseWidth,
        previewPageIndex + 1
      );
      if (cancelled) return;
      canvas.style.width = `${baseWidth * previewZoom}px`;
      canvas.style.height = 'auto';
      canvas.style.maxWidth = 'none';
      canvas.style.display = 'block';
    };
    renderPreview();
    return () => { cancelled = true; };
  }, [showPreviewModal, previewPdfBytes, previewPageIndex, previewZoom, BASE_CONTAINER_WIDTH]);

  const initSignatureCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    signatureCanvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#0052D4';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const getPos = (e: any) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const startDrawing = (e: any) => {
      isDrawingSignature.current = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e: any) => {
      if (!isDrawingSignature.current) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      isDrawingSignature.current = false;
    };

    canvas.onmousedown = startDrawing;
    canvas.onmousemove = draw;
    canvas.onmouseup = stopDrawing;

    canvas.ontouchstart = startDrawing;
    canvas.ontouchmove = draw;
    canvas.ontouchend = stopDrawing;
  };

  const clearSignatureCanvas = () => {
    if (signatureCanvasRef.current) {
      const ctx = signatureCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
      }
    }
  };

  const placeSignatureElement = (dataUrl: string) => {
    if (!signatureClickPos) return;

    // Store editor geometry as normalized PDF-page coordinates (0..1).
    // This makes the element independent of zoom level and screen size.
    const widthNorm = 120 / CONTAINER_WIDTH;
    const heightNorm = 60 / containerHeight;

    const newElement: EditorElement = {
      id: Date.now().toString(),
      type: 'signature',
      imageUri: dataUrl,
      x: Math.max(0, Math.min(1 - widthNorm, signatureClickPos.x - widthNorm / 2)),
      y: Math.max(0, Math.min(1 - heightNorm, signatureClickPos.y - heightNorm / 2)),
      width: widthNorm,
      height: heightNorm,
      fontSize: defaultFontSize,
      pageIndex: currentPageIndex,
    };

    setElements((prev) => [...prev, newElement]);
    setSelectedElementId(newElement.id);
    setShowSignatureModal(false);
    setSignatureClickPos(null);
  };

  const saveSignatureAndPlace = () => {
    if (!signatureCanvasRef.current || !signatureClickPos) return;
    const dataUrl = signatureCanvasRef.current.toDataURL('image/png');
    placeSignatureElement(dataUrl);
  };

  const handleUploadSignatureImage = async () => {
    if (!signatureClickPos) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'image/jpg'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      let dataUrl = '';

      if (Platform.OS === 'web') {
        const res = await fetch(asset.uri);
        const blob = await res.blob();
        dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } else {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const mime = asset.mimeType || 'image/png';
        dataUrl = `data:${mime};base64,${base64}`;
      }

      placeSignatureElement(dataUrl);
    } catch (err: any) {
      console.error('Signature upload error:', err);
      Alert.alert(t.error, err?.message || t.uploadError);
    }
  };

  const handlePageChange = (newIndex: number) => {
    if (!currentUser && newIndex > 0) {
      if (Platform.OS === 'web') {
        alert(t.guestPageMessage);
        setShowAuthModal(true);
      } else {
        Alert.alert(
          'מגבלת אורח 🔒',
          'משתמשים אורחים יכולים לערוך את עמוד 1 בלבד. הרשם בחינם בשניות כדי לערוך את כל עמודי הקובץ!',
          [
            { text: 'סגור', style: 'cancel' },
            { text: 'הרשם בחינם 🔑', onPress: () => setShowAuthModal(true) },
          ]
        );
      }
      return;
    }
    setMagnifierPos(null);
    setCurrentPageIndex(newIndex);
  };

  const triggerAd = (seconds: number, title: string, message: string, action: 'upload' | 'preview' | 'download') => {
    setAdTitle(title);
    setAdMessage(message);
    setAdTimer(seconds);
    setIsAdFinished(false);
    setPendingAction(action);
    setShowAdModal(true);
  };

  const handleAdFinishedAction = () => {
    setShowAdModal(false);
    if (pendingAction === 'upload') {
      processDocumentUpload();
    } else if (pendingAction === 'preview') {
      executePreviewProcess();
    } else if (pendingAction === 'download') {
      executeFinalDownload();
    }
    setPendingAction(null);
  };

  const pickDocument = async () => {
    if (!currentUser) {
      triggerAd(
        5,
        t.adUploadTitle,
        t.adUploadMessage,
        'upload'
      );
    } else {
      processDocumentUpload();
    }
  };

  const processDocumentUpload = async () => {
    try {
      setLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const uri = result.assets[0].uri;
      setPdfUri(uri);
      setElements([]);
      setActiveInput(null);
      setSelectedElementId(null);
      setZoomScale(1.0);

      // Fetch handles file:// URIs natively and avoids "isn't readable" Android errors
      const res = await fetch(uri);
      const bytes = await res.arrayBuffer();

      setPdfBytes(bytes);

      const { PDFDocument } = await getPdfLib();
      const pdfDoc = await PDFDocument.load(bytes.slice(0));
      const pages = pdfDoc.getPages();
      setNumPages(pages.length);
      setCurrentPageIndex(0);

      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();

      setPdfDimensions({
        width,
        height,
        aspectRatio: width / height,
      });
    } catch (err: any) {
      console.error('Upload Error:', err);
      Alert.alert(t.uploadErrorTitle, err?.message || t.uploadError);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewPdf = () => {
    if (!pdfBytes) return;

    if (!currentUser) {
      triggerAd(
        10,
        t.adPreviewTitle,
        t.adPreviewMessage,
        'preview'
      );
    } else {
      executePreviewProcess();
    }
  };

  const executePreviewProcess = async () => {
    setLoading(true);
    try {
      const watermarkedPdfBytes = await buildModifiedPdfBytes(true);
      if (!watermarkedPdfBytes) return;

      setPreviewPdfBytes(watermarkedPdfBytes);
      setPreviewPageIndex(0);
      setPreviewZoom(1.0);
      setShowPreviewModal(true);
    } catch (error: any) {
      Alert.alert(t.error, error?.message || t.previewError);
    } finally {
      setLoading(false);
    }
  };

  const triggerDownloadProcess = async () => {
    if (!pdfBytes) return;

    if (currentUser) {
      try {
        const res = await fetch(`${API_URL}/api/user/use-edit-credit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (Platform.OS === 'web') {
            alert(data.error || t.quotaReached);
            setShowAuthModal(true);
          } else {
            Alert.alert(
              t.quotaTitle,
              data.error || t.quotaReached,
              [
                { text: 'סגור' },
                { text: t.package10, onPress: () => setShowAuthModal(true) },
              ]
            );
          }
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (currentUser?.plan === 'premium') {
      executeFinalDownload();
    } else {
      triggerAd(
        currentUser ? 8 : 20,
        '💾 מכין קובץ להורדה...',
        currentUser
          ? 'משתמש חינם? צפה בפרסומת קצרה להורדה.'
          : 'אורח יקר, צפה בפרסומת לפתיחת ההורדה. הרשמה חינמית תוריד את זמן ההמתנה!',
        'download'
      );
    }
  };

  const executeFinalDownload = async () => {
    setLoading(true);
    try {
      const pdfResultBytes = await buildModifiedPdfBytes(false);
      if (!pdfResultBytes) return;

      if (Platform.OS === 'web') {
        const blob = new Blob([pdfResultBytes], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `DocFlow_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } else {
        const base64Save = _uint8ArrayToBase64(pdfResultBytes);
        const filePath = `${FileSystem.documentDirectory || ''}DocFlow_${Date.now()}.pdf`;
        await FileSystem.writeAsStringAsync(filePath, base64Save, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Sharing.shareAsync(filePath);
      }

      if (Platform.OS === 'web') {
        alert(t.downloadSuccess + ' 🎉');
      } else {
        Alert.alert(t.downloadSuccessTitle, t.downloadSuccess);
      }
    } catch (error: any) {
      Alert.alert(t.error, error?.message || t.downloadError);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthStep1 = async () => {
    setUserAlreadyExistsError(false);

    if (!authEmail || !authPassword) {
      if (Platform.OS === 'web') alert(t.requiredCredentials);
      else Alert.alert(t.error, t.requiredCredentials);
      return;
    }

    if (authMode === 'register') {
      const defaultName = authEmail.split('@')[0];
      setAuthFullName(defaultName);
      setAuthStep(2);
    } else {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'שגיאה בהתחברות');

        const displayName = data.user.fullName || data.user.full_name || data.user.email;
        const serverLanguage = data.user?.language || data.user?.preferredLanguage || data.user?.preferred_language;
        const resolvedLanguage: Language = ['he', 'en', 'ar', 'am'].includes(serverLanguage) ? serverLanguage : authLanguage;
        setAppLanguage(resolvedLanguage);
        setAuthLanguage(resolvedLanguage);
        setCurrentUser({ ...data.user, language: resolvedLanguage });
        setShowAuthModal(false);

        if (Platform.OS === 'web') {
          alert(`${t.welcome} ${displayName} 👋`);
        } else {
          Alert.alert(t.welcome + ' 👋', `${displayName}`);
        }
      } catch (err: any) {
        if (Platform.OS === 'web') alert(err.message || t.loginError);
        else Alert.alert(t.loginError, err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAuthSubmit = async () => {
    if (!authEmail || !authPassword) {
      if (Platform.OS === 'web') alert(t.requiredCredentials);
      else Alert.alert(t.error, t.requiredCredentials);
      return;
    }

    try {
      setLoading(true);
      const endpoint = authMode === 'register' ? `${API_URL}/api/auth/register` : `${API_URL}/api/auth/login`;
      const bodyData: any = { email: authEmail, password: authPassword };
      if (authMode === 'register') {
        bodyData.fullName = authFullName || 'משתמש חדש';
        bodyData.plan = selectedPlan;
        bodyData.language = authLanguage;
        bodyData.preferredLanguage = authLanguage;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאת אימות נתונים');

      const userObj: User = {
        id: data.user?.id || Date.now(),
        email: data.user?.email || authEmail,
        fullName: data.user?.fullName || data.user?.full_name || authFullName,
        full_name: data.user?.full_name,
        plan: data.user?.plan || selectedPlan || 'free',
        editsCount: data.user?.editsCount || 0,
        passCredits: data.user?.passCredits || 0,
        language: (data.user?.language || data.user?.preferredLanguage || authLanguage) as Language,
        preferredLanguage: (data.user?.preferredLanguage || data.user?.language || authLanguage) as Language,
      };

      setCurrentUser(userObj);
      setShowAuthModal(false);
      setAuthStep(1);
      if (Platform.OS === 'web') alert(authMode === 'register' ? t.successRegister : t.successLogin);
      else Alert.alert(authMode === 'register' ? t.successRegister : t.successLogin, authMode === 'register' ? t.successRegister : t.successLogin);
    } catch (err: any) {
      console.error('Auth error:', err);
      if (Platform.OS === 'web') alert(err.message || t.loginError);
      else Alert.alert(t.loginError, err.message || t.loginError);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalRegister = async () => {
    setUserAlreadyExistsError(false);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
          fullName: authFullName,
          plan: selectedPlan,
          language: authLanguage,
          preferredLanguage: authLanguage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.userExists || (data.error && data.error.includes('קיים'))) {
          setUserAlreadyExistsError(true);
          return;
        }

        if (Platform.OS === 'web') {
          alert(data.error || t.registerError);
        } else {
          Alert.alert(t.error, data.error || t.registerError);
        }
        return;
      }

      const displayName = data.user.fullName || data.user.full_name || authFullName || data.user.email;
      const resolvedLanguage: Language = ['he', 'en', 'ar', 'am'].includes(data.user?.language) ? data.user.language : authLanguage;
      setAppLanguage(resolvedLanguage);
      setAuthLanguage(resolvedLanguage);
      setCurrentUser({ ...data.user, language: resolvedLanguage, preferredLanguage: resolvedLanguage });
      setShowAuthModal(false);
      setAuthStep(1);

      if (Platform.OS === 'web') {
        alert(`${t.successRegister} ${displayName}`);
      } else {
        Alert.alert(t.successRegister, `${t.welcome} ${displayName}!`);
      }
    } catch (err: any) {
      console.error('Register fetch error:', err);
      if (Platform.OS === 'web') {
        alert(err.message || t.serverError);
      } else {
        Alert.alert(t.error, err.message || t.serverError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCanvasClick = (clickX: number, clickY: number) => {
    if (!pdfUri || !pdfDimensions) return;

    // IMPORTANT: clickX/clickY are screen pixels. Convert immediately to
    // normalized page coordinates so zoom can never change the saved position.
    const normX = Math.max(0, Math.min(1, clickX / CONTAINER_WIDTH));
    const normY = Math.max(0, Math.min(1, clickY / containerHeight));

    if (activeTool === 'magnifier') {
      setMagnifierPos({ x: normX, y: normY });
      return;
    }

    if (activeTool === 'text') {
      setActiveInput({ x: normX, y: normY });
    } else if (activeTool === 'signature') {
      setSignatureClickPos({ x: normX, y: normY });
      setShowSignatureModal(true);
    } else {
      const widthNorm = 120 / CONTAINER_WIDTH;
      const heightNorm = 20 / containerHeight;
      const newElement: EditorElement = {
        id: Date.now().toString(),
        type: activeTool,
        x: Math.max(0, Math.min(1 - widthNorm, normX - widthNorm / 2)),
        y: Math.max(0, Math.min(1 - heightNorm, normY - heightNorm / 2)),
        width: widthNorm,
        height: heightNorm,
        fontSize: defaultFontSize,
        pageIndex: currentPageIndex,
      };
      setElements((prev) => [...prev, newElement]);
      setSelectedElementId(newElement.id);
    }
  };

  const handleContainerPress = (e: any) => {
    if (Platform.OS === 'web') {
      const rect = e.currentTarget.getBoundingClientRect();
      handleCanvasClick(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const handleAddTextElement = () => {
    if (!activeInput || !currentText.trim()) {
      setActiveInput(null);
      return;
    }

    const widthNorm = 150 / CONTAINER_WIDTH;
    const heightNorm = 34 / containerHeight;
    const newElement: EditorElement = {
      id: Date.now().toString(),
      type: 'text',
      text: currentText.trim(),
      x: Math.max(0, Math.min(1 - widthNorm, activeInput.x)),
      y: Math.max(0, Math.min(1 - heightNorm, activeInput.y)),
      width: widthNorm,
      height: heightNorm,
      fontSize: defaultFontSize,
      pageIndex: currentPageIndex,
    };

    setElements((prev) => [...prev, newElement]);
    setSelectedElementId(newElement.id);
    setCurrentText('');
    setActiveInput(null);
  };

  const updateElementProps = (id: string, updates: Partial<EditorElement>) => {
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== id) return el;

        const updated = { ...el, ...updates };

        // הגנה ומניעת פריצה מרוחב העמוד עבור width
        if (updates.width !== undefined) {
          const MIN_WIDTH = 0.02; // רוחב מינימלי (2% מרוחב העמוד)
          const MAX_WIDTH = 1 - updated.x; // רוחב מקסימלי שלא חורג מהקצה הימני

          updated.width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, updates.width));
        }

        return updated;
      })
    );
  };

  const nudgeSelected = (dx: number, dy: number) => {
    if (!selectedElement) return;
    // Nudge values are editor pixels; convert them to normalized coordinates.
    const nx = dx / CONTAINER_WIDTH;
    const ny = dy / containerHeight;
    const newX = Math.max(0, Math.min(1 - selectedElement.width, selectedElement.x + nx));
    const newY = Math.max(0, Math.min(1 - selectedElement.height, selectedElement.y + ny));
    updateElementProps(selectedElement.id, { x: newX, y: newY });
  };

  const buildModifiedPdfBytes = async (isPreviewMode: boolean = false): Promise<Uint8Array | null> => {
    if (!pdfBytes || !pdfDimensions) return null;

    const { PDFDocument, rgb } = await getPdfLib();
    const pdfDoc = await PDFDocument.load(pdfBytes.slice(0));
    const pages = pdfDoc.getPages();

    // Elements are stored in normalized page coordinates.
    // Therefore export is independent of zoomScale, browser width and DPR.
    for (const el of elements) {
      const targetPage = pages[el.pageIndex] || pages[0];
      const { width: pageWidth, height: pageHeight } = targetPage.getSize();

      const absX = Math.max(0, el.x * pageWidth);
      const absWidth = Math.max(1, el.width * pageWidth);
      const absHeight = Math.max(1, el.height * pageHeight);
      const absY = Math.max(0, pageHeight - (el.y * pageHeight) - absHeight);

      if (el.type === 'text' && el.text) {
        try {
          // Use renderCrispTextToCanvas universally for both Web and Mobile
          // to completely avoid WinAnsi font encoding errors with Hebrew/Arabic characters.
          const renderedText = await renderCrispTextToCanvas(el.text, el.fontSize);
          if (renderedText.base64Png) {
            const imageBytes = _base64ToArrayBuffer(renderedText.base64Png.replace(/^data:image\/png;base64,/, ''));
            const pngImage = await pdfDoc.embedPng(imageBytes);
            
            const cssPxToPdfPt = 72 / 96;
            const naturalPdfHeight = renderedText.height * cssPxToPdfPt;
            const naturalPdfWidth = renderedText.width * cssPxToPdfPt;
            const fitScale = Math.min(1, absHeight / Math.max(1, naturalPdfHeight));
            const drawHeight = naturalPdfHeight * fitScale;
            const drawWidth = Math.min(absWidth, naturalPdfWidth * fitScale);
            const drawX = absX;
            const drawY = absY + (absHeight - drawHeight) / 2;

            targetPage.drawImage(pngImage, {
              x: drawX,
              y: drawY,
              width: drawWidth,
              height: drawHeight,
            });
          }
        } catch (textErr) {
          console.warn('Text render/draw warning:', textErr);
        }
      } else if (el.type === 'signature' && el.imageUri) {
        const match = el.imageUri.match(/^data:image\/([^;]+);base64,(.+)$/);
        const base64Clean = match ? match[2] : el.imageUri;
        const imageBytes = _base64ToArrayBuffer(base64Clean);
        let pdfImage;
        if (el.imageUri.includes('image/jpeg') || el.imageUri.includes('image/jpg')) {
          pdfImage = await pdfDoc.embedJpg(imageBytes);
        } else {
          pdfImage = await pdfDoc.embedPng(imageBytes);
        }
        targetPage.drawImage(pdfImage, {
          x: absX,
          y: absY,
          width: absWidth,
          height: absHeight,
        });
      } else if (el.type === 'highlight' || el.type === 'redact') {
        targetPage.drawRectangle({
          x: absX,
          y: absY,
          width: absWidth,
          height: absHeight,
          color: el.type === 'redact' ? rgb(0, 0, 0) : rgb(1, 0.92, 0.2),
          ...(el.type === 'highlight' ? { opacity: 0.5 } : {}),
        });
      }
    }

    return await pdfDoc.save();
  };

  const renderPaginationBar = () => {
    if (numPages <= 1) return null;

    return (
      <View style={styles.paginationRow}>
        <TouchableOpacity
          style={[styles.pageBtn, currentPageIndex === 0 && styles.disabledBtn]}
          disabled={currentPageIndex === 0}
          onPress={() => handlePageChange(Math.max(0, currentPageIndex - 1))}
        >
          <Text style={styles.pageBtnText}>{t.prevPage}</Text>
        </TouchableOpacity>

        <View style={styles.pageBadgeTextContainer}>
          <Text style={styles.pageIndicatorText}>
            {t.pageOf.replace('{current}', (currentPageIndex + 1).toString()).replace('{total}', numPages.toString())}
            {!currentUser ? ` ${t.guestPageLimit}` : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.pageBtn, (currentPageIndex === numPages - 1 || !currentUser) && styles.disabledBtn]}
          onPress={() => handlePageChange(Math.min(numPages - 1, currentPageIndex + 1))}
        >
          <Text style={styles.pageBtnText}>{t.nextPage}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar backgroundColor="#0f172a" barStyle="light-content" translucent={false} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          scrollEnabled={isScrollEnabled}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.headerBar, { maxWidth: BASE_CONTAINER_WIDTH }]}>
            <DocFlowLogo />

            {currentUser ? (
              <View style={styles.userInfoRowV1}>
                <TouchableOpacity
                  style={styles.accountTriggerBtnV1}
                  onPress={() => setShowAccountModal(true)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.accountTriggerIconV1}>👤</Text>
                  <Text style={styles.userNameTextV1} numberOfLines={1}>
                    {currentUser.fullName || currentUser.full_name || currentUser.email}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.guestHeaderActionsV1}>
                <TouchableOpacity
                  style={styles.authTriggerBtnV1}
                  onPress={() => {
                    setAuthStep(1);
                    setAuthMode('register');
                    setAuthLanguage(lang);
                    setUserAlreadyExistsError(false);
                    setShowAuthModal(true);
                  }}
                >
                  <Text style={styles.authTriggerBtnTextV1}>{t.loginRegister}</Text>
                </TouchableOpacity>
                <View style={styles.langBar}>
                  {(['he', 'en', 'ar', 'am'] as Language[]).map((l) => (
                    <TouchableOpacity key={l} onPress={() => { setAppLanguage(l); setAuthLanguage(l); }} style={[styles.langBtn, lang === l && styles.activeLangBtn]}>
                      <Text style={[styles.langText, lang === l && styles.activeLangText]}>
                        {l === 'he' ? 'עב' : l === 'ar' ? 'عرب' : l === 'am' ? 'አማ' : 'EN'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {!currentUser && (
            <View style={[styles.topAdBannerSlot, { maxWidth: BASE_CONTAINER_WIDTH }]}>
              <Text style={styles.adSlotLabel}>Sponsored</Text>
              <Text style={styles.topAdBannerText}>⚡ {t.guestNotice}</Text>
            </View>
          )}

          {!pdfUri ? (
            <View style={[styles.heroLandingCard, { maxWidth: BASE_CONTAINER_WIDTH }]}>
              <Text style={styles.heroTitle}>{t.heroTitle}</Text>
              <Text style={styles.heroSubtitle}>{t.heroSubtitle}</Text>

              <TouchableOpacity style={styles.heroUploadBtn} onPress={pickDocument} disabled={loading}>
                <Text style={styles.heroUploadBtnText}>{t.uploadPdf}</Text>
              </TouchableOpacity>

              <View style={styles.featureGrid}>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>✍️</Text>
                  <Text style={styles.featureTitle}>{t.textTool}</Text>
                  <Text style={styles.featureDesc}>{t.textToolDesc}</Text>
                </View>

                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>🖋️</Text>
                  <Text style={styles.featureTitle}>{t.signatureTool}</Text>
                  <Text style={styles.featureDesc}>{t.signatureToolDesc}</Text>
                </View>

                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>⬛</Text>
                  <Text style={styles.featureTitle}>{t.redactTool}</Text>
                  <Text style={styles.featureDesc}>{t.redactToolDesc}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.editorArea, { maxWidth: BASE_CONTAINER_WIDTH }]}>
              <TouchableOpacity style={styles.changeFileBtn} onPress={pickDocument} disabled={loading}>
                <Text style={styles.changeFileBtnText}>{t.changePdf}</Text>
              </TouchableOpacity>

              <View style={styles.toolbarRow}>
                <TouchableOpacity
                  style={[styles.toolBtn, activeTool === 'text' && styles.activeToolBtn]}
                  onPress={() => setActiveTool('text')}
                >
                  <Text style={[styles.toolBtnText, activeTool === 'text' && styles.activeToolBtnText]}>{t.textTool}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolBtn, activeTool === 'signature' && styles.activeToolBtn]}
                  onPress={() => setActiveTool('signature')}
                >
                  <Text style={[styles.toolBtnText, activeTool === 'signature' && styles.activeToolBtnText]}>{t.signatureTool}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolBtn, activeTool === 'highlight' && styles.activeToolBtn]}
                  onPress={() => setActiveTool('highlight')}
                >
                  <Text style={[styles.toolBtnText, activeTool === 'highlight' && styles.activeToolBtnText]}>{t.highlightTool}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolBtn, activeTool === 'redact' && styles.activeToolBtn]}
                  onPress={() => setActiveTool('redact')}
                >
                  <Text style={[styles.toolBtnText, activeTool === 'redact' && styles.activeToolBtnText]}>{t.redactTool}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolBtn, activeTool === 'magnifier' && styles.activeToolBtn]}
                  onPress={() => setActiveTool('magnifier')}
                >
                  <Text style={[styles.toolBtnText, activeTool === 'magnifier' && styles.activeToolBtnText]}>{t.magnifierTool}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.zoomControlRow}>
                <TouchableOpacity style={styles.zoomBtn} onPress={() => setZoomScale((prev) => Math.max(0.5, prev - 0.2))}>
                  <Text style={styles.zoomBtnText}>🔍 -</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.zoomResetBtn} onPress={() => setZoomScale(1.0)}>
                  <Text style={styles.zoomResetText}>{Math.round(zoomScale * 100)}%</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.zoomBtn} onPress={() => setZoomScale((prev) => Math.min(2.5, prev + 0.2))}>
                  <Text style={styles.zoomBtnText}>🔍 +</Text>
                </TouchableOpacity>

                <View style={styles.fontDefaultControl}>
                  <TouchableOpacity onPress={() => setDefaultFontSize((prev) => Math.max(10, prev - 2))}>
                    <Text style={styles.fontBtnText}>A-</Text>
                  </TouchableOpacity>
                  <Text style={styles.fontSizeLabel}>{defaultFontSize}px</Text>
                  <TouchableOpacity onPress={() => setDefaultFontSize((prev) => Math.min(40, prev + 2))}>
                    <Text style={styles.fontBtnText}>A+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {selectedElement && (
                <View style={styles.selectedElementControlDock}>
                  <View style={styles.dockHeaderRow}>
                    <Text style={styles.dockTitle} numberOfLines={1}>
                      {selectedElement.type === 'text' ? `✍️ "${selectedElement.text}"` : t.selectedElement}
                    </Text>
                    <TouchableOpacity style={styles.dockCloseBtn} onPress={() => setSelectedElementId(null)}>
                      <Text style={styles.dockCloseText}>{t.finish}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dockControlsRow}>
                    <View style={styles.dockGroup}>
                      <Text style={styles.dockGroupLabel}>{t.position}</Text>
                      <TouchableOpacity style={styles.nudgeBtn} onPress={() => nudgeSelected(0, -3)}><Text style={styles.nudgeText}>▲</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.nudgeBtn} onPress={() => nudgeSelected(0, 3)}><Text style={styles.nudgeText}>▼</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.nudgeBtn} onPress={() => nudgeSelected(-3, 0)}><Text style={styles.nudgeText}>◄</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.nudgeBtn} onPress={() => nudgeSelected(3, 0)}><Text style={styles.nudgeText}>►</Text></TouchableOpacity>
                    </View>

                    {selectedElement.type === 'text' ? (
                      <View style={styles.dockGroup}>
                        <Text style={styles.dockGroupLabel}>{t.font}</Text>
                        <TouchableOpacity style={styles.nudgeBtn} onPress={() => updateElementProps(selectedElement.id, { fontSize: Math.max(10, selectedElement.fontSize - 2) })}>
                          <Text style={styles.nudgeText}>A-</Text>
                        </TouchableOpacity>
                        <Text style={styles.fontSizeBadge}>{selectedElement.fontSize}px</Text>
                        <TouchableOpacity style={styles.nudgeBtn} onPress={() => updateElementProps(selectedElement.id, { fontSize: Math.min(40, selectedElement.fontSize + 2) })}>
                          <Text style={styles.nudgeText}>A+</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.dockGroup}>
                      <TouchableOpacity style={styles.nudgeBtn}
                        onPress={() => {
                          if (selectedElement) {
                            updateElementProps(selectedElement.id, {
                              width: selectedElement.width + 0.05, // מוסיף 5% מרוחב העמוד
                            });
                          }
                        }}
                      >
                      <Text style={styles.nudgeText}>{t.wide}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.nudgeBtn}
                        onPress={() => {
                          if (selectedElement) {
                            updateElementProps(selectedElement.id, {
                              width: selectedElement.width - 0.05, // מוריד 5% מרוחב העמוד
                            });
                          }
                        }}
                      >
                      <Text style={styles.nudgeText}>{t.narrow}</Text>
                      </TouchableOpacity>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.dockDeleteBtn}
                      onPress={() => {
                        setElements((prev) => prev.filter((e) => e.id !== selectedElement.id));
                        setSelectedElementId(null);
                      }}
                    >
                      <Text style={styles.dockDeleteText}>{t.delete}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {renderPaginationBar()}

              <ScrollView
                horizontal
                scrollEnabled={isScrollEnabled}
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{ alignItems: 'center' }}
                style={{ width: '100%' }}
              >
                <View style={[styles.pdfViewerContainer, { width: CONTAINER_WIDTH, height: containerHeight }]}>
                  {Platform.OS === 'web' ? (
                    <canvas
                      ref={canvasRef}
                      style={{ width: CONTAINER_WIDTH, height: containerHeight, display: 'block' }}
                    />
                  ) : (
                    pdfBytes && (
                      <WebView
                        originWhitelist={['*']}
                        onMessage={(event) => {
                          try {
                            const data = JSON.parse(event.nativeEvent.data);
                            if (data.type === 'click') {
                              handleCanvasClick(data.x, data.y);
                            }
                          } catch (e) {
                            console.error('WebView message error:', e);
                          }
                        }}
                        source={{
                          html: `
                            <!DOCTYPE html>
                            <html>
                              <head>
                                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
                                <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
                                <style>
                                  * { box-sizing: border-box; }
                                  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #ffffff; overflow: hidden; display: flex; justify-content: center; align-items: center; }
                                  #canvas-container { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; position: relative; }
                                  canvas { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
                                </style>
                              </head>
                              <body>
                                <div id="canvas-container">
                                  <canvas id="pdf-canvas"></canvas>
                                </div>
                                <script>
                                  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                                  const base64Data = "${_uint8ArrayToBase64(new Uint8Array(pdfBytes))}";
                                  const raw = window.atob(base64Data);
                                  const rawLength = raw.length;
                                  const array = new Uint8Array(new ArrayBuffer(rawLength));
                                  for(let i = 0; i < rawLength; i++) {
                                    array[i] = raw.charCodeAt(i);
                                  }

                                  pdfjsLib.getDocument({ data: array }).promise.then(pdf => {
                                    pdf.getPage(${currentPageIndex + 1}).then(page => {
                                      const canvas = document.getElementById('pdf-canvas');
                                      const context = canvas.getContext('2d');
                                      const viewport = page.getViewport({ scale: 1.0 });

                                      const scale = (${CONTAINER_WIDTH} / viewport.width);
                                      const scaledViewport = page.getViewport({ scale: scale * 2.0 });

                                      canvas.width = scaledViewport.width;
                                      canvas.height = scaledViewport.height;
                                      page.render({ canvasContext: context, viewport: scaledViewport });
                                    });
                                  });

                                  document.getElementById('canvas-container').addEventListener('click', function(e) {
                                    const rect = this.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const y = e.clientY - rect.top;
                                    if (window.ReactNativeWebView) {
                                      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'click', x: x, y: y }));
                                    }
                                  });
                                </script>
                              </body>
                            </html>
                          `
                        }}
                        style={{ width: CONTAINER_WIDTH, height: containerHeight, backgroundColor: 'transparent' }}
                        scrollEnabled={false}
                      />
                    )
                  )}

                  {Platform.OS === 'web' ? (
                    <div
                      onClick={handleContainerPress}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 1,
                        cursor: activeTool === 'text' || activeTool === 'magnifier' || activeTool === 'signature' ? 'crosshair' : 'default',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                      } as any}
                    />
                  ) : (
                    <Pressable
                      style={StyleSheet.absoluteFillObject}
                      onPress={() => setSelectedElementId(null)}
                    />
                  )}

                  {elements
                    .filter((el) => el.pageIndex === currentPageIndex)
                    .map((el) => (
                      <DraggableItem
                        key={el.id}
                        element={el}
                        isSelected={selectedElementId === el.id}
                        onSelect={() => setSelectedElementId(el.id)}
                        containerBounds={{ width: CONTAINER_WIDTH, height: containerHeight }}
                        onUpdatePos={(id, x, y) => {
                          setElements((prev) => prev.map((item) => (item.id === id ? { ...item, x, y } : item)));
                        }}
                        onDragStart={() => setIsScrollEnabled(false)}
                        onDragEnd={() => setIsScrollEnabled(true)}
                      />
                    ))}

                  {Platform.OS === 'web' && activeTool === 'magnifier' && magnifierPos && magnifierSnapshot && (
                    <View
                      pointerEvents="box-none"
                      style={{
                        position: 'absolute',
                        left: Math.min(Math.max(10, magnifierPos.x * CONTAINER_WIDTH - 160), Math.max(10, CONTAINER_WIDTH - 330)),
                        top: Math.min(Math.max(10, magnifierPos.y * containerHeight - 85), Math.max(10, containerHeight - 180)),
                        width: 320,
                        height: 170,
                        overflow: 'hidden',
                        borderRadius: 8,
                        borderWidth: 3,
                        borderColor: '#0052D4',
                        backgroundColor: '#fff',
                        zIndex: 50,
                        elevation: 12,
                      }}
                    >
                      <Image
                        source={{ uri: magnifierSnapshot }}
                        resizeMode="stretch"
                        style={{
                          position: 'absolute',
                          left: -(magnifierPos.x * CONTAINER_WIDTH * magZoom - 160),
                          top: -(magnifierPos.y * containerHeight * magZoom - 85),
                          width: CONTAINER_WIDTH * magZoom,
                          height: containerHeight * magZoom,
                        }}
                      />
                      <TouchableOpacity
                        style={{ position: 'absolute', right: 6, bottom: 6, backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3 }}
                        onPress={() => setMagnifierPos(null)}
                      >
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>

              <View style={{ marginTop: 12, width: '100%' }}>
                {renderPaginationBar()}
              </View>

              <View style={styles.actionButtonsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.previewBtn]} onPress={handlePreviewPdf} disabled={loading}>
                  <Text style={styles.buttonText}>{t.preview}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, styles.downloadBtn]} onPress={triggerDownloadProcess} disabled={loading}>
                  <Text style={styles.buttonText}>{t.download}</Text>
                </TouchableOpacity>
              </View>

              {loading && <ActivityIndicator size="large" color="#0052D4" style={{ marginTop: 15 }} />}
            </View>
          )}

          <Modal visible={!!activeInput} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { maxWidth: 400 }]}>
                <Text style={styles.modalTitle}>{t.addTextTitle}</Text>
                <Text style={styles.modalSubtitle}>{t.addTextHint}</Text>

                <TextInput
                  style={styles.promptTextInput}
                  placeholder="הקלד כאן..."
                  value={currentText}
                  onChangeText={setCurrentText}
                  multiline
                  autoFocus
                />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 15, width: '100%' }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#cbd5e1', flex: 1 }]}
                    onPress={() => {
                      setActiveInput(null);
                      setCurrentText('');
                    }}
                  >
                    <Text style={{ color: '#1e293b', fontWeight: 'bold', textAlign: 'center' }}>{t.close}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#0052D4', flex: 2 }]}
                    onPress={handleAddTextElement}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>{t.addToDocument}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* 🖋️ Modal פד חתימה והעלאת תמונה */}
          <Modal visible={showSignatureModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { maxWidth: 450 }]}>
                <Text style={styles.modalTitle}>{t.signModalTitle}</Text>

                {/* כפתור העלאת קובץ תמונה לחתימה */}
                <TouchableOpacity style={styles.uploadSigFileBtn} onPress={handleUploadSignatureImage}>
                  <Text style={styles.uploadSigFileBtnText}>{t.uploadSigImage}</Text>
                </TouchableOpacity>

                <Text style={styles.modalSubtitle}>{t.orDrawBelow}</Text>

                {Platform.OS === 'web' ? (
                  <canvas
                    ref={initSignatureCanvas}
                    width={320}
                    height={140}
                    style={styles.signatureCanvasBox}
                  />
                ) : (
                  <View style={[styles.signatureCanvasBox, { width: 320, height: 140, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text>{t.mobileSignaturePad}</Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 15, width: '100%' }}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#cbd5e1', flex: 1 }]} onPress={clearSignatureCanvas}>
                    <Text style={{ color: '#1e293b', fontWeight: 'bold', textAlign: 'center' }}>{t.clear}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#16a34a', flex: 2 }]} onPress={saveSignatureAndPlace}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>{t.confirmSignature}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.modalCancelBtn, { marginTop: 10 }]} onPress={() => setShowSignatureModal(false)}>
                  <Text style={styles.modalCancelBtnText}>{t.close}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal visible={showAdModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>{adTitle}</Text>
                <Text style={styles.modalSubtitle}>{adMessage}</Text>

                <View style={styles.adBannerBox}>
                  <Text style={styles.adPlaceholderText}>{t.adArea}</Text>
                </View>

                {!isAdFinished ? (
                  <View style={styles.timerBox}>
                    <ActivityIndicator size="small" color="#0052D4" />
                    <Text style={styles.timerText}>{t.availableIn} <Text style={styles.timerCount}>{adTimer}</Text> {t.seconds}</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.modalDownloadBtn} onPress={handleAdFinishedAction}>
                    <Text style={styles.modalDownloadBtnText}>{t.continueNow}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAdModal(false)}>
                  <Text style={styles.modalCancelBtnText}>{t.close}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Personal Area - registered users only */}
          <Modal visible={showAccountModal && !!currentUser} transparent animationType="fade" onRequestClose={() => setShowAccountModal(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.accountModalV1}>
                <View style={styles.accountModalHeaderV1}>
                  <View>
                    <Text style={styles.accountModalTitleV1}>👤 {t.personalArea}</Text>
                    <Text style={styles.accountModalNameV1}>
                      {currentUser?.fullName || currentUser?.full_name || currentUser?.email}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.accountModalCloseIconV1} onPress={() => setShowAccountModal(false)}>
                    <Text style={styles.accountModalCloseIconTextV1}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.accountInfoBoxV1}>
                  <Text style={styles.accountInfoLabelV1}>{t.accountEmail}</Text>
                  <Text style={styles.accountInfoValueV1}>{currentUser?.email}</Text>
                  <Text style={[styles.accountInfoLabelV1, { marginTop: 8 }]}>{t.accountPlan}</Text>
                  <Text style={styles.accountInfoValueV1}>{currentUser?.plan === 'free' ? t.accountPlanFree : currentUser?.plan || t.accountPlanFree}</Text>
                </View>

                <View style={styles.accountLanguageSectionV1}>
                  <Text style={styles.accountLanguageTitleV1}>🌐 {t.changeLanguage}</Text>
                  <View style={styles.accountLanguageRowV1}>
                    {(['he', 'en', 'ar', 'am'] as Language[]).map((l) => (
                      <TouchableOpacity
                        key={l}
                        style={[styles.accountLanguageBtnV1, lang === l && styles.accountLanguageBtnActiveV1]}
                        onPress={() => {
                          setAppLanguage(l);
                          setAuthLanguage(l);
                          setCurrentUser((prev) => prev ? { ...prev, language: l, preferredLanguage: l } : prev);
                        }}
                      >
                        <Text style={[styles.accountLanguageTextV1, lang === l && styles.accountLanguageTextActiveV1]}>
                          {l === 'he' ? 'עברית' : l === 'en' ? 'English' : l === 'ar' ? 'العربية' : 'አማርኛ'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.accountLogoutBtnV1}
                  onPress={() => {
                    setShowAccountModal(false);
                    setCurrentUser(null);
                  }}
                >
                  <Text style={styles.accountLogoutTextV1}>{t.logout}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.accountCloseBtnV1} onPress={() => setShowAccountModal(false)}>
                  <Text style={styles.accountCloseTextV1}>{t.close}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* V1-style authentication modal: cleaner two-step login/register flow */}
          <Modal visible={showAuthModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.authModalV1}>
                <Text style={styles.authModalTitle}>
                  🔑 {authMode === 'register' ? t.register : t.login}
                </Text>

                {authStep === 1 ? (
                  <View style={{ width: '100%' }}>
                    {authMode === 'register' && (
                      <TextInput
                        style={styles.authInputV1}
                        placeholder={t.fullNamePlaceholder}
                        placeholderTextColor="#94A3B8"
                        value={authFullName}
                        onChangeText={setAuthFullName}
                      />
                    )}

                    <TextInput
                      style={styles.authInputV1}
                      placeholder={t.emailPlaceholder}
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={authEmail}
                      onChangeText={(value) => {
                        setAuthEmail(value);
                        setUserAlreadyExistsError(false);
                      }}
                    />

                    <TextInput
                      style={styles.authInputV1}
                      placeholder={t.passwordPlaceholder}
                      placeholderTextColor="#94A3B8"
                      secureTextEntry
                      value={authPassword}
                      onChangeText={setAuthPassword}
                    />

                    {authMode === 'register' && (
                      <View style={styles.authLanguageSectionV1}>
                        <Text style={styles.authLanguageLabelV1}>{t.accountLanguageLabel}</Text>
                        <View style={styles.authLanguageRowV1}>
                          {(['he', 'en', 'ar', 'am'] as Language[]).map((l) => (
                            <TouchableOpacity
                              key={l}
                              style={[styles.authLanguageBtnV1, authLanguage === l && styles.authLanguageBtnActiveV1]}
                              onPress={() => { setAuthLanguage(l); setAppLanguage(l); }}
                            >
                              <Text style={[styles.authLanguageTextV1, authLanguage === l && styles.authLanguageTextActiveV1]}>
                                {l === 'he' ? 'עברית' : l === 'en' ? 'English' : l === 'ar' ? 'العربية' : 'አማርኛ'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {userAlreadyExistsError && (
                      <View style={styles.userExistsWarningBox}>
                        <Text style={styles.warningTitle}>{t.userAlreadyExists}</Text>
                        <Text style={styles.warningText}>{t.userAlreadyExistsHint}</Text>
                        <TouchableOpacity
                          style={styles.switchLoginBtn}
                          onPress={() => {
                            setAuthMode('login');
                            setAuthStep(1);
                            setUserAlreadyExistsError(false);
                          }}
                        >
                          <Text style={styles.switchLoginBtnText}>{t.goToLogin}</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {authMode === 'register' ? (
                      <TouchableOpacity style={styles.primaryButtonWideV1} onPress={handleAuthStep1}>
                        <Text style={styles.primaryButtonText}>{t.continueToPlan}</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.primaryButtonWideV1} onPress={handleAuthStep1}>
                        <Text style={styles.primaryButtonText}>{t.login}</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.switchAuthModeBtnV1}
                      onPress={() => {
                        setAuthStep(1);
                        setUserAlreadyExistsError(false);
                        setAuthMode(authMode === 'register' ? 'login' : 'register');
                      }}
                    >
                      <Text style={styles.switchAuthModeTextV1}>
                        {authMode === 'register' ? t.alreadyRegistered : t.noAccountYet}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ width: '100%', alignItems: 'center' }}>
                    <Text style={styles.authSectionTitleV1}>{t.selectPlanTitle}</Text>
                    <View style={styles.plansRowV1}>
                      <TouchableOpacity
                        style={[styles.planCardV1, selectedPlan === 'free' && styles.planCardActiveV1]}
                        onPress={() => setSelectedPlan('free')}
                      >
                        <Text style={styles.planTitleV1}>{t.basicPlan}</Text>
                        <Text style={styles.planDescV1}>{t.basicPlanDesc}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.planCardV1, selectedPlan === 'micro_pass' && styles.planCardActiveV1]}
                        onPress={() => setSelectedPlan('micro_pass')}
                      >
                        <Text style={styles.planTitleV1}>{t.passPlan}</Text>
                        <Text style={styles.planDescV1}>{t.passPlanDesc}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.planCardV1, selectedPlan === 'premium' && styles.planCardActiveV1]}
                        onPress={() => setSelectedPlan('premium')}
                      >
                        <Text style={styles.planTitleV1}>{t.premiumPlan}</Text>
                        <Text style={styles.planDescV1}>{t.premiumPlanDesc}</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.primaryButtonWideV1} onPress={handleAuthSubmit}>
                      <Text style={styles.primaryButtonText}>{t.finishRegister}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.backAuthBtnV1} onPress={() => setAuthStep(1)}>
                      <Text style={styles.switchAuthModeTextV1}>{t.back}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity style={styles.closeAuthBtnV1} onPress={() => setShowAuthModal(false)}>
                  <Text style={styles.modalCancelBtnText}>{t.close}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Modal visible={showPreviewModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { maxWidth: 680, width: '96%', height: '90%' }]}>
                <Text style={styles.modalTitle}>{t.preview}</Text>
                <Text style={styles.modalSubtitle}>{t.readOnlyPreview}</Text>

                <View style={styles.previewZoomToolbar}>
                  <TouchableOpacity style={styles.previewZoomBtn} onPress={() => setPreviewZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(1))))}>
                    <Text style={styles.previewZoomBtnText}>−</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.previewZoomResetBtn} onPress={() => setPreviewZoom(1.0)}>
                    <Text style={styles.previewZoomResetText}>{Math.round(previewZoom * 100)}%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.previewZoomBtn} onPress={() => setPreviewZoom((z) => Math.min(3.0, Number((z + 0.2).toFixed(1))))}>
                    <Text style={styles.previewZoomBtnText}>+</Text>
                  </TouchableOpacity>
                  <Text style={styles.previewReadOnlyLabel}>{t.readOnlyLabel}</Text>
                </View>

                <View style={[styles.previewImageContainer, { flex: 1, width: '100%', alignItems: 'flex-start', justifyContent: 'flex-start' }]}>
                  {previewPdfBytes && Platform.OS === 'web' ? (
                    <ScrollView
                      style={{ width: '100%', height: '100%' }}
                      contentContainerStyle={{ alignItems: 'center', padding: 16 }}
                      maximumZoomScale={3}
                      minimumZoomScale={0.6}
                      scrollEnabled
                    >
                      <canvas
                        ref={previewCanvasRef}
                        style={{ display: 'block' } as any}
                      />
                    </ScrollView>
                  ) : previewPdfBytes ? (
                    <WebView
                      originWhitelist={['*']}
                      source={{
                        html: `
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                              <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
                              <style>
                                * { box-sizing: border-box; }
                                html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#fff; display:flex; align-items:center; justify-content:center; }
                                canvas { max-width:100%; max-height:100%; object-fit:contain; display:block; }
                              </style>
                            </head>
                            <body>
                              <canvas id="preview-canvas"></canvas>
                              <script>
                                pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                                const base64Data="${_uint8ArrayToBase64(previewPdfBytes)}";
                                const raw=window.atob(base64Data);
                                const array=new Uint8Array(raw.length);
                                for(let i=0;i<raw.length;i++) array[i]=raw.charCodeAt(i);
                                pdfjsLib.getDocument({data:array}).promise.then(pdf=>pdf.getPage(${previewPageIndex + 1}).then(page=>{
                                  const canvas=document.getElementById('preview-canvas');
                                  const ctx=canvas.getContext('2d');
                                  const base=page.getViewport({scale:1});
                                  const scale=Math.min((window.innerWidth-20)/base.width,(window.innerHeight-20)/base.height);
                                  const viewport=page.getViewport({scale:Math.max(0.5,scale)});
                                  canvas.width=viewport.width; canvas.height=viewport.height;
                                  page.render({canvasContext:ctx,viewport});
                                }));
                              </script>
                            </body>
                          </html>
                        `
                      }}
                      style={{ width: '100%', flex: 1 }}
                      scrollEnabled={false}
                    />
                  ) : null}
                </View>

                {numPages > 1 && (
                  <View style={[styles.paginationRow, { marginTop: 10, marginBottom: 0 }]}>
                    <TouchableOpacity
                      style={[styles.pageBtn, previewPageIndex === 0 && styles.disabledBtn]}
                      disabled={previewPageIndex === 0}
                      onPress={() => setPreviewPageIndex((p) => Math.max(0, p - 1))}
                    >
                      <Text style={styles.pageBtnText}>{t.prevPage}</Text>
                    </TouchableOpacity>
                    <Text style={styles.pageIndicatorText}>{t.pageOf.replace('{current}', String(previewPageIndex + 1)).replace('{total}', String(numPages))}</Text>
                    <TouchableOpacity
                      style={[styles.pageBtn, previewPageIndex === numPages - 1 && styles.disabledBtn]}
                      disabled={previewPageIndex === numPages - 1}
                      onPress={() => setPreviewPageIndex((p) => Math.min(numPages - 1, p + 1))}
                    >
                      <Text style={styles.pageBtnText}>{t.nextPage}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.modalCancelBtn, { marginTop: 10 }]}
                  onPress={() => setShowPreviewModal(false)}
                >
                  <Text style={styles.modalCancelBtnText}>{t.close}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function DraggableItem({
  element,
  isSelected,
  onSelect,
  containerBounds,
  onUpdatePos,
  onDragStart,
  onDragEnd,
}: {
  element: EditorElement;
  isSelected: boolean;
  onSelect: () => void;
  containerBounds: { width: number; height: number };
  onUpdatePos: (id: string, x: number, y: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const elementRef = useRef(element);
  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    elementRef.current = element;
  }, [element]);

  // V1-style web dragging: the cursor changes to move, selection is blocked,
  // and movement is calculated from the document container rather than the
  // current zoom. Because element coordinates are normalized, zoom cannot
  // change the stored position.
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      const current = elementRef.current;
      if (!drag) return;

      const dx = (e.clientX - drag.startClientX) / containerBounds.width;
      const dy = (e.clientY - drag.startClientY) / containerBounds.height;
      const newX = Math.max(0, Math.min(1 - drag.width, drag.startX + dx));
      const newY = Math.max(0, Math.min(1 - drag.height, drag.startY + dy));
      onUpdatePos(current.id, newX, newY);
    };

    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      onDragEnd?.();
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [containerBounds.width, containerBounds.height, onUpdatePos, onDragEnd]);

  const startWebDrag = (e: any) => {
    if (Platform.OS !== 'web') return;
    e.preventDefault?.();
    e.stopPropagation?.();
    const current = elementRef.current;
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: current.x,
      startY: current.y,
      width: current.width,
      height: current.height,
    };
    onSelect();
    onDragStart?.();
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => Platform.OS !== 'web',
      onMoveShouldSetPanResponder: () => Platform.OS !== 'web',
      onPanResponderGrant: () => {
        const current = elementRef.current;
        onSelect();
        dragRef.current = {
          startClientX: 0,
          startClientY: 0,
          startX: current.x,
          startY: current.y,
          width: current.width,
          height: current.height,
        };
        onDragStart?.();
      },
      onPanResponderMove: (_, gestureState) => {
        if (Platform.OS === 'web') return;
        const current = elementRef.current;
        const newX = Math.max(0, Math.min(1 - current.width, (dragRef.current?.startX ?? current.x) + gestureState.dx / containerBounds.width));
        const newY = Math.max(0, Math.min(1 - current.height, (dragRef.current?.startY ?? current.y) + gestureState.dy / containerBounds.height));
        onUpdatePos(current.id, newX, newY);
      },
      onPanResponderRelease: () => {
        dragRef.current = null;
        onDragEnd?.();
      },
      onPanResponderTerminate: () => {
        dragRef.current = null;
        onDragEnd?.();
      },
    })
  ).current;

  const content = (
    <>
      {element.type === 'text' && (
        <Text
          style={[
            styles.overlayText,
            {
              fontSize: element.fontSize,
              lineHeight: Math.ceil(element.fontSize * 1.25),
              textAlign: 'left',
            },
          ]}
          numberOfLines={1}
        >
          {element.text}
        </Text>
      )}

      {element.type === 'signature' && element.imageUri && (
        <Image source={{ uri: element.imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      )}

      {element.type === 'highlight' && <View style={[styles.highlightBox, { width: '100%', height: '100%' }]} />}
      {element.type === 'redact' && <View style={[styles.redactBox, { width: '100%', height: '100%' }]} />}
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <div
        onMouseDown={startWebDrag}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        style={{
          position: 'absolute',
          left: `${element.x * 100}%`,
          top: `${element.y * 100}%`,
          width: `${element.width * 100}%`,
          height: `${element.height * 100}%`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          border: isSelected ? '2px dashed #0052D4' : '1px solid transparent',
          background: element.type === 'highlight' ? 'rgba(255,235,50,0.35)' : element.type === 'redact' ? '#000' : 'transparent',
          cursor: dragRef.current ? 'grabbing' : 'move',
          zIndex: isSelected ? 30 : 20,
          userSelect: 'none',
          boxSizing: 'border-box',
          overflow: 'visible',
        }}
      >
        {element.type === 'text' ? (
          <span
            style={{
              fontSize: `${element.fontSize}px`,
              lineHeight: `${Math.ceil(element.fontSize * 1.25)}px`,
              fontWeight: 'bold',
              color: '#000',
              fontFamily: 'Arial, sans-serif',
              whiteSpace: 'nowrap',
              userSelect: 'none',
              pointerEvents: 'none',
              direction: 'auto',
            }}
          >
            {element.text}
          </span>
        ) : element.type === 'signature' && element.imageUri ? (
          <img src={element.imageUri} style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} alt="signature" />
        ) : element.type === 'highlight' ? (
          <div style={{ width: '100%', height: '100%', background: 'rgba(255,235,50,0.35)', pointerEvents: 'none' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#000', pointerEvents: 'none' }} />
        )}
      </div>
    );
  }

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.draggableItemWrapper,
        {
          left: `${element.x * 100}%`,
          top: `${element.y * 100}%`,
          width: `${element.width * 100}%`,
          height: `${element.height * 100}%`,
        },
        isSelected && styles.selectedItemOutline,
      ]}
    >
      {content}
    </View>
  );
}

async function renderPdfPageToCanvas(
  arrayBuffer: ArrayBuffer,
  canvas: HTMLCanvasElement,
  targetWidth: number,
  pageNumber: number = 1
) {
  if (typeof window === 'undefined') return;

  try {
    let pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
    const page = await pdf.getPage(pageNumber);

    const scaleFactor = 2;
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scale = (targetWidth / unscaledViewport.width) * scaleFactor;
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    await page.render({ canvasContext: ctx, viewport }).promise;
  } catch (err) {
    console.error('Error rendering PDF page to canvas:', err);
  }
}

async function renderCrispTextToCanvas(text: string, fontSize: number = 15) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return { base64Png: '', width: 0, height: 0 };
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { base64Png: '', width: 0, height: 0 };

  const dpiScale = 4;
  const fontStyle = `700 ${fontSize}px Arial, sans-serif`;
  ctx.font = fontStyle;
  ctx.direction = /[\u0590-\u05FF]/.test(text) ? 'rtl' : 'ltr';
  ctx.textAlign = 'left';

  const textMetrics = ctx.measureText(text);
  const displayWidth = Math.max(8, Math.ceil(textMetrics.width) + 8);
  const displayHeight = Math.max(20, Math.ceil(fontSize * 1.45));

  canvas.width = displayWidth * dpiScale;
  canvas.height = displayHeight * dpiScale;
  ctx.scale(dpiScale, dpiScale);

  ctx.font = fontStyle;
  ctx.direction = /[\u0590-\u05FF]/.test(text) ? 'rtl' : 'ltr';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000000';
  ctx.fillText(text, 4, displayHeight / 2);

  return { base64Png: canvas.toDataURL('image/png'), width: displayWidth, height: displayHeight };
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    padding: 12,
    paddingTop: 8,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    minHeight: '100%',
  },

  headerBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoBadgeIcon: { backgroundColor: '#0052D4', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 6 },
  logoBadgeText: { color: '#ffffff', fontWeight: '900', fontSize: 10 },
  logoText: { fontSize: 18, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  logoHighlight: { color: '#0052D4' },

  langBar: { flexDirection: 'row', gap: 2, backgroundColor: '#f1f5f9', borderRadius: 8, padding: 2 },
  langBtn: { paddingVertical: 4, paddingHorizontal: 6, borderRadius: 6 },
  activeLangBtn: { backgroundColor: '#0052D4' },
  langText: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },
  activeLangText: { color: '#ffffff' },

  authBtn: { backgroundColor: '#0052D4', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  authBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  userInfoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  userEmailText: { fontSize: 11, fontWeight: 'bold', color: '#1e293b', maxWidth: 100 },
  userPlanBadge: { backgroundColor: '#64748b', color: '#fff', fontSize: 8, fontWeight: 'bold', paddingVertical: 2, paddingHorizontal: 4, borderRadius: 4 },
  paidPlanBadge: { backgroundColor: '#16a34a' },
  logoutText: { color: '#dc2626', fontSize: 10, fontWeight: 'bold' },

  topAdBannerSlot: { width: '100%', backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 10, padding: 8, marginBottom: 12, alignItems: 'center' },
  adSlotLabel: { fontSize: 9, fontWeight: 'bold', color: '#3b82f6', textTransform: 'uppercase', marginBottom: 2, alignSelf: 'flex-start' },
  topAdBannerText: { fontSize: 11, color: '#1e40af', fontWeight: '600', textAlign: 'center' },

  heroLandingCard: { width: '100%', backgroundColor: '#ffffff', borderRadius: 16, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', elevation: 2 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 6 },
  heroSubtitle: { fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 16, lineHeight: 16 },
  heroUploadBtn: { backgroundColor: '#0052D4', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, width: '100%', alignItems: 'center', marginBottom: 18, elevation: 2 },
  heroUploadBtnText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },

  featureGrid: { flexDirection: 'row', gap: 6, width: '100%', flexWrap: 'wrap' },
  featureItem: { flex: 1, minWidth: 90, backgroundColor: '#f8fafc', borderRadius: 10, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  featureIcon: { fontSize: 18, marginBottom: 2 },
  featureTitle: { fontSize: 11, fontWeight: 'bold', color: '#1e293b', marginBottom: 2, textAlign: 'center' },
  featureDesc: { fontSize: 9, color: '#64748b', textAlign: 'center' },

  editorArea: { alignItems: 'center', marginTop: 2, width: '100%' },
  changeFileBtn: { backgroundColor: '#e2e8f0', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, marginBottom: 10 },
  changeFileBtnText: { fontSize: 11, fontWeight: 'bold', color: '#334155' },

  toolbarRow: { flexDirection: 'row', gap: 4, marginBottom: 8, backgroundColor: '#ffffff', padding: 4, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', width: '100%', flexWrap: 'wrap', justifyContent: 'center' },
  toolBtn: { flex: 1, minWidth: 70, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8, backgroundColor: '#f8fafc', alignItems: 'center', borderColor: '#e2e8f0', borderWidth: 1 },
  activeToolBtn: { backgroundColor: '#0052D4', borderColor: '#0052D4' },
  toolBtnText: { fontSize: 11, fontWeight: 'bold', color: '#334155' },
  activeToolBtnText: { color: '#ffffff' },

  zoomControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 8,
    width: '100%',
  },
  zoomBtn: { backgroundColor: '#f1f5f9', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 14 },
  zoomBtnText: { fontSize: 11, fontWeight: 'bold', color: '#1e293b' },
  zoomResetBtn: { paddingHorizontal: 4 },
  zoomResetText: { fontSize: 11, fontWeight: 'bold', color: '#0052D4' },

  fontDefaultControl: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  fontBtnText: { fontSize: 11, fontWeight: 'bold', color: '#0052D4', paddingHorizontal: 4 },
  fontSizeLabel: { fontSize: 10, fontWeight: 'bold', color: '#1e293b' },

  selectedElementControlDock: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#0052D4',
    marginBottom: 10,
    elevation: 3,
  },
  dockHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dockTitle: { fontSize: 12, fontWeight: 'bold', color: '#0f172a', flex: 1 },
  dockCloseBtn: { backgroundColor: '#e2e8f0', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  dockCloseText: { fontSize: 10, fontWeight: 'bold', color: '#334155' },

  dockControlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  dockGroup: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dockGroupLabel: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },

  nudgeBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },
  nudgeText: { fontSize: 11, fontWeight: 'bold', color: '#1e293b' },
  fontSizeBadge: { fontSize: 11, fontWeight: 'bold', color: '#0052D4', paddingHorizontal: 2 },

  dockDeleteBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  dockDeleteText: { color: '#dc2626', fontSize: 11, fontWeight: 'bold' },

  signatureCanvasBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
  },
  uploadSigFileBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadSigFileBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },

  button: { backgroundColor: '#0052D4', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  buttonText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },

  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#cbd5e1', width: '100%' },
  pageBtn: { backgroundColor: '#0052D4', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  disabledBtn: { backgroundColor: '#cbd5e1' },
  pageBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  pageBadgeTextContainer: { backgroundColor: '#f1f5f9', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  pageIndicatorText: { fontSize: 11, fontWeight: 'bold', color: '#1e293b' },

  pdfViewerContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, position: 'relative', overflow: 'hidden' },

draggableItemWrapper: {
    position: 'absolute',
    alignSelf: 'flex-start',
    zIndex: 10,
    padding: 2,
    borderRadius: 4,
    overflow: 'visible',
    userSelect: 'none', // 👈 מונע מהסמן להפוך לסמן הקלדה ומבטל בחירת טקסט בדפדפן
  } as any,
  selectedItemOutline: {
    borderWidth: 1.5,
    borderColor: '#0052D4',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(239, 246, 255, 0.3)',
  },
  overlayText: {
    color: '#000',
    fontWeight: 'bold',
    fontFamily: 'Arial, sans-serif',
    paddingHorizontal: 0,
    margin: 0,
  },
  highlightBox: { backgroundColor: 'rgba(255, 235, 50, 0.45)' },
  redactBox: { backgroundColor: '#000000' },

  promptTextInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    minHeight: 90,
    textAlign: 'right',
    fontSize: 14,
    backgroundColor: '#f8fafc',
    textAlignVertical: 'top',
  },

  actionButtonsRow: { flexDirection: 'row', gap: 8, marginTop: 12, width: '100%' },
  actionBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center' },
  previewBtn: { backgroundColor: '#d97706' },
  downloadBtn: { backgroundColor: '#16a34a' },

  guestHeaderActionsV1: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authTriggerBtnV1: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#BFDBFE' },
  authTriggerBtnTextV1: { color: '#0052D4', fontWeight: 'bold', fontSize: 12 },
  userInfoRowV1: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userNameTextV1: { fontSize: 11, fontWeight: 'bold', color: '#1e293b', maxWidth: 130 },
  logoutBtnV1: { paddingHorizontal: 2 },
  logoutBtnTextV1: { fontSize: 11, color: '#DC2626', fontWeight: 'bold' },
  authLanguageSectionV1: { width: '100%', marginBottom: 10, padding: 9, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  authLanguageLabelV1: { fontSize: 11, fontWeight: '800', color: '#334155', textAlign: 'right', marginBottom: 6 },
  authLanguageRowV1: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5 },
  authLanguageBtnV1: { paddingVertical: 5, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1' },
  authLanguageBtnActiveV1: { backgroundColor: '#0052D4', borderColor: '#0052D4' },
  authLanguageTextV1: { fontSize: 10, fontWeight: '700', color: '#475569' },
  authLanguageTextActiveV1: { color: '#FFFFFF' },

  accountTriggerBtnV1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  accountTriggerIconV1: { fontSize: 13 },
  accountModalV1: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, width: '92%', maxWidth: 460, borderWidth: 1, borderColor: '#e2e8f0', elevation: 10 },
  accountModalHeaderV1: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  accountModalTitleV1: { fontSize: 19, fontWeight: '800', color: '#0f172a' },
  accountModalNameV1: { marginTop: 3, fontSize: 12, color: '#64748b', fontWeight: '600' },
  accountModalCloseIconV1: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  accountModalCloseIconTextV1: { fontSize: 13, color: '#334155', fontWeight: 'bold' },
  accountInfoBoxV1: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 9, padding: 11, marginBottom: 12 },
  accountInfoLabelV1: { fontSize: 10, color: '#64748b', fontWeight: '700', textAlign: 'right' },
  accountInfoValueV1: { fontSize: 12, color: '#1e293b', fontWeight: '700', textAlign: 'right', marginTop: 2 },
  accountLanguageSectionV1: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 9, padding: 10 },
  accountLanguageTitleV1: { fontSize: 12, fontWeight: '800', color: '#334155', textAlign: 'right', marginBottom: 8 },
  accountLanguageRowV1: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  accountLanguageBtnV1: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 7, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1' },
  accountLanguageBtnActiveV1: { backgroundColor: '#0052D4', borderColor: '#0052D4' },
  accountLanguageTextV1: { fontSize: 10, fontWeight: '700', color: '#475569' },
  accountLanguageTextActiveV1: { color: '#fff' },
  accountLogoutBtnV1: { marginTop: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  accountLogoutTextV1: { color: '#DC2626', fontSize: 11, fontWeight: '800' },
  accountCloseBtnV1: { marginTop: 9, alignItems: 'center', paddingVertical: 6 },
  accountCloseTextV1: { color: '#475569', fontSize: 11, fontWeight: '700' },

  authModalV1: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24, width: '92%', maxWidth: 500, alignItems: 'center', elevation: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  authModalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  authInputV1: { width: '100%', height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 9, paddingHorizontal: 12, marginBottom: 10, textAlign: 'right', fontSize: 13, backgroundColor: '#fff' },
  primaryButtonWideV1: { width: '100%', backgroundColor: '#0052D4', paddingVertical: 12, borderRadius: 9, alignItems: 'center', marginTop: 4 },
  switchAuthModeBtnV1: { marginTop: 14, alignItems: 'center' },
  switchAuthModeTextV1: { color: '#0052D4', fontWeight: '700', fontSize: 13 },
  authSectionTitleV1: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 10 },
  plansRowV1: { flexDirection: 'row', gap: 8, width: '100%', marginBottom: 12 },
  planCardV1: { flex: 1, minHeight: 80, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 9, padding: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  planCardActiveV1: { borderColor: '#0052D4', borderWidth: 2, backgroundColor: '#eff6ff' },
  planTitleV1: { fontSize: 12, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  planDescV1: { fontSize: 9, color: '#64748b', textAlign: 'center', marginTop: 3 },
  backAuthBtnV1: { marginTop: 10 },
  closeAuthBtnV1: { marginTop: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 12 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 480, alignItems: 'center', elevation: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 6 },
  modalSubtitle: { fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b', marginTop: 8, marginBottom: 6, alignSelf: 'flex-start' },
  authInput: { width: '100%', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, height: 38, marginBottom: 8, textAlign: 'right', fontSize: 12 },

  userExistsWarningBox: {
    width: '100%',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  warningTitle: { fontSize: 13, fontWeight: 'bold', color: '#991b1b', marginBottom: 2 },
  warningText: { fontSize: 11, color: '#7f1d1d', marginBottom: 6, textAlign: 'center' },
  switchLoginBtn: { backgroundColor: '#dc2626', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  switchLoginBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },

  plansContainer: { flexDirection: 'row', gap: 6, width: '100%', marginVertical: 10, flexWrap: 'wrap' },
  planCard: { flex: 1, minWidth: 90, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 8, alignItems: 'center', backgroundColor: '#f8fafc' },
  selectedPlanCard: { borderColor: '#0052D4', backgroundColor: '#eff6ff', borderWidth: 2 },
  planName: { fontSize: 12, fontWeight: 'bold', color: '#0f172a' },
  planPrice: { fontSize: 10, fontWeight: 'bold', color: '#0052D4', marginVertical: 2 },
  planDesc: { fontSize: 9, color: '#64748b', textAlign: 'center' },

  previewZoomToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginBottom: 8 },
  previewZoomBtn: { width: 38, height: 34, borderRadius: 8, backgroundColor: '#0052D4', alignItems: 'center', justifyContent: 'center' },
  previewZoomBtnText: { color: '#fff', fontSize: 22, fontWeight: 'bold', lineHeight: 24 },
  previewZoomResetBtn: { minWidth: 68, height: 34, borderRadius: 8, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  previewZoomResetText: { color: '#1e293b', fontSize: 12, fontWeight: 'bold' },
  previewReadOnlyLabel: { marginLeft: 8, color: '#64748b', fontSize: 11, fontWeight: 'bold' },
  previewImageContainer: { width: '100%', backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  adBannerBox: { width: '100%', height: 150, backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  adPlaceholderText: { fontSize: 13, fontWeight: 'bold', color: '#94a3b8' },
  timerBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  timerText: { fontSize: 13, fontWeight: 'bold', color: '#334155' },
  timerCount: { color: '#0052D4', fontSize: 15 },
  modalDownloadBtn: { backgroundColor: '#16a34a', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, width: '100%', alignItems: 'center' },
  modalDownloadBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  modalCancelBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  modalCancelBtnText: { color: '#dc2626', fontSize: 12, fontWeight: 'bold' },
});
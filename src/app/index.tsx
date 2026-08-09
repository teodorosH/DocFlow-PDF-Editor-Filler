import { loadPDFDocument } from '@/utils/pdfLoader';
import { useLanguage } from '@/context/LanguageContext';
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

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://docflow.teoplatform.com';

type ToolType = 'text' | 'highlight' | 'redact' | 'signature' | 'zoom';
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
    signatureToolDesc: 'חתימה בנגיעה או בעכבר',
    zoomTool: '🔎 זכוכית מגדלת',
    zoomToolDesc: 'תצוגה מוגדלת נגררת מעל הנגיעה',
    preview: '👁️ תצוגה מקדימה',
    download: '💾 הורד PDF סופי',
    loginRegister: '🔑 התחבר / הרשם',
    login: 'התחבר',
    register: 'הרשמה',
    logout: 'יציאה',
    prevPage: '◀ עמוד קודם',
    nextPage: 'עמוד הבא ▶',
    pageOf: 'עמוד {current} מתוך {total}',
    guestPageLimit: '(אורח: עמוד 1 בלבד)',
    signModalTitle: '🖋️ צייר את חתימתך למטה:',
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
    magnifierScaleLabel: '🔎 הגדלת זכוכית מגדלת:',
    position: 'מיקום:',
    font: 'פונט:',
    width: 'רוחב:',
    delete: '🗑️ מחק',
    done: '✓ סיום',
    selectedElement: '🎯 אלמנט נבחר',
    addTextTitle: '✍️ הוספת טקסט למסמך',
    addTextSubtitle: 'הקלד את הטקסט שברצונך למקם במסמך:',
    typeHerePlaceholder: 'הקלד כאן...',
    addToDocument: 'הוסף למסמך ✅',
    availableIn: 'זמין בעוד',
    seconds: 'שניות...',
    continueNow: '✅ המשך כעת',
    userAlreadyExistsTitle: '⚠️ המייל כבר רשום במערכת!',
    userAlreadyExistsDesc: 'כתובת המייל כבר קיימת ב-DocFlow.',
    switchToLogin: '🔑 לחץ כאן למעבר להתחברות',
    free: 'חינם',
    uploadErrorTitle: 'שגיאה בטעינת הקובץ',
    uploadErrorDesc: 'לא ניתן לקרוא את קובץ ה-PDF שנבחר.',
    guestLimitAlert: 'משתמשים אורחים יכולים לערוך את עמוד 1 בלבד. הרשם בחינם כדי לערוך את כל עמודי הקובץ!',
    adNoticeUpload: 'אורח? הרשם בחינם כדי לבטל את זמן ההמתנה בהעלאת קבצים!',
    adNoticePreview: 'אורחים צופים בפרסומת קצרה. הרשמה בחינם תפתח תצוגה מקדימה מיידית!',
    adNoticeDownloadUser: 'משתמש חינם? צפה בפרסומת קצרה להורדה.',
    adNoticeDownloadGuest: 'אורח יקר, צפה בפרסומת לפתיחת ההורדה. הרשמה חינמית תוריד את זמן ההמתנה!',
    quotaExceeded: 'הגעת למכסת העריכות שלך.',
    buyPass: 'רכוש חבילת 10 עריכות ב-₪9.90 🎟️',
    downloadSuccess: 'הקובץ הורד בהצלחה! 🎉',
    welcome: 'ברוך הבא! 👋',
    drawSignaturePrompt: 'נא לצייר חתימה לפני האישור',
    emptySignatureTitle: 'חתימה ריקה',
    loadingFile: '⏳ טוען קובץ PDF...',
    previewTitle: '👁️ מכין תצוגה מקדימה...',
    downloadTitle: '💾 מכין קובץ להורדה...',
    profileTitle: '👤 אזור אישי',
    profileEmail: 'כתובת מייל:',
    profileName: 'שם מלא:',
    profilePlan: 'חבילה נוכחית:',
    profileEditsLeft: 'יתרת עריכות:',
    upgradePlanBtn: '⭐ שדרג חבילה',
    saveName: '💾 שמור שם',
    preferredLangLabel: 'שפת ממשק מועדפת:',
    unlimitedEdits: 'ללא הגבלה ♾️',
    editsCountText: '{count} עריכות',
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
    signatureToolDesc: 'Sign with touch or mouse',
    zoomTool: '🔎 Magnifier',
    zoomToolDesc: 'Draggable magnifying lens over touch',
    preview: '👁️ Preview',
    download: '💾 Download PDF',
    loginRegister: '🔑 Login / Register',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    prevPage: '◀ Previous',
    nextPage: 'Next ▶',
    pageOf: 'Page {current} of {total}',
    guestPageLimit: '(Guest: Page 1 only)',
    signModalTitle: '🖋️ Draw your signature below:',
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
    magnifierScaleLabel: '🔎 Magnifier Scale:',
    position: 'Position:',
    font: 'Font:',
    width: 'Width:',
    delete: '🗑️ Delete',
    done: '✓ Done',
    selectedElement: '🎯 Selected Element',
    addTextTitle: '✍️ Add Text to Document',
    addTextSubtitle: 'Type the text you want to place on the document:',
    typeHerePlaceholder: 'Type here...',
    addToDocument: 'Add to Document ✅',
    availableIn: 'Available in',
    seconds: 'seconds...',
    continueNow: '✅ Continue Now',
    userAlreadyExistsTitle: '⚠️ Email already registered!',
    userAlreadyExistsDesc: 'This email address already exists in DocFlow.',
    switchToLogin: '🔑 Click here to Login',
    free: 'Free',
    uploadErrorTitle: 'File Upload Error',
    uploadErrorDesc: 'Cannot read the selected PDF file.',
    guestLimitAlert: 'Guest users can only edit page 1. Register for free to edit all pages!',
    adNoticeUpload: 'Guest? Register for free to skip upload wait times!',
    adNoticePreview: 'Guests watch a short ad. Free registration unlocks instant preview!',
    adNoticeDownloadUser: 'Free user? Watch a short ad to download.',
    adNoticeDownloadGuest: 'Dear guest, watch an ad to unlock download. Free registration reduces wait time!',
    quotaExceeded: 'You have reached your edit limit.',
    buyPass: 'Buy 10 edits pass for ₪9.90 🎟️',
    downloadSuccess: 'File downloaded successfully! 🎉',
    welcome: 'Welcome! 👋',
    drawSignaturePrompt: 'Please draw a signature before confirming',
    emptySignatureTitle: 'Empty Signature',
    loadingFile: '⏳ Loading PDF file...',
    previewTitle: '👁️ Preparing preview...',
    downloadTitle: '💾 Preparing file for download...',
    profileTitle: '👤 Personal Profile',
    profileEmail: 'Email Address:',
    profileName: 'Full Name:',
    profilePlan: 'Current Plan:',
    profileEditsLeft: 'Remaining Edits:',
    upgradePlanBtn: '⭐ Upgrade Plan',
    saveName: '💾 Save Name',
    preferredLangLabel: 'Preferred Language:',
    unlimitedEdits: 'Unlimited ♾️',
    editsCountText: '{count} edits',
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
    signatureToolDesc: 'التوقيع باللمس أو الماوس',
    zoomTool: '🔎 مكبر',
    zoomToolDesc: 'عدسة مكبرة تحوم فوق المستند',
    preview: '👁️ معاينة',
    download: '💾 تحميل PDF',
    loginRegister: '🔑 تسجيل الدخول',
    login: 'دخول',
    register: 'تسجيل جديد',
    logout: 'خروج',
    prevPage: '◀ السابق',
    nextPage: 'التالي ▶',
    pageOf: 'صفحة {current} من {total}',
    guestPageLimit: '(زائر: الصفحة 1 فقط)',
    signModalTitle: '🖋️ ارسم توقيعك أدناه:',
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
    magnifierScaleLabel: '🔎 تكبير العدسة:',
    position: 'الموقع:',
    font: 'الخط:',
    width: 'العرض:',
    delete: '🗑️ حذف',
    done: '✓ تم',
    selectedElement: '🎯 العنصر المحدد',
    addTextTitle: '✍️ إضافة نص للمستند',
    addTextSubtitle: 'اكتب النص الذي تريد وضعه في المستند:',
    typeHerePlaceholder: 'اكتب هنا...',
    addToDocument: 'إضافة للمستند ✅',
    availableIn: 'متاح خلال',
    seconds: 'ثوانٍ...',
    continueNow: '✅ المتابعة الآن',
    userAlreadyExistsTitle: '⚠️ البريد الإلكتروني مسجل بالفعل!',
    userAlreadyExistsDesc: 'عنوان البريد الإلكتروني هذا موجود بالفعل في DocFlow.',
    switchToLogin: '🔑 انقر هنا لتسجيل الدخول',
    free: 'مجاناً',
    uploadErrorTitle: 'خطأ في تحميل الملف',
    uploadErrorDesc: 'لا يمكن قراءة ملف PDF المحدد.',
    guestLimitAlert: 'يمكن للزوار تعديل الصفحة 1 فقط. سجل مجاناً لتعديل جميع الصفحات!',
    adNoticeUpload: 'زائر؟ سجل مجاناً لإلغاء وقت الانتظار عند رفع الملفات!',
    adNoticePreview: 'يشاهد الزوار إعلاناً قصيراً. التسجيل المجاني يفتح المعاينة الفورية!',
    adNoticeDownloadUser: 'مستخدم مجاني؟ شاهد إعلاناً قصيراً للتحميل.',
    adNoticeDownloadGuest: 'عزيزي الزائر، شاهد إعلاناً لفتح التحميل. التسجيل المجاني يقلل وقت الانتظار!',
    quotaExceeded: 'لقد وصلت إلى حد التعديل الخاص بك.',
    buyPass: 'شراء باقة 10 تعديلات بـ ₪9.90 🎟️',
    downloadSuccess: 'تم تحميل الملف بنجاح! 🎉',
    welcome: 'أهلاً بك! 👋',
    drawSignaturePrompt: 'يرجى رسم التوقيع قبل التأكيد',
    emptySignatureTitle: 'توقيع فارغ',
    loadingFile: '⏳ جاري تحميل ملف PDF...',
    previewTitle: '👁️ جاري إعداد المعاينة...',
    downloadTitle: '💾 جاري إعداد الملف للتحميل...',
    profileTitle: '👤 الملف الشخصي',
    profileEmail: 'البريد الإلكتروني:',
    profileName: 'الاسم الكامل:',
    profilePlan: 'الخطة الحالية:',
    profileEditsLeft: 'التعديلات المتبقية:',
    upgradePlanBtn: '⭐ ترقية الخطة',
    saveName: '💾 حفظ الاسم',
    preferredLangLabel: 'اللغة المفضلة:',
    unlimitedEdits: 'بلا حدود ♾️',
    editsCountText: '{count} تعديلات',
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
    signatureToolDesc: 'በንክኪ ወይም በሲያን ይፈርሙ',
    zoomTool: '🔎 ማጉያ',
    zoomToolDesc: 'በንክኪ ላይ የሚንሳፈፍ ማጉያ',
    preview: '👁️ ቅድመ እይታ',
    download: '💾 ፒዲኤፍ አውርድ',
    loginRegister: '🔑 ግባ / ተመዝገብ',
    login: 'ግባ',
    register: 'ተመዝገብ',
    logout: 'ውጣ',
    prevPage: '◀ የቀደመው ገጽ',
    nextPage: 'ቀጣይ ገጽ ▶',
    pageOf: 'ገጽ {current} ከ {total}',
    guestPageLimit: '(እንግዳ: ገጽ 1 ብቻ)',
    signModalTitle: '🖋️ ፊርማዎን ከታች ይሳሉ:',
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
    magnifierScaleLabel: '🔎 የማጉያ መጠን:',
    position: 'ቦታ:',
    font: 'ፎንት:',
    width: 'ስፋት:',
    delete: '🗑️ ሰርዝ',
    done: '✓ ተጠናቋል',
    selectedElement: '🎯 የተመረጠው ነገር',
    addTextTitle: '✍️ ወደ ሰነዱ ጽሑፍ ጨምር',
    addTextSubtitle: 'በሰነዱ ላይ ማስቀመጥ የሚፈልጉትን ጽሑፍ ይፃፉ:',
    typeHerePlaceholder: 'እዚህ ይፃፉ...',
    addToDocument: 'ወደ ሰነድ ጨምር ✅',
    availableIn: 'በ',
    seconds: 'ሰከንዶች ውስጥ...',
    continueNow: '✅ አሁን ቀጥል',
    userAlreadyExistsTitle: '⚠️ ኢሜይሉ አስቀድሞ ተመዝግቧል!',
    userAlreadyExistsDesc: 'ይህ ኢሜይል አድራሻ በDocFlow ውስጥ ይገኛል።',
    switchToLogin: '🔑 ወደ መግቢያ ለመቀየር እዚህ ይጫኑ',
    free: 'ነፃ',
    uploadErrorTitle: 'ፋይል የመጫን ስህተት',
    uploadErrorDesc: 'የተመረጠውን ፒዲኤፍ ፋይል ማንበብ አልተቻለም።',
    guestLimitAlert: 'እንግዶች ገጽ 1ን ብቻ ማስተካከል ይችላሉ። ሁሉንም ገጾች ለማስተካከል በነፃ ይመዝገቡ!',
    adNoticeUpload: 'እንግዳ? ፋይል ሲጭኑ የመጠባበቂያ ጊዜን ለማስወገድ በነፃ ይመዝገቡ!',
    adNoticePreview: 'እንግዶች አጭር ማስታወቂያ ያያሉ። ነፃ ምዝገባ ፈጣን ቅድመ እይታን ይከፍታል!',
    adNoticeDownloadUser: 'ነፃ ተጠቃሚ? ለማውረድ አጭር ማስታወቂያ ይመልከቱ።',
    adNoticeDownloadGuest: 'ውድ እንግዳ፣ ለማውረድ ማስታወቂያ ይመልከቱ። ነፃ ምዝገባ የመጠባበቂያ ጊዜን ይቀንሳል!',
    quotaExceeded: 'የማስተካከያ ገደብዎ ላይ ደርሰዋል።',
    buyPass: 'የ10 ማስተካከያ ፓስ በ₪9.90 ይግዙ 🎟️',
    downloadSuccess: 'ፋይሉ በስኬት ወርዷል! 🎉',
    welcome: 'እንኳን ደህና መጡ! 👋',
    drawSignaturePrompt: 'እባክዎን ከማረጋገጥዎ በፊት ፊርማ ይሳሉ',
    emptySignatureTitle: 'ባዶ ፊርማ',
    loadingFile: '⏳ ፒዲኤፍ ፋይል በመጫን ላይ...',
    previewTitle: '👁️ ቅድመ እይታ በማዘጋጀት ላይ...',
    downloadTitle: '💾 ፋይል ለማውረድ በማዘጋጀት ላይ...',
    profileTitle: '👤 የግል መገለጫ',
    profileEmail: 'ኢሜይል አድራሻ:',
    profileName: 'ሙሉ ስም:',
    profilePlan: 'የአሁኑ ዕቅድ:',
    profileEditsLeft: 'ቀሪ ማስተካከያዎች:',
    upgradePlanBtn: '⭐ ዕቅድ ያሻሽሉ',
    saveName: '💾 ስም አስቀምጥ',
    preferredLangLabel: 'ተመራጭ ቋንቋ:',
    unlimitedEdits: 'ያልተገደበ ♾️',
    editsCountText: '{count} ማስተካከያዎች',
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
  if (!pdfLibModule) throw new Error('PDF engine failed to load');

  const PDFDocument = pdfLibModule.PDFDocument || pdfLibModule.default?.PDFDocument || pdfLibModule;
  const rgb = pdfLibModule.rgb || pdfLibModule.default?.rgb || ((r: number, g: number, b: number) => ({ type: 'RGB', red: r, green: g, blue: b }));

  return { PDFDocument, rgb };
}

function _atobPolyfill(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = input.replace(/=+$/, '');
  let output = '';
  if (str.length % 4 === 1) {
    throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
  }
  for (
    let bc = 0, bs = 0, buffer, idx = 0;
    (buffer = str.charAt(idx++));
    ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
      ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
      : 0
  ) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}

function _btoaPolyfill(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
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
      base64 += chars.charAt(c1) + chars.charAt(c2) + '==';
    } else if (i + 2 >= len) {
      base64 += chars.charAt(c1) + chars.charAt(c2) + chars.charAt(c3) + '=';
    } else {
      base64 += chars.charAt(c1) + chars.charAt(c2) + chars.charAt(c3) + chars.charAt(c4);
    }
  }
  return base64;
}

function _base64ToArrayBuffer(base64: string): ArrayBuffer {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '').trim();
  const binaryString = Platform.OS === 'web' && typeof window !== 'undefined' && window.atob
    ? window.atob(base64Data)
    : _atobPolyfill(base64Data);

  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function _uint8ArrayToBase64(bytes: Uint8Array): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.btoa) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
  return _btoaPolyfill(bytes);
}

// 🚀 יצירת תמונת PNG שקופה מטקסט (Web)
async function renderTextToPngBase64(text: string, fontSize: number = 15): Promise<{ base64Png: string; width: number; height: number }> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return { base64Png: '', width: 0, height: 0 };

    const dpiScale = 3;
    const fontStyle = `bold ${fontSize}px Arial, sans-serif`;
    ctx.font = fontStyle;

    const textMetrics = ctx.measureText(text);
    const displayWidth = Math.ceil(textMetrics.width) + 4;
    const displayHeight = Math.ceil(fontSize * 1.3);

    canvas.width = displayWidth * dpiScale;
    canvas.height = displayHeight * dpiScale;
    ctx.scale(dpiScale, dpiScale);

    ctx.font = fontStyle;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000000';
    ctx.fillText(text, 1, 0);

    return { base64Png: canvas.toDataURL('image/png'), width: displayWidth, height: displayHeight };
  }
  return { base64Png: '', width: 0, height: 0 };
}

export default function PdfEditorScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const CONTAINER_WIDTH = Math.min(windowWidth - 24, 600);

  const [defaultFontSize, setDefaultFontSize] = useState<number>(15);
  const [isScrollEnabled, setIsScrollEnabled] = useState<boolean>(true);

  // 🔎 זכוכית מגדלת
  const [magnifierPos, setMagnifierPos] = useState<{ x: number; y: number } | null>(null);
  const [magnifierScale, setMagnifierScale] = useState<number>(2.0);

  // 🌐 סנכרון שפה גלובלי
  const { lang, setLang } = useLanguage();
  const t = I18N[lang] || I18N.en;

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

  // 👤 אזור אישי ועריכת שם
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingFullName, setEditingFullName] = useState('');

  // 🖋️ חתימה במובייל ו-Web
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureClickPos, setSignatureClickPos] = useState<{ x: number; y: number } | null>(null);
  const [mobileSignatureDataUrl, setMobileSignatureDataUrl] = useState<string | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mobileSignatureWebViewRef = useRef<WebView | null>(null);

  // 📄 מנוע Text-to-Image למובייל
  const [mobileTextToConvert, setMobileTextToConvert] = useState<{ id: string; text: string; fontSize: number } | null>(null);
  const mobileTextCanvasWebViewRef = useRef<WebView | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authStep, setAuthStep] = useState<1 | 2>(1);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('free');

  const [userAlreadyExistsError, setUserAlreadyExistsError] = useState(false);

  const [showAdModal, setShowAdModal] = useState(false);
  const [adTitle, setAdTitle] = useState('📢 Sponsored Ad');
  const [adMessage, setAdMessage] = useState('');
  const [adTimer, setAdTimer] = useState(10);
  const [isAdFinished, setIsAdFinished] = useState(false);
  const [pendingAction, setPendingAction] = useState<'upload' | 'preview' | 'download' | null>(null);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPdfBytes, setPreviewPdfBytes] = useState<Uint8Array | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const webMagnifierCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const containerHeight = pdfDimensions
    ? CONTAINER_WIDTH / pdfDimensions.aspectRatio
    : CONTAINER_WIDTH * 1.41;

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  const magnifierPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => activeTool === 'zoom',
      onMoveShouldSetPanResponder: () => activeTool === 'zoom',
      onPanResponderGrant: (evt) => {
        setIsScrollEnabled(false);
        const { locationX, locationY } = evt.nativeEvent;
        setMagnifierPos({ x: locationX, y: locationY });
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setMagnifierPos({ x: locationX, y: locationY });
      },
      onPanResponderRelease: () => {
        setIsScrollEnabled(true);
      },
      onPanResponderTerminate: () => {
        setIsScrollEnabled(true);
      },
    })
  ).current;

  useEffect(() => {
    if (activeTool === 'zoom') {
      setIsScrollEnabled(false);
    } else {
      setIsScrollEnabled(true);
      setMagnifierPos(null);
    }
  }, [activeTool]);

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
    if (Platform.OS === 'web' && pdfBytes && pdfDimensions && canvasRef.current) {
      renderPdfPageToCanvas(pdfBytes, canvasRef.current, CONTAINER_WIDTH, currentPageIndex + 1);
    }
  }, [pdfBytes, pdfDimensions, currentPageIndex, CONTAINER_WIDTH]);

  // 🔍 זום-אין חרד ומוגדל בזכוכית המגדלת ב-Web
  useEffect(() => {
    const MAG_W = Math.min(CONTAINER_WIDTH - 20, 260);
    const MAG_H = 100;

    if (
      Platform.OS === 'web' &&
      activeTool === 'zoom' &&
      magnifierPos &&
      canvasRef.current &&
      webMagnifierCanvasRef.current
    ) {
      const mainCanvas = canvasRef.current;
      const magCanvas = webMagnifierCanvasRef.current;
      const ctx = magCanvas.getContext('2d');

      if (ctx && mainCanvas.width > 0) {
        magCanvas.width = MAG_W;
        magCanvas.height = MAG_H;

        const scaleRatioX = mainCanvas.width / CONTAINER_WIDTH;
        const scaleRatioY = mainCanvas.height / containerHeight;

        const sampleW = MAG_W / magnifierScale;
        const sampleH = MAG_H / magnifierScale;

        const sampleX = magnifierPos.x - sampleW / 2;
        const sampleY = magnifierPos.y - sampleH / 2;

        const sx = Math.max(0, Math.min(CONTAINER_WIDTH - sampleW, sampleX)) * scaleRatioX;
        const sy = Math.max(0, Math.min(containerHeight - sampleH, sampleY)) * scaleRatioY;
        const sw = sampleW * scaleRatioX;
        const sh = sampleH * scaleRatioY;

        ctx.clearRect(0, 0, MAG_W, MAG_H);
        ctx.drawImage(mainCanvas, sx, sy, sw, sh, 0, 0, MAG_W, MAG_H);
      }
    }
  }, [magnifierPos, magnifierScale, activeTool, CONTAINER_WIDTH, containerHeight]);

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
    if (Platform.OS === 'web') {
      if (signatureCanvasRef.current) {
        const ctx = signatureCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
        }
      }
    } else {
      mobileSignatureWebViewRef.current?.injectJavaScript("window.postMessage('clear', '*'); true;");
      setMobileSignatureDataUrl(null);
    }
  };

  const saveSignatureAndPlace = () => {
    if (!signatureClickPos) return;

    let dataUrl: string | null = null;
    if (Platform.OS === 'web') {
      if (signatureCanvasRef.current) {
        dataUrl = signatureCanvasRef.current.toDataURL('image/png');
      }
    } else {
      dataUrl = mobileSignatureDataUrl;
    }

    if (!dataUrl) {
      if (Platform.OS === 'web') alert(t.drawSignaturePrompt);
      else Alert.alert(t.emptySignatureTitle, t.drawSignaturePrompt);
      return;
    }

    const newElement: EditorElement = {
      id: Date.now().toString(),
      type: 'signature',
      imageUri: dataUrl,
      x: Math.max(0, signatureClickPos.x - 60),
      y: Math.max(0, signatureClickPos.y - 30),
      width: 140,
      height: 70,
      fontSize: defaultFontSize,
      pageIndex: currentPageIndex,
    };

    setElements((prev) => [...prev, newElement]);
    setSelectedElementId(newElement.id);
    setShowSignatureModal(false);
    setSignatureClickPos(null);
    setMobileSignatureDataUrl(null);
  };

  const handlePageChange = (newIndex: number) => {
    if (!currentUser && newIndex > 0) {
      if (Platform.OS === 'web') {
        alert(t.guestLimitAlert);
        setShowAuthModal(true);
      } else {
        Alert.alert(
          'Guest Limit 🔒',
          t.guestLimitAlert,
          [
            { text: t.close, style: 'cancel' },
            { text: t.loginRegister, onPress: () => setShowAuthModal(true) },
          ]
        );
      }
      return;
    }
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
      triggerAd(5, t.loadingFile, t.adNoticeUpload, 'upload');
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
      setMagnifierPos(null);

      const response = await fetch(uri);
      const bytes = await response.arrayBuffer();

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
      Alert.alert(t.uploadErrorTitle, err?.message || t.uploadErrorDesc);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewPdf = () => {
    if (!pdfBytes) return;

    if (!currentUser) {
      triggerAd(10, t.previewTitle, t.adNoticePreview, 'preview');
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
      setShowPreviewModal(true);
    } catch (error: any) {
      Alert.alert(t.uploadErrorTitle, error?.message || 'Error creating preview');
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
            alert(data.error || t.quotaExceeded);
            setShowAuthModal(true);
          } else {
            Alert.alert(
              t.uploadErrorTitle,
              data.error || t.quotaExceeded,
              [
                { text: t.close },
                { text: t.buyPass, onPress: () => setShowAuthModal(true) },
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
        t.downloadTitle,
        currentUser ? t.adNoticeDownloadUser : t.adNoticeDownloadGuest,
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
        alert(t.downloadSuccess);
      } else {
        Alert.alert(t.downloadSuccess, t.downloadSuccess);
      }
    } catch (error: any) {
      Alert.alert(t.uploadErrorTitle, error?.message || 'Error downloading file');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthStep1 = async () => {
    setUserAlreadyExistsError(false);

    if (!authEmail || !authPassword) {
      if (Platform.OS === 'web') alert('Fill email & password');
      else Alert.alert('Error', 'Fill email & password');
      return;
    }

    if (authMode === 'register') {
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
        if (!res.ok) throw new Error(data.error || 'Login error');

        const displayName = data.user.fullName || data.user.full_name || authFullName || data.user.email;
        const userPreferredLang = data.user.preferredLanguage || 'en';

        setCurrentUser({ ...data.user, fullName: displayName });
        setLang(userPreferredLang);
        setShowAuthModal(false);

        if (Platform.OS === 'web') {
          alert(`${t.welcome} ${displayName}`);
        } else {
          Alert.alert(t.welcome, displayName);
        }
      } catch (err: any) {
        if (Platform.OS === 'web') alert(err.message || 'Login error');
        else Alert.alert('Error', err.message);
      } finally {
        setLoading(false);
      }
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
          preferredLanguage: lang,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.userExists || (data.error && data.error.includes('קיים'))) {
          setUserAlreadyExistsError(true);
          return;
        }

        if (Platform.OS === 'web') {
          alert(data.error || 'Register error');
        } else {
          Alert.alert('Error', data.error || 'Register error');
        }
        return;
      }

      const displayName = authFullName.trim() || data.user.fullName || data.user.full_name || data.user.email;
      setCurrentUser({ ...data.user, fullName: displayName });
      setShowAuthModal(false);
      setAuthStep(1);

      if (Platform.OS === 'web') {
        alert(`${t.welcome} ${displayName}`);
      } else {
        Alert.alert(t.welcome, displayName);
      }
    } catch (err: any) {
      console.error('Register fetch error:', err);
      if (Platform.OS === 'web') {
        alert(err.message || 'Network error');
      } else {
        Alert.alert('Error', err.message || 'Network error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfileName = () => {
    if (!currentUser || !editingFullName.trim()) return;
    setCurrentUser((prev) => prev ? { ...prev, fullName: editingFullName.trim() } : null);
    if (Platform.OS === 'web') alert(t.done);
    else Alert.alert(t.done, t.done);
  };

  const handleCanvasClick = (clickX: number, clickY: number) => {
    if (selectedElementId) {
      setSelectedElementId(null);
      return;
    }

    if (!pdfUri) return;

    if (activeTool === 'zoom') {
      setMagnifierPos({ x: clickX, y: clickY });
      return;
    }

    setMagnifierPos(null);

    if (activeTool === 'text') {
      setActiveInput({ x: clickX, y: clickY });
    } else if (activeTool === 'signature') {
      setSignatureClickPos({ x: clickX, y: clickY });
      setMobileSignatureDataUrl(null);
      setShowSignatureModal(true);
    } else {
      const newElement: EditorElement = {
        id: Date.now().toString(),
        type: activeTool,
        x: Math.max(0, clickX - 60),
        y: Math.max(0, clickY - 10),
        width: 120,
        height: 20,
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

  const handleAddTextElement = async () => {
    if (!activeInput || !currentText.trim()) return;

    const newId = Date.now().toString();

    if (Platform.OS === 'web') {
      const res = await renderTextToPngBase64(currentText, defaultFontSize);
      const newElement: EditorElement = {
        id: newId,
        type: 'text',
        text: currentText,
        imageUri: res.base64Png || undefined,
        x: activeInput.x,
        y: activeInput.y,
        width: Math.max(60, res.width || 120),
        height: Math.max(20, res.height || 20),
        fontSize: defaultFontSize,
        pageIndex: currentPageIndex,
      };
      setElements((prev) => [...prev, newElement]);
      setSelectedElementId(newElement.id);
    } else {
      // 🚀 הוספה מיידית למסך במובייל (ללא עיכוב)
      const newElement: EditorElement = {
        id: newId,
        type: 'text',
        text: currentText,
        x: activeInput.x,
        y: activeInput.y,
        width: Math.max(80, currentText.length * 10),
        height: 25,
        fontSize: defaultFontSize,
        pageIndex: currentPageIndex,
      };
      setElements((prev) => [...prev, newElement]);
      setSelectedElementId(newElement.id);

      // שליחת הטקסט ברקע למדידת רוחב וגובה מדויקים לצורך שמירה ב-PDF
      setMobileTextToConvert({ id: newId, text: currentText, fontSize: defaultFontSize });
    }

    setCurrentText('');
    setActiveInput(null);
  };

  const updateElementProps = (id: string, updates: Partial<EditorElement>) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...updates } : el)));
  };

  const nudgeSelected = (dx: number, dy: number) => {
    if (!selectedElement) return;
    const newX = Math.max(0, Math.min(CONTAINER_WIDTH - 20, selectedElement.x + dx));
    const newY = Math.max(0, Math.min(containerHeight - 15, selectedElement.y + dy));
    updateElementProps(selectedElement.id, { x: newX, y: newY });
  };

  const buildModifiedPdfBytes = async (isPreviewMode: boolean = false): Promise<Uint8Array | null> => {
    if (!pdfBytes || !pdfDimensions) return null;

    try {
      const { PDFDocument, rgb } = await getPdfLib();
      const pdfDoc = await PDFDocument.load(pdfBytes.slice(0));
      const pages = pdfDoc.getPages();

      const currentHeight = pdfDimensions.height;
      const currentWidth = pdfDimensions.width;
      const scaleX = currentWidth / CONTAINER_WIDTH;
      const scaleY = currentHeight / containerHeight;

      for (const el of elements) {
        try {
          const targetPage = pages[el.pageIndex] || pages[0];

          if (el.type === 'text' && el.text) {
            let pngUri = el.imageUri;
            if (!pngUri) {
              const res = await renderTextToPngBase64(el.text, el.fontSize);
              pngUri = res.base64Png;
            }

            if (pngUri) {
              const imageBytes = _base64ToArrayBuffer(pngUri);
              const pngImage = await pdfDoc.embedPng(imageBytes);
              const finalImgWidth = pngImage.width * (scaleX / 3);
              const finalImgHeight = pngImage.height * (scaleY / 3);
              const finalPdfX = el.x * scaleX;
              const finalPdfY = currentHeight - (el.y * scaleY) - finalImgHeight;

              targetPage.drawImage(pngImage, {
                x: Math.max(0, finalPdfX),
                y: Math.max(0, finalPdfY),
                width: finalImgWidth,
                height: finalImgHeight,
              });
            }
          } else if (el.type === 'signature' && el.imageUri) {
            const imageBytes = _base64ToArrayBuffer(el.imageUri);
            const pngImage = await pdfDoc.embedPng(imageBytes);

            const finalWidth = el.width * scaleX;
            const finalHeight = el.height * scaleY;

            const finalPdfX = el.x * scaleX;
            const finalPdfY = currentHeight - (el.y * scaleY) - finalHeight;

            targetPage.drawImage(pngImage, {
              x: Math.max(0, finalPdfX),
              y: Math.max(0, finalPdfY),
              width: finalWidth,
              height: finalHeight,
            });
          } else if (el.type === 'highlight' || el.type === 'redact') {
            const finalWidth = el.width * scaleX;
            const finalHeight = el.height * scaleY;
            const finalPdfX = el.x * scaleX;
            const finalPdfY = currentHeight - (el.y * scaleY) - finalHeight;

            if (el.type === 'redact') {
              targetPage.drawRectangle({
                x: Math.max(0, finalPdfX),
                y: Math.max(0, finalPdfY),
                width: finalWidth,
                height: finalHeight,
                color: rgb(0, 0, 0),
              });
            } else {
              targetPage.drawRectangle({
                x: Math.max(0, finalPdfX),
                y: Math.max(0, finalPdfY),
                width: finalWidth,
                height: finalHeight,
                color: rgb(1, 0.92, 0.2),
                opacity: 0.5,
              });
            }
          }
        } catch (elErr) {
          console.error('Error adding element to PDF:', elErr);
        }
      }

      return await pdfDoc.save();
    } catch (err) {
      console.error('Error building modified PDF:', err);
      return null;
    }
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

  const MAGNIFIER_WIDTH = Math.min(CONTAINER_WIDTH - 20, 260);
  const MAGNIFIER_HEIGHT = 100;

  return (
    <View style={styles.mainContainer}>
      <StatusBar backgroundColor="#0f172a" barStyle="light-content" translucent={false} />

      {/* 📄 WebView נסתר למדידת טקסט והמרתו ל-PNG במובייל */}
      {Platform.OS !== 'web' && (
        <View style={{ width: 0, height: 0, opacity: 0, overflow: 'hidden', position: 'absolute' }}>
          <WebView
            ref={mobileTextCanvasWebViewRef}
            originWhitelist={['*']}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data && data.base64Png && data.id) {
                  setElements((prev) =>
                    prev.map((el) =>
                      el.id === data.id
                        ? { ...el, imageUri: data.base64Png, width: Math.max(60, data.width || 120), height: Math.max(20, data.height || 20) }
                        : el
                    )
                  );
                  setMobileTextToConvert(null);
                }
              } catch (e) {
                console.error('Error parsing mobile text PNG message:', e);
              }
            }}
            source={{
              html: `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  </head>
                  <body>
                    <canvas id="tc"></canvas>
                    <script>
                      window.addEventListener('message', function(e) {
                        try {
                          const data = JSON.parse(e.data);
                          if (data && data.text) {
                            const canvas = document.getElementById('tc');
                            const ctx = canvas.getContext('2d');
                            const dpi = 3;
                            const fontStyle = 'bold ' + data.fontSize + 'px Arial, sans-serif';
                            ctx.font = fontStyle;
                            const metrics = ctx.measureText(data.text);
                            const w = Math.ceil(metrics.width) + 6;
                            const h = Math.ceil(data.fontSize * 1.3);
                            canvas.width = w * dpi;
                            canvas.height = h * dpi;
                            ctx.scale(dpi, dpi);
                            ctx.font = fontStyle;
                            ctx.textBaseline = 'top';
                            ctx.fillStyle = '#000000';
                            ctx.fillText(data.text, 2, 0);
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                              id: data.id,
                              base64Png: canvas.toDataURL('image/png'),
                              width: w,
                              height: h
                            }));
                          }
                        } catch(err) {}
                      });
                    </script>
                  </body>
                </html>
              `
            }}
            onLoadEnd={() => {
              if (mobileTextToConvert) {
                mobileTextCanvasWebViewRef.current?.injectJavaScript(
                  `window.postMessage(JSON.stringify(${JSON.stringify(mobileTextToConvert)}), '*'); true;`
                );
              }
            }}
          />
        </View>
      )}

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          scrollEnabled={isScrollEnabled}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header - סרגל השפה מופיע רק למשתמשים אורחים שאינם מחוברים */}
          <View style={[styles.headerBar, { maxWidth: CONTAINER_WIDTH }]}>
            <DocFlowLogo />

            {!currentUser && (
              <View style={styles.langBar}>
                <TouchableOpacity onPress={() => setLang('en')} style={[styles.langBtn, lang === 'en' && styles.activeLangBtn]}><Text style={[styles.langText, lang === 'en' && styles.activeLangText]}>EN</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setLang('he')} style={[styles.langBtn, lang === 'he' && styles.activeLangBtn]}><Text style={[styles.langText, lang === 'he' && styles.activeLangText]}>עב</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setLang('ar')} style={[styles.langBtn, lang === 'ar' && styles.activeLangBtn]}><Text style={[styles.langText, lang === 'ar' && styles.activeLangText]}>عرب</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setLang('am')} style={[styles.langBtn, lang === 'am' && styles.activeLangBtn]}><Text style={[styles.langText, lang === 'am' && styles.activeLangText]}>አማ</Text></TouchableOpacity>
              </View>
            )}

            {currentUser ? (
              <TouchableOpacity
                style={styles.userInfoBadge}
                onPress={() => {
                  setEditingFullName(currentUser.fullName || currentUser.full_name || '');
                  setShowProfileModal(true);
                }}
              >
                <Text style={styles.userEmailText} numberOfLines={1}>
                  👤 {currentUser.fullName || currentUser.full_name || currentUser.email}
                </Text>
                <Text style={[styles.userPlanBadge, currentUser.plan !== 'free' && styles.paidPlanBadge]}>
                  {currentUser.plan.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.authBtn}
                onPress={() => {
                  setAuthStep(1);
                  setUserAlreadyExistsError(false);
                  setShowAuthModal(true);
                }}
              >
                <Text style={styles.authBtnText}>{t.loginRegister}</Text>
              </TouchableOpacity>
            )}
          </View>

          {!currentUser && (
            <View style={[styles.topAdBannerSlot, { maxWidth: CONTAINER_WIDTH }]}>
              <Text style={styles.adSlotLabel}>Sponsored</Text>
              <Text style={styles.topAdBannerText}>⚡ {t.guestNotice}</Text>
            </View>
          )}

          {!pdfUri ? (
            <View style={[styles.heroLandingCard, { maxWidth: CONTAINER_WIDTH }]}>
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
            <View style={[styles.editorArea, { maxWidth: CONTAINER_WIDTH }]}>
              <TouchableOpacity style={styles.changeFileBtn} onPress={pickDocument} disabled={loading}>
                <Text style={styles.changeFileBtnText}>{t.changePdf}</Text>
              </TouchableOpacity>

              {/* סרגל כלים ראשי */}
              <View style={styles.toolbarRow}>
                <TouchableOpacity
                  style={[styles.toolBtn, activeTool === 'text' && styles.activeToolBtn]}
                  onPress={() => {
                    setActiveTool('text');
                    setMagnifierPos(null);
                  }}
                >
                  <Text style={[styles.toolBtnText, activeTool === 'text' && styles.activeToolBtnText]}>{t.textTool}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolBtn, activeTool === 'signature' && styles.activeToolBtn]}
                  onPress={() => {
                    setActiveTool('signature');
                    setMagnifierPos(null);
                  }}
                >
                  <Text style={[styles.toolBtnText, activeTool === 'signature' && styles.activeToolBtnText]}>{t.signatureTool}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolBtn, activeTool === 'highlight' && styles.activeToolBtn]}
                  onPress={() => {
                    setActiveTool('highlight');
                    setMagnifierPos(null);
                  }}
                >
                  <Text style={[styles.toolBtnText, activeTool === 'highlight' && styles.activeToolBtnText]}>{t.highlightTool}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolBtn, activeTool === 'redact' && styles.activeToolBtn]}
                  onPress={() => {
                    setActiveTool('redact');
                    setMagnifierPos(null);
                  }}
                >
                  <Text style={[styles.toolBtnText, activeTool === 'redact' && styles.activeToolBtnText]}>{t.redactTool}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolBtn, activeTool === 'zoom' && styles.activeToolBtn]}
                  onPress={() => setActiveTool('zoom')}
                >
                  <Text style={[styles.toolBtnText, activeTool === 'zoom' && styles.activeToolBtnText]}>{t.zoomTool}</Text>
                </TouchableOpacity>
              </View>

              {/* בקרת זכוכית מגדלת רמת הגדלה + פונט ברירת מחדל */}
              <View style={styles.zoomControlRow}>
                <Text style={styles.zoomControlLabel}>{t.magnifierScaleLabel}</Text>

                <TouchableOpacity
                  style={[styles.zoomBtn, magnifierScale === 1.5 && styles.activeZoomBtn]}
                  onPress={() => setMagnifierScale(1.5)}
                >
                  <Text style={[styles.zoomBtnText, magnifierScale === 1.5 && styles.activeZoomBtnText]}>x1.5</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.zoomBtn, magnifierScale === 2.0 && styles.activeZoomBtn]}
                  onPress={() => setMagnifierScale(2.0)}
                >
                  <Text style={[styles.zoomBtnText, magnifierScale === 2.0 && styles.activeZoomBtnText]}>x2.0</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.zoomBtn, magnifierScale === 2.5 && styles.activeZoomBtn]}
                  onPress={() => setMagnifierScale(2.5)}
                >
                  <Text style={[styles.zoomBtnText, magnifierScale === 2.5 && styles.activeZoomBtnText]}>x2.5</Text>
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
                      <Text style={styles.dockCloseText}>{t.done}</Text>
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
                        <Text style={styles.dockGroupLabel}>{t.width}</Text>
                        <TouchableOpacity style={styles.nudgeBtn} onPress={() => updateElementProps(selectedElement.id, { width: Math.max(20, selectedElement.width - 15) })}>
                          <Text style={styles.nudgeText}>-</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.nudgeBtn} onPress={() => updateElementProps(selectedElement.id, { width: Math.min(400, selectedElement.width + 15) })}>
                          <Text style={styles.nudgeText}>+</Text>
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

              {/* תצוגת הקובץ */}
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

                {/* שכבת לכידת מגע וגרירה רציפה של זכוכית המגדלת במובייל */}
                {activeTool === 'zoom' && Platform.OS !== 'web' && (
                  <View
                    {...magnifierPanResponder.panHandlers}
                    style={StyleSheet.absoluteFillObject}
                  />
                )}

                {Platform.OS === 'web' && (
                  <Pressable
                    style={StyleSheet.absoluteFillObject}
                    onPress={handleContainerPress}
                    onMouseMove={(e) => {
                      if (activeTool === 'zoom') {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMagnifierPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                      }
                    }}
                  />
                )}

                {/* אלמנטים נגררים */}
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

                {/* מלבן זכוכית מגדלת מרחף */}
                {activeTool === 'zoom' && magnifierPos && pdfBytes && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.magnifierBox,
                      {
                        width: MAGNIFIER_WIDTH,
                        height: MAGNIFIER_HEIGHT,
                        left: Math.max(10, Math.min(CONTAINER_WIDTH - MAGNIFIER_WIDTH - 10, magnifierPos.x - MAGNIFIER_WIDTH / 2)),
                        top: Math.max(10, magnifierPos.y - MAGNIFIER_HEIGHT - 20),
                      },
                    ]}
                  >
                    <View style={[styles.magnifierInnerBox, { width: MAGNIFIER_WIDTH, height: MAGNIFIER_HEIGHT }]}>
                      {Platform.OS === 'web' ? (
                        <canvas
                          ref={webMagnifierCanvasRef}
                          style={{ width: MAGNIFIER_WIDTH, height: MAGNIFIER_HEIGHT, display: 'block' }}
                        />
                      ) : (
                        <WebView
                          originWhitelist={['*']}
                          source={{
                            html: `
                              <!DOCTYPE html>
                              <html>
                                <head>
                                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
                                  <style>
                                    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #ffffff; overflow: hidden; }
                                    #zoom-canvas {
                                      position: absolute;
                                      left: -${magnifierPos.x * magnifierScale - MAGNIFIER_WIDTH / 2}px;
                                      top: -${magnifierPos.y * magnifierScale - MAGNIFIER_HEIGHT / 2}px;
                                    }
                                  </style>
                                </head>
                                <body>
                                  <canvas id="zoom-canvas"></canvas>
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
                                        const canvas = document.getElementById('zoom-canvas');
                                        const context = canvas.getContext('2d');
                                        const viewport = page.getViewport({ scale: 1.0 });
                                        const baseScale = (${CONTAINER_WIDTH} / viewport.width);
                                        const scaledViewport = page.getViewport({ scale: baseScale * ${magnifierScale} });

                                        canvas.width = scaledViewport.width;
                                        canvas.height = scaledViewport.height;
                                        page.render({ canvasContext: context, viewport: scaledViewport });
                                      });
                                    });
                                  </script>
                                </body>
                              </html>
                            `
                          }}
                          style={{ width: MAGNIFIER_WIDTH, height: MAGNIFIER_HEIGHT }}
                          scrollEnabled={false}
                        />
                      )}
                    </View>
                  </View>
                )}
              </View>

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

          {/* 👤 Modal אזור אישי עם עריכת שם מלא ובחירת שפות */}
          <Modal visible={showProfileModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { maxWidth: 440 }]}>
                <Text style={styles.modalTitle}>{t.profileTitle}</Text>

                {currentUser && (
                  <View style={styles.profileDetailsContainer}>
                    <View style={styles.profileRowCol}>
                      <Text style={styles.profileLabel}>{t.profileName}</Text>
                      <View style={{ flexDirection: 'row', gap: 6, width: '100%', marginTop: 4 }}>
                        <TextInput
                          style={[styles.authInput, { flex: 1, marginBottom: 0 }]}
                          value={editingFullName}
                          onChangeText={setEditingFullName}
                          placeholder={t.fullNamePlaceholder}
                        />
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0052D4', paddingHorizontal: 10 }]} onPress={handleSaveProfileName}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{t.saveName}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.profileRow}>
                      <Text style={styles.profileLabel}>{t.profileEmail}</Text>
                      <Text style={styles.profileValue}>{currentUser.email}</Text>
                    </View>

                    <View style={styles.profileRow}>
                      <Text style={styles.profileLabel}>{t.profilePlan}</Text>
                      <Text style={[styles.profileValueBadge, currentUser.plan !== 'free' && styles.paidPlanBadge]}>
                        {currentUser.plan.toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.profileRow}>
                      <Text style={styles.profileLabel}>{t.profileEditsLeft}</Text>
                      <Text style={styles.profileValue}>
                        {currentUser.plan === 'premium'
                          ? t.unlimitedEdits
                          : t.editsCountText.replace('{count}', (currentUser.editsCount ?? 3).toString())}
                      </Text>
                    </View>

                    {/* בחירת שפה מועדפת מהאזור האישי */}
                    <View style={[styles.profileRowCol, { borderBottomWidth: 0, marginTop: 8 }]}>
                      <Text style={styles.profileLabel}>{t.preferredLangLabel}</Text>
                      <View style={[styles.langBar, { width: '100%', justifyContent: 'center', marginTop: 6 }]}>
                        <TouchableOpacity onPress={() => setLang('en')} style={[styles.langBtn, lang === 'en' && styles.activeLangBtn]}><Text style={[styles.langText, lang === 'en' && styles.activeLangText]}>English</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => setLang('he')} style={[styles.langBtn, lang === 'he' && styles.activeLangBtn]}><Text style={[styles.langText, lang === 'he' && styles.activeLangText]}>עברית</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => setLang('ar')} style={[styles.langBtn, lang === 'ar' && styles.activeLangBtn]}><Text style={[styles.langText, lang === 'ar' && styles.activeLangText]}>العربية</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => setLang('am')} style={[styles.langBtn, lang === 'am' && styles.activeLangBtn]}><Text style={[styles.langText, lang === 'am' && styles.activeLangText]}>አማርኛ</Text></TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.modalDownloadBtn, { marginTop: 10, backgroundColor: '#0052D4' }]}
                  onPress={() => {
                    setShowProfileModal(false);
                    setAuthStep(2);
                    setShowAuthModal(true);
                  }}
                >
                  <Text style={styles.modalDownloadBtnText}>{t.upgradePlanBtn}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalDownloadBtn, { marginTop: 8, backgroundColor: '#dc2626' }]}
                  onPress={() => {
                    setCurrentUser(null);
                    setShowProfileModal(false);
                  }}
                >
                  <Text style={styles.modalDownloadBtnText}>{t.logout}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalCancelBtn, { marginTop: 10 }]} onPress={() => setShowProfileModal(false)}>
                  <Text style={styles.modalCancelBtnText}>{t.close}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Modal דיאלוג מרכזי להזנת טקסט למסמך */}
          <Modal visible={!!activeInput} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { maxWidth: 400 }]}>
                <Text style={styles.modalTitle}>{t.addTextTitle}</Text>
                <Text style={styles.modalSubtitle}>{t.addTextSubtitle}</Text>

                <TextInput
                  style={styles.promptTextInput}
                  placeholder={t.typeHerePlaceholder}
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

          {/* 🖋️ Modal פד חתימה במגע למובייל ו-Web */}
          <Modal visible={showSignatureModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { maxWidth: 450 }]}>
                <Text style={styles.modalTitle}>{t.signModalTitle}</Text>

                {Platform.OS === 'web' ? (
                  <canvas
                    ref={initSignatureCanvas}
                    width={320}
                    height={160}
                    style={styles.signatureCanvasBox}
                  />
                ) : (
                  <View style={{ width: 320, height: 160, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#cbd5e1' }}>
                    <WebView
                      ref={mobileSignatureWebViewRef}
                      originWhitelist={['*']}
                      onMessage={(event) => {
                        const dataUrl = event.nativeEvent.data;
                        if (dataUrl && dataUrl.startsWith('data:image/png')) {
                          setMobileSignatureDataUrl(dataUrl);
                        }
                      }}
                      source={{
                        html: `
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                              <style>
                                * { box-sizing: border-box; touch-action: none; -webkit-touch-callout: none; -webkit-user-select: none; }
                                body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #ffffff; overflow: hidden; display: flex; justify-content: center; align-items: center; }
                                canvas { width: 100%; height: 100%; display: block; background: #ffffff; cursor: crosshair; }
                              </style>
                            </head>
                            <body>
                              <canvas id="c"></canvas>
                              <script>
                                const canvas = document.getElementById('c');
                                const ctx = canvas.getContext('2d');
                                let isDrawing = false;

                                function resize() {
                                  const rect = canvas.getBoundingClientRect();
                                  canvas.width = rect.width * 2;
                                  canvas.height = rect.height * 2;
                                  ctx.scale(2, 2);
                                  ctx.strokeStyle = '#0052D4';
                                  ctx.lineWidth = 3;
                                  ctx.lineCap = 'round';
                                  ctx.lineJoin = 'round';
                                }
                                resize();

                                function getPos(e) {
                                  const rect = canvas.getBoundingClientRect();
                                  const touch = (e.touches && e.touches.length > 0) ? e.touches[0] : e;
                                  return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
                                }

                                function start(e) {
                                  isDrawing = true;
                                  const pos = getPos(e);
                                  ctx.beginPath();
                                  ctx.moveTo(pos.x, pos.y);
                                }

                                function move(e) {
                                  if (!isDrawing) return;
                                  const pos = getPos(e);
                                  ctx.lineTo(pos.x, pos.y);
                                  ctx.stroke();
                                  send();
                                }

                                function stop() {
                                  if (isDrawing) {
                                    isDrawing = false;
                                    send();
                                  }
                                }

                                function send() {
                                  if (window.ReactNativeWebView) {
                                    window.ReactNativeWebView.postMessage(canvas.toDataURL('image/png'));
                                  }
                                }

                                canvas.addEventListener('touchstart', (e) => { e.preventDefault(); start(e); }, { passive: false });
                                canvas.addEventListener('touchmove', (e) => { e.preventDefault(); move(e); }, { passive: false });
                                canvas.addEventListener('touchend', (e) => { e.preventDefault(); stop(); }, { passive: false });

                                canvas.addEventListener('mousedown', start);
                                canvas.addEventListener('mousemove', move);
                                canvas.addEventListener('mouseup', stop);

                                window.addEventListener('message', (e) => {
                                  if (e.data === 'clear') {
                                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                                    send();
                                  }
                                });
                              </script>
                            </body>
                          </html>
                        `
                      }}
                      style={{ width: 320, height: 160 }}
                      scrollEnabled={false}
                    />
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

          {/* Modal פרסומת */}
          <Modal visible={showAdModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>{adTitle}</Text>
                <Text style={styles.modalSubtitle}>{adMessage}</Text>

                <View style={styles.adBannerBox}>
                  <Text style={styles.adPlaceholderText}>[ AdSense / Rewarded Ad ]</Text>
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

          {/* Modal הרשמה */}
          <Modal visible={showAuthModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }} style={{ width: '100%' }}>
                <View style={[styles.modalCard, { maxWidth: 540 }]}>
                  <Text style={styles.modalTitle}>
                    {authMode === 'register' ? `🎯 ${t.register}` : `🔑 ${t.login}`}
                  </Text>

                  {userAlreadyExistsError && (
                    <View style={styles.userExistsWarningBox}>
                      <Text style={styles.warningTitle}>{t.userAlreadyExistsTitle}</Text>
                      <Text style={styles.warningText}>{t.userAlreadyExistsDesc}</Text>
                      <TouchableOpacity
                        style={styles.switchLoginBtn}
                        onPress={() => {
                          setUserAlreadyExistsError(false);
                          setAuthStep(1);
                          setAuthMode('login');
                        }}
                      >
                        <Text style={styles.switchLoginBtnText}>{t.switchToLogin}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {authStep === 1 ? (
                    <>
                      <TextInput
                        style={styles.authInput}
                        placeholder={t.emailPlaceholder}
                        value={authEmail}
                        onChangeText={(text) => {
                          setAuthEmail(text);
                          setUserAlreadyExistsError(false);
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      <TextInput
                        style={styles.authInput}
                        placeholder={t.passwordPlaceholder}
                        secureTextEntry
                        value={authPassword}
                        onChangeText={setAuthPassword}
                      />
                      <TouchableOpacity style={styles.modalDownloadBtn} onPress={handleAuthStep1}>
                        <Text style={styles.modalDownloadBtnText}>
                          {authMode === 'register' ? t.continueToPlan : t.login}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TextInput
                        style={styles.authInput}
                        placeholder={t.fullNamePlaceholder}
                        value={authFullName}
                        onChangeText={setAuthFullName}
                      />

                      <Text style={styles.sectionTitle}>{t.selectPlanTitle}</Text>
                      <View style={styles.plansContainer}>
                        <TouchableOpacity
                          style={[styles.planCard, selectedPlan === 'free' && styles.selectedPlanCard]}
                          onPress={() => setSelectedPlan('free')}
                        >
                          <Text style={styles.planName}>{t.basicPlan}</Text>
                          <Text style={styles.planPrice}>{t.free}</Text>
                          <Text style={styles.planDesc}>{t.basicPlanDesc}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.planCard, selectedPlan === 'micro_pass' && styles.selectedPlanCard]}
                          onPress={() => setSelectedPlan('micro_pass')}
                        >
                          <Text style={styles.planName}>{t.passPlan}</Text>
                          <Text style={styles.planPrice}>₪9.90</Text>
                          <Text style={styles.planDesc}>{t.passPlanDesc}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.planCard, selectedPlan === 'premium' && styles.selectedPlanCard]}
                          onPress={() => setSelectedPlan('premium')}
                        >
                          <Text style={styles.planName}>{t.premiumPlan}</Text>
                          <Text style={styles.planPrice}>₪49</Text>
                          <Text style={styles.planDesc}>{t.premiumPlanDesc}</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity style={styles.modalDownloadBtn} onPress={handleFinalRegister}>
                        <Text style={styles.modalDownloadBtnText}>{t.finishRegister}</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity
                    onPress={() => {
                      setUserAlreadyExistsError(false);
                      setAuthStep(1);
                      setAuthMode(authMode === 'register' ? 'login' : 'register');
                    }}
                    style={{ marginTop: 14 }}
                  >
                    <Text style={{ color: '#0052D4', fontWeight: 'bold', fontSize: 13 }}>
                      {authMode === 'register' ? t.alreadyRegistered : t.noAccountYet}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.modalCancelBtn, { marginTop: 10 }]} onPress={() => setShowAuthModal(false)}>
                    <Text style={styles.modalCancelBtnText}>{t.close}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </Modal>

          {/* Modal תצוגה מקדימה */}
          <Modal visible={showPreviewModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { maxWidth: 640 }]}>
                <Text style={styles.modalTitle}>{t.preview}</Text>
                {previewPdfBytes && (
                  <View style={[styles.previewImageContainer, { height: 380 }]}>
                    {Platform.OS === 'web' ? (
                      <iframe
                        src={`data:application/pdf;base64,${_uint8ArrayToBase64(previewPdfBytes)}`}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                      />
                    ) : (
                      <WebView
                        originWhitelist={['*']}
                        source={{
                          html: `
                            <!DOCTYPE html>
                            <html>
                              <head>
                                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
                                <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
                                <style>
                                  * { box-sizing: border-box; }
                                  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #ffffff; display: flex; justify-content: center; align-items: center; }
                                  canvas { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
                                </style>
                              </head>
                              <body>
                                <canvas id="preview-canvas"></canvas>
                                <script>
                                  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                                  const base64Data = "${_uint8ArrayToBase64(previewPdfBytes)}";
                                  const raw = window.atob(base64Data);
                                  const rawLength = raw.length;
                                  const array = new Uint8Array(new ArrayBuffer(rawLength));
                                  for(let i = 0; i < rawLength; i++) {
                                    array[i] = raw.charCodeAt(i);
                                  }

                                  pdfjsLib.getDocument({ data: array }).promise.then(pdf => {
                                    pdf.getPage(${currentPageIndex + 1}).then(page => {
                                      const canvas = document.getElementById('preview-canvas');
                                      const context = canvas.getContext('2d');
                                      const viewport = page.getViewport({ scale: 1.5 });
                                      canvas.width = viewport.width;
                                      canvas.height = viewport.height;
                                      page.render({ canvasContext: context, viewport: viewport });
                                    });
                                  });
                                </script>
                              </body>
                            </html>
                          `
                        }}
                        style={{ width: '100%', height: '100%' }}
                      />
                    )}
                  </View>
                )}
                <TouchableOpacity style={[styles.modalDownloadBtn, { marginTop: 15 }]} onPress={() => setShowPreviewModal(false)}>
                  <Text style={styles.modalDownloadBtnText}>{t.close}</Text>
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
  const startPos = useRef({ x: element.x, y: element.y });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startPos.current = { x: element.x, y: element.y };
        onSelect();
        onDragStart?.();
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(0, Math.min(containerBounds.width - 20, startPos.current.x + gestureState.dx));
        const newY = Math.max(0, Math.min(containerBounds.height - 15, startPos.current.y + gestureState.dy));
        onUpdatePos(element.id, newX, newY);
      },
      onPanResponderRelease: () => {
        onDragEnd?.();
      },
      onPanResponderTerminate: () => {
        onDragEnd?.();
      },
    })
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.draggableItemWrapper,
        {
          left: element.x,
          top: element.y,
        },
        isSelected && styles.selectedItemOutline,
      ]}
    >
      {element.type === 'text' && (
        <Text style={[styles.overlayText, { fontSize: element.fontSize, lineHeight: element.fontSize * 1.2 }]}>
          {element.text}
        </Text>
      )}

      {element.type === 'signature' && element.imageUri && (
        <Image
          source={{ uri: element.imageUri }}
          style={{ width: element.width, height: element.height }}
          resizeMode="contain"
        />
      )}

      {element.type === 'highlight' && (
        <View
          style={[
            styles.highlightBox,
            { width: element.width, height: element.height },
          ]}
        />
      )}

      {element.type === 'redact' && (
        <View
          style={[
            styles.redactBox,
            { width: element.width, height: element.height },
          ]}
        />
      )}
    </View>
  );
}

async function renderPdfPageToCanvas(
  arrayBuffer: ArrayBuffer,
  canvas: HTMLCanvasElement,
  targetWidth: number,
  pageNumber: number = 1
) {
  if (typeof window === 'undefined' || !canvas) return;

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

    if ((canvas as any)._activeRenderTask) {
      try {
        (canvas as any)._activeRenderTask.cancel();
      } catch (e) {}
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

    const renderTask = page.render({ canvasContext: ctx, viewport });
    (canvas as any)._activeRenderTask = renderTask;

    await renderTask.promise;
  } catch (err: any) {
    if (err?.name !== 'RenderingCancelledException') {
      console.error('Error rendering PDF page to canvas:', err);
    }
  } finally {
    (canvas as any)._activeRenderTask = null;
  }
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
  userInfoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  userEmailText: { fontSize: 11, fontWeight: 'bold', color: '#1e293b', maxWidth: 110 },
  userPlanBadge: { backgroundColor: '#64748b', color: '#fff', fontSize: 8, fontWeight: 'bold', paddingVertical: 2, paddingHorizontal: 4, borderRadius: 4 },
  paidPlanBadge: { backgroundColor: '#16a34a' },

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
  toolBtn: { flex: 1, minWidth: 55, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8, backgroundColor: '#f8fafc', alignItems: 'center', borderColor: '#e2e8f0', borderWidth: 1 },
  activeToolBtn: { backgroundColor: '#0052D4', borderColor: '#0052D4' },
  toolBtnText: { fontSize: 10, fontWeight: 'bold', color: '#334155' },
  activeToolBtnText: { color: '#ffffff' },

  zoomControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
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
  zoomControlLabel: { fontSize: 10, fontWeight: 'bold', color: '#1e293b' },
  zoomBtn: { backgroundColor: '#f1f5f9', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1' },
  activeZoomBtn: { backgroundColor: '#0052D4', borderColor: '#0052D4' },
  zoomBtnText: { fontSize: 10, fontWeight: 'bold', color: '#334155' },
  activeZoomBtnText: { color: '#ffffff' },

  fontDefaultControl: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  fontBtnText: { fontSize: 11, fontWeight: 'bold', color: '#0052D4', paddingHorizontal: 4 },
  fontSizeLabel: { fontSize: 10, fontWeight: 'bold', color: '#1e293b' },

  magnifierBox: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#0052D4',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    zIndex: 999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  magnifierInnerBox: {
    overflow: 'hidden',
  },

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
  },
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
    fontSize: 14,
    backgroundColor: '#f8fafc',
    textAlignVertical: 'top',
  },

  actionButtonsRow: { flexDirection: 'row', gap: 8, marginTop: 12, width: '100%' },
  actionBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center' },
  previewBtn: { backgroundColor: '#d97706' },
  downloadBtn: { backgroundColor: '#16a34a' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 12 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 480, alignItems: 'center', elevation: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 6 },
  modalSubtitle: { fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#1e293b', marginTop: 8, marginBottom: 6, alignSelf: 'flex-start' },
  authInput: { width: '100%', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, height: 38, marginBottom: 8, fontSize: 12 },

  profileDetailsContainer: { width: '100%', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', marginVertical: 10 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  profileRowCol: { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  profileLabel: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
  profileValue: { fontSize: 12, fontWeight: 'bold', color: '#0f172a' },
  profileValueBadge: { backgroundColor: '#64748b', color: '#fff', fontSize: 10, fontWeight: 'bold', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },

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
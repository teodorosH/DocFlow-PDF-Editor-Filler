import { loadPDFDocument } from '@/utils/pdfLoader';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// 🌐 הגדרת כתובת השרת (API)
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const CONTAINER_WIDTH = 600;

type ToolType = 'text' | 'highlight' | 'redact' | 'signature';
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
    preview: '👁️ תצוגה מקדימה',
    download: '💾 הורד PDF סופי',
    loginRegister: '🔑 התחבר / הרשם',
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
    preview: '👁️ Preview',
    download: '💾 Download PDF',
    loginRegister: '🔑 Login / Register',
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
    preview: '👁️ معاينة',
    download: '💾 تحميل PDF',
    loginRegister: '🔑 تسجيل الدخول',
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
    preview: '👁️ ቅድመ እይታ',
    download: '💾 ፒዲኤፍ አውርድ',
    loginRegister: '🔑 ግባ / ተመዝገብ',
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

export default function PdfEditorScreen() {
  const [lang, setLang] = useState<Language>('he');
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
  const [authStep, setAuthStep] = useState<1 | 2>(1);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('free');

  const [userAlreadyExistsError, setUserAlreadyExistsError] = useState(false);

  const [showAdModal, setShowAdModal] = useState(false);
  const [adTitle, setAdTitle] = useState('📢 פרסומת חסות');
  const [adMessage, setAdMessage] = useState('');
  const [adTimer, setAdTimer] = useState(10);
  const [isAdFinished, setIsAdFinished] = useState(false);
  const [pendingAction, setPendingAction] = useState<'upload' | 'preview' | 'download' | null>(null);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const containerHeight = pdfDimensions
    ? CONTAINER_WIDTH / pdfDimensions.aspectRatio
    : 848;

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
  }, [pdfBytes, pdfDimensions, currentPageIndex]);

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

  const saveSignatureAndPlace = () => {
    if (!signatureCanvasRef.current || !signatureClickPos) return;
    const dataUrl = signatureCanvasRef.current.toDataURL('image/png');

    const newElement: EditorElement = {
      id: Date.now().toString(),
      type: 'signature',
      imageUri: dataUrl,
      x: Math.max(0, signatureClickPos.x - 60),
      y: Math.max(0, signatureClickPos.y - 30),
      width: 120,
      height: 60,
      fontSize: 15,
      pageIndex: currentPageIndex,
    };

    setElements((prev) => [...prev, newElement]);
    setSelectedElementId(newElement.id);
    setShowSignatureModal(false);
    setSignatureClickPos(null);
  };

  const handlePageChange = (newIndex: number) => {
    if (!currentUser && newIndex > 0) {
      if (Platform.OS === 'web') {
        alert('משתמשים אורחים יכולים לערוך את עמוד 1 בלבד. הרשם בחינם כדי לערוך את כל עמודי הקובץ!');
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
        '⏳ טוען קובץ PDF...',
        'אורח? הרשם בחינם כדי לבטל את זמן ההמתנה בהעלאת קבצים!',
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

      let bytes: ArrayBuffer;
      if (Platform.OS === 'web') {
        const res = await fetch(uri);
        bytes = await res.arrayBuffer();
      } else {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        bytes = _base64ToArrayBuffer(base64);
      }

      setPdfBytes(bytes);

      const PDFDocument = await loadPDFDocument();
      if (!PDFDocument) throw new Error('מנוע ה-PDF לא נטען');

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
      Alert.alert('שגיאה', err?.message || 'אירעה שגיאה בטעינת הקובץ');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewPdf = () => {
    if (!pdfBytes) return;

    if (!currentUser) {
      triggerAd(
        10,
        '👁️ מכין תצוגה מקדימה...',
        'אורחים צופים בפרסומת קצרה. הרשמה בחינם תפתח תצוגה מקדימה מיידית!',
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

      const imageUri = await renderPdfPageToImageBase64(watermarkedPdfBytes, currentPageIndex + 1);
      setPreviewImageUri(imageUri);
      setShowPreviewModal(true);
    } catch (error: any) {
      Alert.alert('שגיאה', error?.message || 'אירעה שגיאה ביצירת תצוגה מקדימה');
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
            alert(data.error || 'הגעת למכסת העריכות שלך.');
            setShowAuthModal(true);
          } else {
            Alert.alert(
              'המכסה הסתיימה ⚠️',
              data.error || 'הגעת למכסת העריכות שלך.',
              [
                { text: 'סגור' },
                { text: 'רכוש חבילת 10 עריכות ב-₪9.90 🎟️', onPress: () => setShowAuthModal(true) },
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
        const filePath = `${FileSystem.documentDirectory}DocFlow_${Date.now()}.pdf`;
        await FileSystem.writeAsStringAsync(filePath, base64Save, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Sharing.shareAsync(filePath);
      }

      if (Platform.OS === 'web') {
        alert('הקובץ הורד בהצלחה! 🎉');
      } else {
        Alert.alert('הצלחה!', 'הקובץ הורד בהצלחה.');
      }
    } catch (error: any) {
      Alert.alert('שגיאה', error?.message || 'אירעה שגיאה בהורדת הקובץ');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthStep1 = async () => {
    setUserAlreadyExistsError(false);

    if (!authEmail || !authPassword) {
      if (Platform.OS === 'web') alert('נא למלא מייל וסיסמה');
      else Alert.alert('שגיאה', 'נא למלא מייל וסיסמה');
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
        setCurrentUser(data.user);
        setShowAuthModal(false);

        if (Platform.OS === 'web') {
          alert(`שלום ${displayName} 👋, ברוך הבא!`);
        } else {
          Alert.alert('ברוך הבא! 👋', `שלום ${displayName}`);
        }
      } catch (err: any) {
        if (Platform.OS === 'web') alert(err.message || 'שגיאה בהתחברות');
        else Alert.alert('שגיאה בהתחברות', err.message);
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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.userExists || (data.error && data.error.includes('קיים'))) {
          setUserAlreadyExistsError(true);
          return;
        }

        if (Platform.OS === 'web') {
          alert(data.error || 'שגיאה בהרשמה');
        } else {
          Alert.alert('שגיאה', data.error || 'שגיאה בהרשמה');
        }
        return;
      }

      const displayName = data.user.fullName || data.user.full_name || authFullName || data.user.email;
      setCurrentUser(data.user);
      setShowAuthModal(false);
      setAuthStep(1);

      if (Platform.OS === 'web') {
        alert(`ברוך הבא ${displayName}! 🎉 ההרשמה הושלמה.`);
      } else {
        Alert.alert('ההרשמה הושלמה! 🎉', `ברוך הבא ${displayName}!`);
      }
    } catch (err: any) {
      console.error('Register fetch error:', err);
      if (Platform.OS === 'web') {
        alert(err.message || 'שגיאה בהתחברות לשרת');
      } else {
        Alert.alert('שגיאה', err.message || 'שגיאה בהתחברות לשרת');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContainerPress = (e: any) => {
    if (selectedElementId) {
      setSelectedElementId(null);
      return;
    }

    if (!pdfUri) return;

    let clickX = 0;
    let clickY = 0;

    if (Platform.OS === 'web') {
      const rect = e.currentTarget.getBoundingClientRect();
      clickX = e.clientX - rect.left;
      clickY = e.clientY - rect.top;
    } else {
      clickX = e.nativeEvent?.locationX || 0;
      clickY = e.nativeEvent?.locationY || 0;
    }

    if (activeTool === 'text') {
      setActiveInput({ x: clickX, y: clickY });
    } else if (activeTool === 'signature') {
      setSignatureClickPos({ x: clickX, y: clickY });
      setShowSignatureModal(true);
    } else {
      const newElement: EditorElement = {
        id: Date.now().toString(),
        type: activeTool,
        x: Math.max(0, clickX - 60),
        y: Math.max(0, clickY - 10),
        width: 120,
        height: 20,
        fontSize: 15,
        pageIndex: currentPageIndex,
      };

      setElements((prev) => [...prev, newElement]);
      setSelectedElementId(newElement.id);
    }
  };

  const handleAddTextElement = () => {
    if (!activeInput || !currentText.trim()) return;

    const newElement: EditorElement = {
      id: Date.now().toString(),
      type: 'text',
      text: currentText,
      x: activeInput.x,
      y: activeInput.y,
      width: 120,
      height: 20,
      fontSize: 15,
      pageIndex: currentPageIndex,
    };

    setElements((prev) => [...prev, newElement]);
    setSelectedElementId(newElement.id);
    setCurrentText('');
    setActiveInput(null);
  };

  const updateElementProps = (id: string, updates: Partial<EditorElement>) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...updates } : el)));
  };

  const buildModifiedPdfBytes = async (isPreviewMode: boolean = false): Promise<Uint8Array | null> => {
    if (!pdfBytes || !pdfDimensions) return null;

    const PDFDocument = await loadPDFDocument();
    if (!PDFDocument) throw new Error('מנוע ה-PDF לא זמין');

    const pdfDoc = await PDFDocument.load(pdfBytes.slice(0));
    const pages = pdfDoc.getPages();

    const scaleX = pdfDimensions.width / CONTAINER_WIDTH;
    const scaleY = pdfDimensions.height / containerHeight;

    for (const el of elements) {
      const targetPage = pages[el.pageIndex] || pages[0];

      if (el.type === 'text' && el.text) {
        const { base64Png, width: imgW, height: imgH } = await renderCrispTextToCanvas(el.text, el.fontSize);
        if (!base64Png) continue;

        const imageBytes = _base64ToArrayBuffer(base64Png.replace(/^data:image\/png;base64,/, ''));
        const pngImage = await pdfDoc.embedPng(imageBytes);

        const finalImgWidth = imgW * scaleX;
        const finalImgHeight = imgH * scaleY;

        const finalPdfX = el.x * scaleX;
        const finalPdfY = pdfDimensions.height - (el.y * scaleY) - finalImgHeight;

        targetPage.drawImage(pngImage, {
          x: Math.max(0, finalPdfX),
          y: finalPdfY,
          width: finalImgWidth,
          height: finalImgHeight,
        });
      } else if (el.type === 'signature' && el.imageUri) {
        const imageBytes = _base64ToArrayBuffer(el.imageUri.replace(/^data:image\/png;base64,/, ''));
        const pngImage = await pdfDoc.embedPng(imageBytes);

        const finalWidth = el.width * scaleX;
        const finalHeight = el.height * scaleY;

        const finalPdfX = el.x * scaleX;
        const finalPdfY = pdfDimensions.height - (el.y * scaleY) - finalHeight;

        targetPage.drawImage(pngImage, {
          x: Math.max(0, finalPdfX),
          y: finalPdfY,
          width: finalWidth,
          height: finalHeight,
        });
      } else if (el.type === 'highlight' || el.type === 'redact') {
        const { base64Png } = await renderShapeToCanvas(el.type, el.width, el.height);
        if (!base64Png) continue;

        const imageBytes = _base64ToArrayBuffer(base64Png.replace(/^data:image\/png;base64,/, ''));
        const pngImage = await pdfDoc.embedPng(imageBytes);

        const finalWidth = el.width * scaleX;
        const finalHeight = el.height * scaleY;

        const finalPdfX = el.x * scaleX;
        const finalPdfY = pdfDimensions.height - (el.y * scaleY) - finalHeight;

        targetPage.drawImage(pngImage, {
          x: Math.max(0, finalPdfX),
          y: finalPdfY,
          width: finalWidth,
          height: finalHeight,
        });
      }
    }

    const isPaidUser = currentUser && (currentUser.plan === 'micro_pass' || currentUser.plan === 'premium');
    if (isPreviewMode && !isPaidUser) {
      const { base64Png: watermarkPng, width: wW, height: wH } = await renderBrandedWatermarkCanvas();
      if (watermarkPng) {
        const wmBytes = _base64ToArrayBuffer(watermarkPng.replace(/^data:image\/png;base64,/, ''));
        const wmImage = await pdfDoc.embedPng(wmBytes);

        for (const page of pages) {
          const { width: pW, height: pH } = page.getSize();
          page.drawImage(wmImage, {
            x: (pW - wW * 1.2) / 2,
            y: (pH - wH * 1.2) / 2,
            width: wW * 1.2,
            height: wH * 1.2,
          });
        }
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
    <ScrollView contentContainerStyle={styles.container}>
      {/* 🌟 Header משודרג */}
      <View style={styles.headerBar}>
        <DocFlowLogo />

        <View style={styles.langBar}>
          <TouchableOpacity onPress={() => setLang('he')} style={[styles.langBtn, lang === 'he' && styles.activeLangBtn]}><Text style={[styles.langText, lang === 'he' && styles.activeLangText]}>עב</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setLang('en')} style={[styles.langBtn, lang === 'en' && styles.activeLangBtn]}><Text style={[styles.langText, lang === 'en' && styles.activeLangText]}>EN</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setLang('ar')} style={[styles.langBtn, lang === 'ar' && styles.activeLangBtn]}><Text style={[styles.langText, lang === 'ar' && styles.activeLangText]}>عرب</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setLang('am')} style={[styles.langBtn, lang === 'am' && styles.activeLangBtn]}><Text style={[styles.langText, lang === 'am' && styles.activeLangText]}>አማ</Text></TouchableOpacity>
        </View>

        {currentUser ? (
          <View style={styles.userInfoBadge}>
            <Text style={styles.userEmailText}>
              👤 {currentUser.fullName || currentUser.full_name || currentUser.email}
            </Text>
            <Text style={[styles.userPlanBadge, currentUser.plan !== 'free' && styles.paidPlanBadge]}>
              {currentUser.plan.toUpperCase()}
            </Text>
            <TouchableOpacity onPress={() => setCurrentUser(null)}>
              <Text style={styles.logoutText}>{t.logout}</Text>
            </TouchableOpacity>
          </View>
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

      {/* 📢 באנר עליון למבקרים */}
      {!currentUser && (
        <View style={styles.topAdBannerSlot}>
          <Text style={styles.adSlotLabel}>Sponsored</Text>
          <Text style={styles.topAdBannerText}>⚡ {t.guestNotice}</Text>
        </View>
      )}

      {/* 🏠 Hero Section */}
      {!pdfUri ? (
        <View style={styles.heroLandingCard}>
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
        /* 📝 אזור העריכה */
        <View style={styles.editorArea}>
          <TouchableOpacity style={styles.changeFileBtn} onPress={pickDocument} disabled={loading}>
            <Text style={styles.changeFileBtnText}>{t.changePdf}</Text>
          </TouchableOpacity>

          {/* סרגל כלים */}
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
          </View>

          {renderPaginationBar()}

          <View style={[styles.pdfViewerContainer, { width: CONTAINER_WIDTH, height: containerHeight }]}>
            {Platform.OS === 'web' ? (
              <canvas
                ref={canvasRef}
                style={{ width: CONTAINER_WIDTH, height: containerHeight, display: 'block' }}
              />
            ) : (
              <View style={styles.mobilePlaceholder}><Text>[תצוגת PDF]</Text></View>
            )}

            <Pressable style={StyleSheet.absoluteFillObject} onPress={handleContainerPress} />

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
                  onUpdateProps={updateElementProps}
                  onRemove={(id) => {
                    setElements((prev) => prev.filter((e) => e.id !== id));
                    if (selectedElementId === id) setSelectedElementId(null);
                  }}
                />
              ))}

            {activeInput && (
              <View style={[styles.inputPopup, { left: Math.min(CONTAINER_WIDTH - 200, Math.max(10, activeInput.x)), top: activeInput.y }]}>
                <TextInput
                  style={styles.popupInput}
                  placeholder="טקסט / Text / ጽሑፍ / نص..."
                  value={currentText}
                  onChangeText={setCurrentText}
                  autoFocus
                />
                <TouchableOpacity style={styles.addBtn} onPress={handleAddTextElement}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>הוסף</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#64748b' }]} onPress={() => setActiveInput(null)}>
                  <Text style={{ color: '#fff' }}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={{ marginTop: 12 }}>
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

      {/* 🖋️ Modal פד חתימה */}
      <Modal visible={showSignatureModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 450 }]}>
            <Text style={styles.modalTitle}>{t.signModalTitle}</Text>

            {Platform.OS === 'web' ? (
              <canvas
                ref={initSignatureCanvas}
                width={380}
                height={180}
                style={styles.signatureCanvasBox}
              />
            ) : (
              <View style={[styles.signatureCanvasBox, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text>[פד חתימה במגע למובייל]</Text>
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

      {/* 📺 Modal פרסומת */}
      <Modal visible={showAdModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{adTitle}</Text>
            <Text style={styles.modalSubtitle}>{adMessage}</Text>

            <View style={styles.adBannerBox}>
              <Text style={styles.adPlaceholderText}>[ שטח פרסומת AdSense / Rewarded Ad ]</Text>
            </View>

            {!isAdFinished ? (
              <View style={styles.timerBox}>
                <ActivityIndicator size="small" color="#0052D4" />
                <Text style={styles.timerText}>זמין בעוד <Text style={styles.timerCount}>{adTimer}</Text> שניות...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.modalDownloadBtn} onPress={handleAdFinishedAction}>
                <Text style={styles.modalDownloadBtnText}>✅ המשך כעת</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAdModal(false)}>
              <Text style={styles.modalCancelBtnText}>ביטול</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🔐 Modal הרשמה ומסלולים */}
      <Modal visible={showAuthModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 540 }]}>
            <Text style={styles.modalTitle}>
              {authMode === 'register' ? `🎯 הרשמה ל-DocFlow` : '🔑 התחברות'}
            </Text>

            {userAlreadyExistsError && (
              <View style={styles.userExistsWarningBox}>
                <Text style={styles.warningTitle}>⚠️ המייל כבר רשום במערכת!</Text>
                <Text style={styles.warningText}>כתובת המייל "{authEmail}" כבר קיימת ב-DocFlow.</Text>
                <TouchableOpacity
                  style={styles.switchLoginBtn}
                  onPress={() => {
                    setUserAlreadyExistsError(false);
                    setAuthStep(1);
                    setAuthMode('login');
                  }}
                >
                  <Text style={styles.switchLoginBtnText}>🔑 לחץ כאן למעבר להתחברות</Text>
                </TouchableOpacity>
              </View>
            )}

            {authStep === 1 ? (
              <>
                <TextInput
                  style={styles.authInput}
                  placeholder="כתובת מייל"
                  value={authEmail}
                  onChangeText={(text) => {
                    setAuthEmail(text);
                    setUserAlreadyExistsError(false);
                  }}
                  keyboardType="email-address"
                />
                <TextInput
                  style={styles.authInput}
                  placeholder="סיסמה"
                  secureTextEntry
                  value={authPassword}
                  onChangeText={setAuthPassword}
                />
                <TouchableOpacity style={styles.modalDownloadBtn} onPress={handleAuthStep1}>
                  <Text style={styles.modalDownloadBtnText}>
                    {authMode === 'register' ? 'המשך לבחירת שם ומסלול ➔' : 'התחבר'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.authInput}
                  placeholder="שם משתמש"
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
                    <Text style={styles.planPrice}>חינם</Text>
                    <Text style={styles.planDesc}>{t.basicPlanDesc}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.planCard, selectedPlan === 'micro_pass' && styles.selectedPlanCard]}
                    onPress={() => setSelectedPlan('micro_pass')}
                  >
                    <Text style={styles.planName}>{t.passPlan}</Text>
                    <Text style={styles.planPrice}>₪9.90 חד-פעמי</Text>
                    <Text style={styles.planDesc}>{t.passPlanDesc}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.planCard, selectedPlan === 'premium' && styles.selectedPlanCard]}
                    onPress={() => setSelectedPlan('premium')}
                  >
                    <Text style={styles.planName}>{t.premiumPlan}</Text>
                    <Text style={styles.planPrice}>₪49/חודש</Text>
                    <Text style={styles.planDesc}>{t.premiumPlanDesc}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.modalDownloadBtn} onPress={handleFinalRegister}>
                  <Text style={styles.modalDownloadBtnText}>סיום הרשמה והתחל ✅</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              onPress={() => {
                setUserAlreadyExistsError(false);
                setAuthStep(1);
                setAuthMode(authMode === 'register' ? 'login' : 'register');
              }}
              style={{ marginTop: 12 }}
            >
              <Text style={{ color: '#0052D4', fontWeight: 'bold' }}>
                {authMode === 'register' ? 'כבר נרשמת? התחבר כאן' : 'אין לך חשבון? הרשם כאן'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.modalCancelBtn, { marginTop: 10 }]} onPress={() => setShowAuthModal(false)}>
              <Text style={styles.modalCancelBtnText}>{t.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 👁️ Modal תצוגה מקדימה */}
      <Modal visible={showPreviewModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 640 }]}>
            <Text style={styles.modalTitle}>{t.preview}</Text>
            {previewImageUri && (
              <View style={styles.previewImageContainer}>
                <Image source={{ uri: previewImageUri }} style={{ width: '100%', height: 420 }} resizeMode="contain" />
              </View>
            )}
            <TouchableOpacity style={[styles.modalDownloadBtn, { marginTop: 15 }]} onPress={() => setShowPreviewModal(false)}>
              <Text style={styles.modalDownloadBtnText}>{t.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function DraggableItem({
  element,
  isSelected,
  onSelect,
  containerBounds,
  onUpdatePos,
  onUpdateProps,
  onRemove,
}: {
  element: EditorElement;
  isSelected: boolean;
  onSelect: () => void;
  containerBounds: { width: number; height: number };
  onUpdatePos: (id: string, x: number, y: number) => void;
  onUpdateProps: (id: string, updates: Partial<EditorElement>) => void;
  onRemove: (id: string) => void;
}) {
  const startPos = useRef({ x: element.x, y: element.y });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startPos.current = { x: element.x, y: element.y };
        onSelect();
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(0, Math.min(containerBounds.width - 20, startPos.current.x + gestureState.dx));
        const newY = Math.max(0, Math.min(containerBounds.height - 15, startPos.current.y + gestureState.dy));
        onUpdatePos(element.id, newX, newY);
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
      ]}
    >
      {isSelected && (
        <View style={styles.floatingActionBar}>
          {element.type === 'text' ? (
            <>
              <TouchableOpacity
                style={styles.actionBadgeBtn}
                onPress={() => onUpdateProps(element.id, { fontSize: Math.max(10, element.fontSize - 2) })}
              >
                <Text style={styles.actionBadgeText}>A-</Text>
              </TouchableOpacity>
              <Text style={styles.fontSizeText}>{element.fontSize}px</Text>
              <TouchableOpacity
                style={styles.actionBadgeBtn}
                onPress={() => onUpdateProps(element.id, { fontSize: Math.min(40, element.fontSize + 2) })}
              >
                <Text style={styles.actionBadgeText}>A+</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.actionBadgeBtn}
                onPress={() => onUpdateProps(element.id, { width: Math.max(20, element.width - 15) })}
              >
                <Text style={styles.actionBadgeText}>צר-</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBadgeBtn}
                onPress={() => onUpdateProps(element.id, { width: Math.min(400, element.width + 15) })}
              >
                <Text style={styles.actionBadgeText}>רחב+</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={[styles.actionBadgeBtn, styles.deleteBadgeBtn]} onPress={() => onRemove(element.id)}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {element.type === 'text' && (
        <>
          <Text style={[styles.overlayText, { fontSize: element.fontSize, lineHeight: element.fontSize * 1.2 }]}>
            {element.text}
          </Text>
          {isSelected && <View style={styles.baselineGuide} />}
        </>
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
            isSelected && styles.selectedBoxBorder,
          ]}
        />
      )}

      {element.type === 'redact' && (
        <View
          style={[
            styles.redactBox,
            { width: element.width, height: element.height },
            isSelected && styles.selectedBoxBorder,
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

async function renderPdfPageToImageBase64(arrayBuffer: ArrayBuffer, pageNumber: number = 1): Promise<string> {
  if (typeof window === 'undefined') return '';
  const canvas = document.createElement('canvas');
  let pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) return '';

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
  const page = await pdf.getPage(pageNumber);

  const viewport = page.getViewport({ scale: 1.5 });
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/png');
}

async function renderBrandedWatermarkCanvas() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return { base64Png: '', width: 0, height: 0 };
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { base64Png: '', width: 0, height: 0 };

  const width = 500;
  const height = 220;
  canvas.width = width;
  canvas.height = height;

  ctx.translate(width / 2, height / 2);
  ctx.rotate((-22 * Math.PI) / 180);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#0052D4';
  ctx.beginPath();
  ctx.roundRect(-30, -85, 60, 75, 8);
  ctx.fill();

  ctx.fillStyle = '#FF512F';
  ctx.beginPath();
  ctx.arc(15, -20, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.font = 'bold 36px Arial, sans-serif';
  ctx.fillStyle = 'rgba(10, 37, 64, 0.30)';
  ctx.fillText('DocFlow', 0, 20);

  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillStyle = 'rgba(217, 119, 6, 0.40)';
  ctx.fillText('PREVIEW ONLY • דוגמא ללא תוקף', 0, 50);

  return { base64Png: canvas.toDataURL('image/png'), width, height };
}

async function renderCrispTextToCanvas(text: string, fontSize: number = 15) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return { base64Png: '', width: 0, height: 0 };
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { base64Png: '', width: 0, height: 0 };

  const dpiScale = 3;
  const fontStyle = `bold ${fontSize}px Arial, sans-serif`;
  ctx.font = fontStyle;

  const textMetrics = ctx.measureText(text);
  const displayWidth = Math.ceil(textMetrics.width) + 2;
  const displayHeight = Math.ceil(fontSize * 1.25);

  canvas.width = displayWidth * dpiScale;
  canvas.height = displayHeight * dpiScale;
  ctx.scale(dpiScale, dpiScale);

  ctx.font = fontStyle;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000000';
  ctx.fillText(text, 1, 0);

  return { base64Png: canvas.toDataURL('image/png'), width: displayWidth, height: displayHeight };
}

async function renderShapeToCanvas(type: 'highlight' | 'redact', width: number, height: number) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return { base64Png: '' };
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { base64Png: '' };

  const dpiScale = 2;
  canvas.width = width * dpiScale;
  canvas.height = height * dpiScale;
  ctx.scale(dpiScale, dpiScale);

  if (type === 'redact') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = 'rgba(255, 235, 50, 0.5)';
    ctx.fillRect(0, 0, width, height);
  }

  return { base64Png: canvas.toDataURL('image/png') };
}

function _base64ToArrayBuffer(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
}

function _uint8ArrayToBase64(uint8: Uint8Array): string {
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 20, backgroundColor: '#f8fafc', alignItems: 'center', minHeight: '100%' },
  
  headerBar: { width: '100%', maxWidth: CONTAINER_WIDTH, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, backgroundColor: '#ffffff', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadgeIcon: { backgroundColor: '#0052D4', paddingVertical: 4, paddingHorizontal: 7, borderRadius: 6 },
  logoBadgeText: { color: '#ffffff', fontWeight: '900', fontSize: 11 },
  logoText: { fontSize: 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  logoHighlight: { color: '#0052D4' },

  langBar: { flexDirection: 'row', gap: 2, backgroundColor: '#f1f5f9', borderRadius: 8, padding: 2 },
  langBtn: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  activeLangBtn: { backgroundColor: '#0052D4' },
  langText: { fontSize: 11, fontWeight: 'bold', color: '#64748b' },
  activeLangText: { color: '#ffffff' },

  authBtn: { backgroundColor: '#0052D4', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  authBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  userInfoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userEmailText: { fontSize: 12, fontWeight: 'bold', color: '#1e293b' },
  userPlanBadge: { backgroundColor: '#64748b', color: '#fff', fontSize: 9, fontWeight: 'bold', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },
  paidPlanBadge: { backgroundColor: '#16a34a' },
  logoutText: { color: '#dc2626', fontSize: 11, fontWeight: 'bold', marginRight: 2 },

  topAdBannerSlot: { width: '100%', maxWidth: CONTAINER_WIDTH, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 10, padding: 10, marginBottom: 14, alignItems: 'center' },
  adSlotLabel: { fontSize: 9, fontWeight: 'bold', color: '#3b82f6', textTransform: 'uppercase', marginBottom: 2, alignSelf: 'flex-start' },
  topAdBannerText: { fontSize: 12, color: '#1e40af', fontWeight: '600', textAlign: 'center' },

  heroLandingCard: { width: '100%', maxWidth: CONTAINER_WIDTH, backgroundColor: '#ffffff', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 8 },
  heroSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  heroUploadBtn: { backgroundColor: '#0052D4', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 10, width: '100%', alignItems: 'center', marginBottom: 24, elevation: 3 },
  heroUploadBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  
  featureGrid: { flexDirection: 'row', gap: 8, width: '100%' },
  featureItem: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  featureIcon: { fontSize: 22, marginBottom: 4 },
  featureTitle: { fontSize: 12, fontWeight: 'bold', color: '#1e293b', marginBottom: 2, textAlign: 'center' },
  featureDesc: { fontSize: 10, color: '#64748b', textAlign: 'center' },

  editorArea: { alignItems: 'center', marginTop: 4, width: '100%', maxWidth: CONTAINER_WIDTH },
  changeFileBtn: { backgroundColor: '#e2e8f0', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, marginBottom: 12 },
  changeFileBtnText: { fontSize: 12, fontWeight: 'bold', color: '#334155' },
  
  toolbarRow: { flexDirection: 'row', gap: 6, marginBottom: 12, backgroundColor: '#ffffff', padding: 6, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', width: '100%', justifyContent: 'space-around' },
  toolBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#f8fafc', alignItems: 'center', borderColor: '#e2e8f0', borderWidth: 1 },
  activeToolBtn: { backgroundColor: '#0052D4', borderColor: '#0052D4' },
  toolBtnText: { fontSize: 12, fontWeight: 'bold', color: '#334155' },
  activeToolBtnText: { color: '#ffffff' },

  signatureCanvasBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    cursor: 'crosshair',
    touchAction: 'none',
  },

  button: { backgroundColor: '#0052D4', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  buttonText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },

  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#cbd5e1', width: '100%' },
  pageBtn: { backgroundColor: '#0052D4', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  disabledBtn: { backgroundColor: '#cbd5e1' },
  pageBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  pageBadgeTextContainer: { backgroundColor: '#f1f5f9', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  pageIndicatorText: { fontSize: 12, fontWeight: 'bold', color: '#1e293b' },

  pdfViewerContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, position: 'relative', overflow: 'hidden' },
  mobilePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e2e8f0' },
  
  draggableItemWrapper: {
    position: 'absolute',
    alignSelf: 'flex-start',
    zIndex: 10,
    cursor: 'move',
    // @ts-ignore
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'none',
  },
  overlayText: {
    color: '#000',
    fontWeight: 'bold',
    fontFamily: 'Arial, sans-serif',
    paddingHorizontal: 0,
    margin: 0,
    // @ts-ignore
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  highlightBox: { backgroundColor: 'rgba(255, 235, 50, 0.45)' },
  redactBox: { backgroundColor: '#000000' },
  selectedBoxBorder: { borderWidth: 1, borderColor: '#0052D4', borderStyle: 'dashed' },
  baselineGuide: { position: 'absolute', bottom: -2, left: 0, right: 0, height: 2, backgroundColor: '#0052D4' },
  
  floatingActionBar: { position: 'absolute', top: -32, left: 0, backgroundColor: '#1e293b', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 99 },
  actionBadgeBtn: { backgroundColor: '#334155', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  deleteBadgeBtn: { backgroundColor: '#dc2626' },
  actionBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  fontSizeText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },

  inputPopup: { position: 'absolute', backgroundColor: '#fff', padding: 6, borderRadius: 6, borderWidth: 1, borderColor: '#0052D4', flexDirection: 'row', gap: 6, zIndex: 999 },
  popupInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 4, paddingHorizontal: 8, width: 150, height: 32, fontSize: 12, textAlign: 'right' },
  addBtn: { backgroundColor: '#0052D4', paddingHorizontal: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 4 },
  actionButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 16, width: '100%' },
  actionBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  previewBtn: { backgroundColor: '#d97706' },
  downloadBtn: { backgroundColor: '#16a34a' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, alignItems: 'center', elevation: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  modalSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginTop: 10, marginBottom: 8, alignSelf: 'flex-start' },
  authInput: { width: '100%', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, height: 40, marginBottom: 10, textAlign: 'right' },

  userExistsWarningBox: {
    width: '100%',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    alignItems: 'center',
  },
  warningTitle: { fontSize: 14, fontWeight: 'bold', color: '#991b1b', marginBottom: 4 },
  warningText: { fontSize: 12, color: '#7f1d1d', marginBottom: 8, textAlign: 'center' },
  switchLoginBtn: { backgroundColor: '#dc2626', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  switchLoginBtnText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },

  plansContainer: { flexDirection: 'row', gap: 8, width: '100%', marginVertical: 14 },
  planCard: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, alignItems: 'center', backgroundColor: '#f8fafc' },
  selectedPlanCard: { borderColor: '#0052D4', backgroundColor: '#eff6ff', borderWidth: 2 },
  planName: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  planPrice: { fontSize: 11, fontWeight: 'bold', color: '#0052D4', marginVertical: 4 },
  planDesc: { fontSize: 10, color: '#64748b', textAlign: 'center' },

  previewImageContainer: { width: '100%', backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  adBannerBox: { width: '100%', height: 180, backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  adPlaceholderText: { fontSize: 15, fontWeight: 'bold', color: '#94a3b8' },
  timerBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  timerText: { fontSize: 14, fontWeight: 'bold', color: '#334155' },
  timerCount: { color: '#0052D4', fontSize: 16 },
  modalDownloadBtn: { backgroundColor: '#16a34a', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, width: '100%', alignItems: 'center' },
  modalDownloadBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  modalCancelBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  modalCancelBtnText: { color: '#dc2626', fontSize: 13, fontWeight: 'bold' },
});
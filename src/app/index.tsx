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

type ToolType = 'text' | 'highlight' | 'redact';
type PlanType = 'free' | 'pro' | 'premium';

interface User {
  id: number;
  email: string;
  plan: PlanType;
}

interface EditorElement {
  id: string;
  type: ToolType;
  text?: string;
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

const CONTAINER_WIDTH = 600;
const AD_DURATION = 20;
const API_URL = 'http://localhost:5000/api'; // כתובת השרת המקומי

export default function PdfEditorScreen() {
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

  // 👤 State משתמש ואותנטיקציה
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('free');

  // 📺 State פרסומת
  const [showAdModal, setShowAdModal] = useState(false);
  const [adTimer, setAdTimer] = useState(AD_DURATION);
  const [isAdFinished, setIsAdFinished] = useState(false);

  // 👁️ State תצוגה מקדימה
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

  // 🔐 פונקציית התחברות / הרשמה
  const handleAuthSubmit = async () => {
    if (!authEmail || !authPassword) {
      Alert.alert('שגיאה', 'נא למלא מייל וסיסמה');
      return;
    }

    setLoading(true);
    try {
      const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login';
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
          plan: selectedPlan,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה באותנטיקציה');

      setCurrentUser(data.user);
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
      Alert.alert('ברוך הבא!', `מחובר כאל: ${data.user.email} (מסלול: ${data.user.plan.toUpperCase()})`);
    } catch (err: any) {
      Alert.alert('שגיאה', err.message);
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
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
      console.error('Error picking document:', err);
      Alert.alert('שגיאה', err?.message || 'אירעה שגיאה בטעינת הקובץ');
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
        const { base64Png, width: imgW, height: imgH } = await renderCrispTextToCanvas(
          el.text,
          el.fontSize
        );
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

    // 🔒 מנויי Pro ו-Premium מקבלים תצוגה מקדימה נקייה ללא סימון מים!
    const isPaidUser = currentUser && (currentUser.plan === 'pro' || currentUser.plan === 'premium');
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

  const handlePreviewPdf = async () => {
    if (!pdfBytes) return;
    setLoading(true);

    try {
      const watermarkedPdfBytes = await buildModifiedPdfBytes(true);
      if (!watermarkedPdfBytes) return;

      const imageUri = await renderPdfPageToImageBase64(watermarkedPdfBytes, currentPageIndex + 1);
      setPreviewImageUri(imageUri);
      setShowPreviewModal(true);
    } catch (error: any) {
      console.error('Error previewing PDF:', error);
      Alert.alert('שגיאה', error?.message || 'אירעה שגיאה ביצירת תצוגה מקדימה');
    } finally {
      setLoading(false);
    }
  };

  // 🚀 טריגר ההורדה: מנויים בתשלום מורידים מיד, מנוי חינם רואה פרסומת!
  const triggerDownloadProcess = () => {
    if (!pdfBytes) return;

    const isPaidUser = currentUser && (currentUser.plan === 'pro' || currentUser.plan === 'premium');
    if (isPaidUser) {
      executeFinalDownload(); // הורדה ישירה ללא פרסומת!
    } else {
      setAdTimer(AD_DURATION);
      setIsAdFinished(false);
      setShowAdModal(true);
    }
  };

  const executeFinalDownload = async () => {
    setShowAdModal(false);
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

      Alert.alert('הצלחה!', 'הקובץ הורד בהצלחה.');
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      Alert.alert('שגיאה', error?.message || 'אירעה שגיאה בהורדת הקובץ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 👤 סרגל עליון עם פרטי משתמש וכפתור התחברות */}
      <View style={styles.headerBar}>
        <Text style={styles.title}>DocFlow 📄✍️</Text>
        
        {currentUser ? (
          <View style={styles.userInfoBadge}>
            <Text style={styles.userEmailText}>{currentUser.email}</Text>
            <Text style={[styles.userPlanBadge, currentUser.plan !== 'free' && styles.paidPlanBadge]}>
              {currentUser.plan.toUpperCase()}
            </Text>
            <TouchableOpacity onPress={() => setCurrentUser(null)}>
              <Text style={styles.logoutText}>יציאה</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.authBtn} onPress={() => setShowAuthModal(true)}>
            <Text style={styles.authBtnText}>🔑 התחבר / הרשם</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={pickDocument} disabled={loading}>
        <Text style={styles.buttonText}>{pdfUri ? 'החלף קובץ PDF' : 'העלה קובץ PDF'}</Text>
      </TouchableOpacity>

      {pdfUri && (
        <View style={styles.editorArea}>
          <View style={styles.toolbarRow}>
            <TouchableOpacity
              style={[styles.toolBtn, activeTool === 'text' && styles.activeToolBtn]}
              onPress={() => setActiveTool('text')}
            >
              <Text style={styles.toolBtnText}>✍️ הוספת טקסט</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolBtn, activeTool === 'highlight' && styles.activeToolBtn]}
              onPress={() => setActiveTool('highlight')}
            >
              <Text style={styles.toolBtnText}>🖍️ מרקור</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolBtn, activeTool === 'redact' && styles.activeToolBtn]}
              onPress={() => setActiveTool('redact')}
            >
              <Text style={styles.toolBtnText}>⬛ צנזור (השחרה)</Text>
            </TouchableOpacity>
          </View>

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
                  placeholder="הקלד טקסט..."
                  value={currentText}
                  onChangeText={setCurrentText}
                  autoFocus
                />
                <TouchableOpacity style={styles.addBtn} onPress={handleAddTextElement}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>הוסף</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#888' }]} onPress={() => setActiveInput(null)}>
                  <Text style={{ color: '#fff' }}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.previewBtn]} onPress={handlePreviewPdf} disabled={loading}>
              <Text style={styles.buttonText}>👁️ תצוגה מקדימה</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.downloadBtn]} onPress={triggerDownloadProcess} disabled={loading}>
              <Text style={styles.buttonText}>
                {currentUser && currentUser.plan !== 'free' ? '⚡ הורדה מהירה (ללא פרסומת)' : '💾 הורד PDF סופי'}
              </Text>
            </TouchableOpacity>
          </View>

          {loading && <ActivityIndicator size="large" color="#0066cc" style={{ marginTop: 15 }} />}
        </View>
      )}

      {/* 🔐 Modal הרשמה/התחברות ומסלולי מנוי */}
      <Modal visible={showAuthModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 520 }]}>
            <Text style={styles.modalTitle}>
              {authMode === 'register' ? '🎯 הרשמה ובחירת מסלול' : '🔑 התחברות לחשבון'}
            </Text>

            <TextInput
              style={styles.authInput}
              placeholder="כתובת מייל"
              value={authEmail}
              onChangeText={setAuthEmail}
              keyboardType="email-address"
            />
            <TextInput
              style={styles.authInput}
              placeholder="סיסמה"
              secureTextEntry
              value={authPassword}
              onChangeText={setAuthPassword}
            />

            {/* בחירת מסלול בהרשמה */}
            {authMode === 'register' && (
              <View style={styles.plansContainer}>
                <TouchableOpacity
                  style={[styles.planCard, selectedPlan === 'free' && styles.selectedPlanCard]}
                  onPress={() => setSelectedPlan('free')}
                >
                  <Text style={styles.planName}>Basic</Text>
                  <Text style={styles.planPrice}>חינם</Text>
                  <Text style={styles.planDesc}>עם פרסומות</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.planCard, selectedPlan === 'pro' && styles.selectedPlanCard]}
                  onPress={() => setSelectedPlan('pro')}
                >
                  <Text style={styles.planName}>Pro ⚡</Text>
                  <Text style={styles.planPrice}>₪29/חודש</Text>
                  <Text style={styles.planDesc}>ללא פרסומות כלל</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.planCard, selectedPlan === 'premium' && styles.selectedPlanCard]}
                  onPress={() => setSelectedPlan('premium')}
                >
                  <Text style={styles.planName}>Premium 👑</Text>
                  <Text style={styles.planPrice}>₪59/חודש</Text>
                  <Text style={styles.planDesc}>חתימות + צינזור</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.modalDownloadBtn} onPress={handleAuthSubmit}>
              <Text style={styles.modalDownloadBtnText}>
                {authMode === 'register' ? 'הרשם והתחל' : 'התחבר'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: '#0066cc', fontWeight: 'bold' }}>
                {authMode === 'register' ? 'כבר נרשמת? התחבר כאן' : 'אין לך חשבון? הרשם כאן'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.modalCancelBtn, { marginTop: 10 }]} onPress={() => setShowAuthModal(false)}>
              <Text style={styles.modalCancelBtnText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 👁️ Modal תצוגה מקדימה */}
      <Modal visible={showPreviewModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 640 }]}>
            <Text style={styles.modalTitle}>👁️ תצוגה מקדימה</Text>
            {previewImageUri && (
              <View style={styles.previewImageContainer}>
                <Image source={{ uri: previewImageUri }} style={{ width: '100%', height: 420 }} resizeMode="contain" />
              </View>
            )}
            <TouchableOpacity style={[styles.modalDownloadBtn, { marginTop: 15 }]} onPress={() => setShowPreviewModal(false)}>
              <Text style={styles.modalDownloadBtnText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 📺 Modal הפרסומת */}
      <Modal visible={showAdModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>📢 פרסומת חסות</Text>
            <Text style={styles.modalSubtitle}>צפה בפרסומת כדי להוריד. (שדרג ל-Pro להורדה מיידית!)</Text>
            <View style={styles.adBannerBox}>
              <Text style={styles.adPlaceholderText}>[ כאן מופיעה הפרסומת שלך ]</Text>
            </View>
            {!isAdFinished ? (
              <View style={styles.timerBox}>
                <ActivityIndicator size="small" color="#0066cc" />
                <Text style={styles.timerText}>זמין בעוד <Text style={styles.timerCount}>{adTimer}</Text> שניות...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.modalDownloadBtn} onPress={executeFinalDownload}>
                <Text style={styles.modalDownloadBtnText}>✅ הורד קובץ כעת</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAdModal(false)}>
              <Text style={styles.modalCancelBtnText}>ביטול</Text>
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
  container: { padding: 24, paddingTop: 40, backgroundColor: '#f0f2f5', alignItems: 'center', minHeight: '100%' },
  headerBar: { width: '100%', maxWidth: CONTAINER_WIDTH, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  authBtn: { backgroundColor: '#0066cc', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  authBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  userInfoBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userEmailText: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  userPlanBadge: { backgroundColor: '#888', color: '#fff', fontSize: 10, fontWeight: 'bold', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },
  paidPlanBadge: { backgroundColor: '#2e7d32' },
  logoutText: { color: '#d32f2f', fontSize: 12, fontWeight: 'bold', marginRight: 4 },

  button: { backgroundColor: '#0066cc', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  buttonText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  editorArea: { alignItems: 'center', marginTop: 15 },
  
  toolbarRow: { flexDirection: 'row', gap: 8, marginBottom: 12, backgroundColor: '#ffffff', padding: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  toolBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6, backgroundColor: '#f5f5f5' },
  activeToolBtn: { backgroundColor: '#e3f2fd', borderWidth: 1, borderColor: '#0066cc' },
  toolBtnText: { fontSize: 13, fontWeight: 'bold', color: '#333' },

  pdfViewerContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, position: 'relative', overflow: 'hidden' },
  mobilePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e9ecef' },
  
  draggableItemWrapper: { position: 'absolute', alignSelf: 'flex-start', zIndex: 10, cursor: 'move', // @ts-ignore
    userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none' },
  overlayText: { color: '#000', fontWeight: 'bold', fontFamily: 'Arial, sans-serif', paddingHorizontal: 0, margin: 0, // @ts-ignore
    userSelect: 'none', WebkitUserSelect: 'none' },
  highlightBox: { backgroundColor: 'rgba(255, 235, 50, 0.45)' },
  redactBox: { backgroundColor: '#000000' },
  selectedBoxBorder: { borderWidth: 1, borderColor: '#0066cc', borderStyle: 'dashed' },
  baselineGuide: { position: 'absolute', bottom: -2, left: 0, right: 0, height: 2, backgroundColor: '#0066cc' },
  
  floatingActionBar: { position: 'absolute', top: -32, left: 0, backgroundColor: '#333333', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 99 },
  actionBadgeBtn: { backgroundColor: '#555555', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  deleteBadgeBtn: { backgroundColor: '#d32f2f' },
  actionBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  fontSizeText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },

  inputPopup: { position: 'absolute', backgroundColor: '#fff', padding: 6, borderRadius: 6, borderWidth: 1, borderColor: '#0066cc', flexDirection: 'row', gap: 6, zIndex: 999 },
  popupInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, paddingHorizontal: 8, width: 130, height: 32, fontSize: 12, textAlign: 'right' },
  addBtn: { backgroundColor: '#0066cc', paddingHorizontal: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 4 },
  actionButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  previewBtn: { backgroundColor: '#ff9800' },
  downloadBtn: { backgroundColor: '#2e7d32' },

  // Auth & Plans Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, alignItems: 'center', elevation: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12 },
  modalSubtitle: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 16 },
  authInput: { width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 12, height: 40, marginBottom: 10, textAlign: 'right' },
  
  plansContainer: { flexDirection: 'row', gap: 8, width: '100%', marginVertical: 14 },
  planCard: { flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 10, alignItems: 'center', backgroundColor: '#fafafa' },
  selectedPlanCard: { borderColor: '#0066cc', backgroundColor: '#e3f2fd', borderWidth: 2 },
  planName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  planPrice: { fontSize: 12, fontWeight: 'bold', color: '#0066cc', marginVertical: 4 },
  planDesc: { fontSize: 10, color: '#666', textAlign: 'center' },

  previewImageContainer: { width: '100%', backgroundColor: '#f5f5f5', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', overflow: 'hidden' },
  adBannerBox: { width: '100%', height: 180, backgroundColor: '#f5f5f5', borderWidth: 2, borderColor: '#e0e0e0', borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  adPlaceholderText: { fontSize: 15, fontWeight: 'bold', color: '#888' },
  timerBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  timerText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  timerCount: { color: '#0066cc', fontSize: 16 },
  modalDownloadBtn: { backgroundColor: '#2e7d32', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, width: '100%', alignItems: 'center' },
  modalDownloadBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  modalCancelBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  modalCancelBtnText: { color: '#d32f2f', fontSize: 13, fontWeight: 'bold' },
});
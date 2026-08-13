import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createAndExportPdf } from '../../services/pdfService';
import { InvoiceData } from '../../types';
import { useAppLanguage } from '../../languageStore';

const T = {
  he: { title: 'הפקת מסמך / חשבונית חדשה 📄', subtitle: '100% מקומי | ללא דליפת מידע | חדות וקטורית', client: 'שם הלקוח / חברה:', clientPh: 'הכנס שם...', tax: 'ח.פ / ע.מ:', taxPh: 'הכנס ח.פ...', desc: 'תיאור השירות:', descPh: 'תיאור...', price: 'מחיר (₪ לפני מע״מ):', generate: 'הפק ושמור PDF', error: 'שגיאה', required: 'אנא מלא את כל שדות החובה', success: 'הצלחה', saved: 'המסמך הופק ונשמר בהיסטוריה!', dateLocale: 'he-IL', defaultName: 'ישראל ישראלי', defaultDesc: 'פיתוח תוכנה והקמת תשתיות', notes: 'תשלום תוך 30 יום. תודה על העסקים!' },
  en: { title: 'Document Generation / New Invoice 📄', subtitle: '100% local | No data leakage | Vector sharpness', client: 'Client / Company Name:', clientPh: 'Enter name...', tax: 'Tax ID:', taxPh: 'Enter tax ID...', desc: 'Service Description:', descPh: 'Description...', price: 'Price (₪ before VAT):', generate: 'Generate & Save PDF', error: 'Error', required: 'Please fill in all required fields', success: 'Success', saved: 'The document was generated and saved to history!', dateLocale: 'en-US', defaultName: 'John Doe', defaultDesc: 'Software development and infrastructure setup', notes: 'Payment within 30 days. Thank you for your business!' },
  ar: { title: 'إنشاء مستند / فاتورة جديدة 📄', subtitle: 'محلي 100% | بدون تسريب بيانات | جودة متجهية', client: 'اسم العميل / الشركة:', clientPh: 'أدخل الاسم...', tax: 'الرقم الضريبي:', taxPh: 'أدخل الرقم...', desc: 'وصف الخدمة:', descPh: 'الوصف...', price: 'السعر (₪ قبل ضريبة القيمة المضافة):', generate: 'إنشاء وحفظ PDF', error: 'خطأ', required: 'يرجى ملء جميع الحقول المطلوبة', success: 'نجاح', saved: 'تم إنشاء المستند وحفظه في السجل!', dateLocale: 'ar-SA', defaultName: 'عميل', defaultDesc: 'تطوير البرمجيات وإنشاء البنية التحتية', notes: 'الدفع خلال 30 يوماً. شكراً لتعاملكم معنا!' },
  am: { title: 'ሰነድ ማመንጨት / አዲስ ደረሰኝ 📄', subtitle: '100% አካባቢያዊ | የመረጃ ፍሰት የለም | የቬክተር ጥራት', client: 'የደንበኛ / የኩባንያ ስም:', clientPh: 'ስም ያስገቡ...', tax: 'የግብር መለያ:', taxPh: 'መለያ ያስገቡ...', desc: 'የአገልግሎት መግለጫ:', descPh: 'መግለጫ...', price: 'ዋጋ (₪ ከVAT በፊት):', generate: 'PDF አመንጭ እና አስቀምጥ', error: 'ስህተት', required: 'እባክዎ ሁሉንም አስፈላጊ መስኮች ይሙሉ', success: 'ተሳክቷል', saved: 'ሰነዱ ተመንጭቶ በታሪክ ተቀምጧል!', dateLocale: 'am-ET', defaultName: 'ደንበኛ', defaultDesc: 'የሶፍትዌር ልማት እና የመሠረተ ልማት ግንባታ', notes: 'ክፍያ በ30 ቀናት ውስጥ። ለንግድዎ እናመሰግናለን!' },
} as const;

export default function GenerateDocumentScreen() {
  const [language] = useAppLanguage();
  const t = T[language];
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState(t.defaultName);
  const [clientTaxId, setClientTaxId] = useState('558123456');
  const [itemDesc, setItemDesc] = useState(t.defaultDesc);
  const [itemPrice, setItemPrice] = useState('2500');

  const handleGeneratePdf = async () => {
    if (!clientName || !itemDesc || !itemPrice) { Alert.alert(t.error, t.required); return; }
    setLoading(true);
    const invoiceData: InvoiceData = { documentTitle: language === 'he' ? 'חשבונית עסקה' : language === 'en' ? 'Transaction Invoice' : language === 'ar' ? 'فاتورة معاملة' : 'የግብይት ደረሰኝ', documentNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`, date: new Date().toLocaleDateString(t.dateLocale), clientName, clientTaxId, items: [{ id: Date.now().toString(), description: itemDesc, quantity: 1, price: parseFloat(itemPrice) || 0 }], notes: t.notes };
    try { await createAndExportPdf(invoiceData); Alert.alert(t.success, t.saved); }
    catch (err: any) { Alert.alert(t.error, err?.message || t.error); }
    finally { setLoading(false); }
  };

  return <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>{t.title}</Text><Text style={styles.subtitle}>{t.subtitle}</Text>
    <View style={styles.formCard}>
      <Text style={styles.label}>{t.client}</Text><TextInput style={styles.input} value={clientName} onChangeText={setClientName} placeholder={t.clientPh} />
      <Text style={styles.label}>{t.tax}</Text><TextInput style={styles.input} value={clientTaxId} onChangeText={setClientTaxId} keyboardType="numeric" placeholder={t.taxPh} />
      <Text style={styles.label}>{t.desc}</Text><TextInput style={styles.input} value={itemDesc} onChangeText={setItemDesc} placeholder={t.descPh} />
      <Text style={styles.label}>{t.price}</Text><TextInput style={styles.input} value={itemPrice} onChangeText={setItemPrice} keyboardType="numeric" placeholder="0.00" />
      <TouchableOpacity style={styles.button} onPress={handleGeneratePdf} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t.generate}</Text>}</TouchableOpacity>
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({ container:{padding:24,paddingTop:60,backgroundColor:'#f0f2f5',alignItems:'center',minHeight:'100%'}, title:{fontSize:22,fontWeight:'bold',color:'#1a1a1a'}, subtitle:{fontSize:13,color:'#666',marginBottom:20,marginTop:4}, formCard:{backgroundColor:'#fff',width:'100%',maxWidth:480,padding:20,borderRadius:10,boxShadow:'0px 2px 8px rgba(0,0,0,0.08)'}, label:{fontSize:14,fontWeight:'600',color:'#333',marginBottom:6,textAlign:'right'}, input:{borderWidth:1,borderColor:'#ccc',borderRadius:6,paddingHorizontal:12,height:42,fontSize:14,marginBottom:16,textAlign:'right'}, button:{backgroundColor:'#0066cc',paddingVertical:14,borderRadius:6,alignItems:'center',marginTop:10}, buttonText:{color:'#fff',fontSize:16,fontWeight:'bold'} });

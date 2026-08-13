import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createAndExportPdf } from '../../services/pdfService';
import { deleteInvoiceFromHistory, getInvoiceHistory } from '../../services/storageService';
import { InvoiceData } from '../../types';
import { useAppLanguage } from '../../languageStore';

const T = {
  he:{title:'היסטוריית מסמכים 📜',empty:'עדיין לא הופקו מסמכים במערכת.',date:'תאריך',total:'סה״כ',download:'הורד',error:'שגיאה',deleteConfirm:'האם למחוק את המסמך?',cancel:'ביטול',delete:'מחק',dateLocale:'he-IL'},
  en:{title:'Document History 📜',empty:'No documents have been generated yet.',date:'Date',total:'Total',download:'Download',error:'Error',deleteConfirm:'Delete this document?',cancel:'Cancel',delete:'Delete',dateLocale:'en-US'},
  ar:{title:'سجل المستندات 📜',empty:'لم يتم إنشاء أي مستندات بعد.',date:'التاريخ',total:'الإجمالي',download:'تحميل',error:'خطأ',deleteConfirm:'هل تريد حذف هذا المستند؟',cancel:'إلغاء',delete:'حذف',dateLocale:'ar-SA'},
  am:{title:'የሰነዶች ታሪክ 📜',empty:'እስካሁን ምንም ሰነድ አልተመነጨም።',date:'ቀን',total:'ጠቅላላ',download:'አውርድ',error:'ስህተት',deleteConfirm:'ይህን ሰነድ ማጥፋት ይፈልጋሉ?',cancel:'ሰርዝ',delete:'አጥፋ',dateLocale:'am-ET'}
} as const;

export default function HistoryScreen(){
  const [language]=useAppLanguage(); const t=T[language]; const [history,setHistory]=useState<InvoiceData[]>([]);
  useFocusEffect(useCallback(()=>{loadHistory();},[]));
  const loadHistory=async()=>{setHistory(await getInvoiceHistory());};
  const handleDeleteItem=async(docNumber:string)=>{const updated=await deleteInvoiceFromHistory(docNumber);setHistory(updated);};
  const confirmDelete=(docNumber:string)=>{Alert.alert(t.delete,t.deleteConfirm,[{text:t.cancel,style:'cancel'},{text:t.delete,style:'destructive',onPress:()=>handleDeleteItem(docNumber)}]);};
  return <ScrollView contentContainerStyle={styles.container}><Text style={styles.title}>{t.title}</Text><View style={styles.historyCard}>{history.length===0?<Text style={styles.emptyText}>{t.empty}</Text>:history.map(item=>{const total=item.items.reduce((acc,i)=>acc+i.price*i.quantity,0)*1.17;return <View key={item.documentNumber} style={styles.historyItem}><View style={styles.historyInfo}><Text style={styles.docNum}>{item.documentNumber} - {item.clientName}</Text><Text style={styles.docDate}>{t.date}: {item.date} | {t.total}: ₪{total.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</Text></View><View style={styles.historyActions}><TouchableOpacity style={styles.reDownloadBtn} onPress={async()=>{try{await createAndExportPdf(item);}catch(e:any){Alert.alert(t.error,e?.message||t.error);}}}><Text style={styles.btnTextSmall}>{t.download}</Text></TouchableOpacity><TouchableOpacity style={styles.deleteBtn} onPress={()=>confirmDelete(item.documentNumber)}><Text style={styles.btnTextSmall}>✕</Text></TouchableOpacity></View></View>;})}</View></ScrollView>;
}
const styles=StyleSheet.create({container:{padding:24,paddingTop:60,backgroundColor:'#f0f2f5',alignItems:'center',minHeight:'100%'},title:{fontSize:22,fontWeight:'bold',color:'#1a1a1a',marginBottom:20},historyCard:{backgroundColor:'#fff',width:'100%',maxWidth:500,padding:20,borderRadius:10,boxShadow:'0px 2px 8px rgba(0,0,0,0.08)'},emptyText:{textAlign:'center',color:'#888',marginVertical:20},historyItem:{flexDirection:'row-reverse',justifyContent:'space-between',alignItems:'center',paddingVertical:12,borderBottomWidth:1,borderBottomColor:'#eee'},historyInfo:{alignItems:'flex-start'},docNum:{fontSize:14,fontWeight:'bold',color:'#222'},docDate:{fontSize:12,color:'#666',marginTop:2},historyActions:{flexDirection:'row',gap:6},reDownloadBtn:{backgroundColor:'#2e7d32',paddingHorizontal:10,paddingVertical:6,borderRadius:4},deleteBtn:{backgroundColor:'#d32f2f',paddingHorizontal:8,paddingVertical:6,borderRadius:4},btnTextSmall:{color:'#fff',fontSize:12,fontWeight:'bold'}});

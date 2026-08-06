import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createAndExportPdf } from '../services/pdfService';
import { deleteInvoiceFromHistory, getInvoiceHistory } from '../services/storageService';
import { InvoiceData } from '../types';

export default function HistoryScreen() {
  const [history, setHistory] = useState<InvoiceData[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    const data = await getInvoiceHistory();
    setHistory(data);
  };

  const handleDeleteItem = async (docNumber: string) => {
    const updated = await deleteInvoiceFromHistory(docNumber);
    setHistory(updated);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>היסטוריית מסמכים 📜</Text>

      <View style={styles.historyCard}>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>עדיין לא הופקו מסמכים במערכת.</Text>
        ) : (
          history.map((item) => {
            const total = item.items.reduce((acc, i) => acc + i.price * i.quantity, 0) * 1.17;
            return (
              <View key={item.documentNumber} style={styles.historyItem}>
                <View style={styles.historyInfo}>
                  <Text style={styles.docNum}>{item.documentNumber} - {item.clientName}</Text>
                  <Text style={styles.docDate}>תאריך: {item.date} | סה"כ: ₪{total.toLocaleString()}</Text>
                </View>

                <View style={styles.historyActions}>
                  <TouchableOpacity
                    style={styles.reDownloadBtn}
                    onPress={() => createAndExportPdf(item)}
                  >
                    <Text style={styles.btnTextSmall}>הורד</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteItem(item.documentNumber)}
                  >
                    <Text style={styles.btnTextSmall}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 60, backgroundColor: '#f0f2f5', alignItems: 'center', minHeight: '100%' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 20 },
  historyCard: { backgroundColor: '#ffffff', width: '100%', maxWidth: 500, padding: 20, borderRadius: 10, boxShadow: '0px 2px 8px rgba(0,0,0,0.08)' },
  emptyText: { textAlign: 'center', color: '#888', marginVertical: 20 },
  historyItem: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  historyInfo: { alignItems: 'flex-start' },
  docNum: { fontSize: 14, fontWeight: 'bold', color: '#222' },
  docDate: { fontSize: 12, color: '#666', marginTop: 2 },
  historyActions: { flexDirection: 'row', gap: 6 },
  reDownloadBtn: { backgroundColor: '#2e7d32', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 },
  deleteBtn: { backgroundColor: '#d32f2f', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4 },
  btnTextSmall: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});
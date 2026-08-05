import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { InvoiceData } from './types';
import { createAndExportPdf } from './services/pdfService';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState('ישראל ישראלי');
  const [clientTaxId, setClientTaxId] = useState('558123456');
  const [itemDesc, setItemDesc] = useState('פיתוח תוכנה והקמת תשתיות');
  const [itemPrice, setItemPrice] = useState('2500');

  const handleGeneratePdf = async () => {
    if (!clientName || !itemDesc || !itemPrice) {
      Alert.alert('שגיאה', 'אנא מלא את כל שדות החובה');
      return;
    }

    setLoading(true);

    const invoiceData: InvoiceData = {
      documentTitle: 'חשבונית עסקה',
      documentNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleDateString('he-IL'),
      clientName,
      clientTaxId,
      items: [
        {
          id: '1',
          description: itemDesc,
          quantity: 1,
          price: parseFloat(itemPrice) || 0,
        },
      ],
      notes: 'תשלום תוך 30 יום. תודה על העסקים!',
    };

    try {
      await createAndExportPdf(invoiceData);
    } catch (err: any) {
      Alert.alert('שגיאה', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>מערכת הפקת PDF דיגיטלית 📄</Text>
      <Text style={styles.subtitle}>100% מקומי | ללא דליפת מידע | חדות וקטורית</Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>שם הלקוח / חברה:</Text>
        <TextInput
          style={styles.input}
          value={clientName}
          onChangeText={setClientName}
          placeholder="הכנס שם..."
        />

        <Text style={styles.label}>ח.פ / ע.מ:</Text>
        <TextInput
          style={styles.input}
          value={clientTaxId}
          onChangeText={setClientTaxId}
          keyboardType="numeric"
          placeholder="הכנס ח.פ..."
        />

        <Text style={styles.label}>תיאור השירות:</Text>
        <TextInput
          style={styles.input}
          value={itemDesc}
          onChangeText={setItemDesc}
          placeholder="תיאור..."
        />

        <Text style={styles.label}>מחיר (₪ לפני מע"מ):</Text>
        <TextInput
          style={styles.input}
          value={itemPrice}
          onChangeText={setItemPrice}
          keyboardType="numeric"
          placeholder="0.00"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleGeneratePdf}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>הפק והורד PDF</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
    minHeight: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: '#ffffff',
    width: '100%',
    maxWidth: 480,
    padding: 20,
    borderRadius: 10,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#0066cc',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
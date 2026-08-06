import AsyncStorage from '@react-native-async-storage/async-storage';
import { InvoiceData } from '../types';

const STORAGE_KEY = '@hovagen_invoices_history';

// שמירת חשבונית חדשה להיסטוריה
export const saveInvoiceToHistory = async (invoice: InvoiceData): Promise<void> => {
  try {
    const existingHistory = await getInvoiceHistory();
    const updatedHistory = [invoice, ...existingHistory];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Failed to save invoice to storage:', error);
  }
};

// שליפת כל ההיסטוריה
export const getInvoiceHistory = async (): Promise<InvoiceData[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Failed to fetch invoice history:', error);
    return [];
  }
};

// מחיקת מסמך מההיסטוריה
export const deleteInvoiceFromHistory = async (documentNumber: string): Promise<InvoiceData[]> => {
  try {
    const existingHistory = await getInvoiceHistory();
    const updatedHistory = existingHistory.filter((item) => item.documentNumber !== documentNumber);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    return updatedHistory;
  } catch (error) {
    console.error('Failed to delete invoice:', error);
    return [];
  }
};
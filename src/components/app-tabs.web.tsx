import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';
import { useAppLanguage } from '../languageStore';


const labels = {
  he: { editor: 'עריכת PDF', generate: 'הפקת מסמך', history: 'היסטוריה' },
  en: { editor: 'PDF Editor', generate: 'Document Generation', history: 'History' },
  ar: { editor: 'تحرير PDF', generate: 'إنشاء مستند', history: 'السجل' },
  am: { editor: 'የPDF አርትዖት', generate: 'ሰነድ ማመንጨት', history: 'ታሪክ' },
} as const;

export default function AppTabs() {
  const [language] = useAppLanguage();
  const t = labels[language];
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0066cc',
        tabBarStyle: Platform.select({ ios: { position: 'absolute' }, default: {} }),
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.editor, tabBarIcon: () => <Text style={{ fontSize: 18 }}>✏️</Text> }} />
      <Tabs.Screen name="generate" options={{ title: t.generate, tabBarIcon: () => <Text style={{ fontSize: 18 }}>➕</Text> }} />
      <Tabs.Screen name="history" options={{ title: t.history, tabBarIcon: () => <Text style={{ fontSize: 18 }}>📜</Text> }} />
    </Tabs>
  );
}

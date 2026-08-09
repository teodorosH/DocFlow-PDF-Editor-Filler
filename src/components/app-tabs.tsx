import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0066cc',
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          default: {},
        }),
      }}
    >
      {/* לשונית 1: העלאת ועריכת PDF */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'עריכת PDF',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>✏️</Text>,
        }}
      />

      {/* לשונית 2: הפקת מסמך חדש */}
      <Tabs.Screen
        name="generate"
        options={{
          title: 'הפקת מסמך',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>➕</Text>,
        }}
      />

      {/* לשונית 3: היסטוריית מסמכים */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'היסטוריה',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>📜</Text>,
        }}
      />
    </Tabs>
  );
}
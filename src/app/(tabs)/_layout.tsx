// import { Tabs } from 'expo-router';
// import React from 'react';
// import { useLanguage, TAB_TRANSLATIONS } from '@/context/LanguageContext';
// import { Ionicons } from '@expo/vector-icons';
//
// export default function TabLayout() {
//   const { lang } = useLanguage();
//   const t = TAB_TRANSLATIONS[lang] || TAB_TRANSLATIONS.en;
//
//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: false,
//         tabBarActiveTintColor: '#0052D4',
//         tabBarInactiveTintColor: '#64748b',
//         tabBarStyle: {
//           backgroundColor: '#ffffff',
//           borderTopWidth: 1,
//           borderTopColor: '#e2e8f0',
//           height: 60,
//           paddingBottom: 8,
//           paddingTop: 6,
//         },
//       }}
//     >
//       <Tabs.Screen
//         name="index"
//         options={{
//           title: t.editor,
//           tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
//         }}
//       />
//       <Tabs.Screen
//         name="history"
//         options={{
//           title: t.history,
//           tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
//         }}
//       />
//       <Tabs.Screen
//         name="generate"
//         options={{
//           title: t.generate,
//           tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
//         }}
//       />
//     </Tabs>
//   );
// }
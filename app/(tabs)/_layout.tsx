import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAppStore } from "@/lib/app-store";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const state = useAppStore();
  const isProfessional = state.membership === "employee";
  const accessBlocked = !!state.subscription && !["trialing", "active"].includes(state.subscription.status);
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: 62 + bottomPadding,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          boxShadow: "0px -2px 8px rgba(0, 0, 0, 0.05)",
          elevation: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Início", tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />, href: accessBlocked ? null : undefined }} />
      <Tabs.Screen name="orders" options={{ title: isProfessional ? "Minhas OS" : "Ordens", tabBarIcon: ({ color }) => <IconSymbol size={24} name="list.bullet" color={color} />, href: accessBlocked ? null : undefined }} />
      <Tabs.Screen name="crm" options={{ title: "CRM", href: isProfessional || accessBlocked ? null : undefined, tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.bar.xaxis" color={color} /> }} />
      <Tabs.Screen name="people" options={{ title: "Cadastros", href: isProfessional || accessBlocked ? null : undefined, tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.2.fill" color={color} /> }} />
      <Tabs.Screen name="account" options={{ href: null }} />
    </Tabs>
  );
}

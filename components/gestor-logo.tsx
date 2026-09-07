import { StyleSheet, Text, View } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";

type GestorLogoProps = {
  subtitle?: boolean;
  inverse?: boolean;
};

export function GestorLogo({ subtitle = false, inverse = false }: GestorLogoProps) {
  return (
    <View accessibilityLabel="Gestor OS" style={styles.lockup}>
      <View style={styles.mark}>
        <IconSymbol name="location.fill" size={24} color="#09090B" />
      </View>
      <View style={styles.type}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, inverse && styles.inverseText]}>GESTOR</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>OS</Text>
          </View>
        </View>
        {subtitle ? <Text style={[styles.subtitle, inverse && styles.inverseText]}>GESTÃO DE ATENDIMENTO</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: { flexDirection: "row", alignItems: "center", gap: 10 },
  mark: { width: 44, height: 44, borderRadius: 13, backgroundColor: "#D9FF3F", alignItems: "center", justifyContent: "center" },
  type: { gap: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { color: "#FAFAFA", fontSize: 18, fontWeight: "900", letterSpacing: 1.1 },
  inverseText: { color: "#09090B" },
  badge: { minWidth: 30, height: 21, borderRadius: 6, backgroundColor: "#D9FF3F", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { color: "#09090B", fontSize: 11, fontWeight: "900" },
  subtitle: { color: "#A1A1AA", fontSize: 9, fontWeight: "800", letterSpacing: 1.7 },
});

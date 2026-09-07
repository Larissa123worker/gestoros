import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { copyToClipboard } from "@/lib/clipboard";

type Props = {
  companyId: string;
  label?: string;
  compact?: boolean;
};

export function CompanyIdBadge({ companyId, label = "ID da empresa", compact }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await copyToClipboard(companyId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {!compact && <Text style={styles.label}>{label}</Text>}
      <Pressable onPress={handleCopy} style={[styles.badge, compact && styles.badgeCompact]} accessibilityLabel={`Copiar ${label}`}>
        <Text style={[styles.id, compact && styles.idCompact]}>{companyId}</Text>
        <IconSymbol name={copied ? "checkmark" : "doc.on.doc"} size={compact ? 14 : 16} color={copied ? "#10B981" : "#D9FF3F"} />
      </Pressable>
      {!compact && (
        <Text style={styles.hint}>{copied ? "Copiado!" : "Toque para copiar e compartilhar com a equipe"}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  wrapCompact: { gap: 0 },
  label: { fontSize: 12, fontWeight: "800", color: "#A1A1AA", letterSpacing: 0.4, textTransform: "uppercase" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "rgba(6, 182, 212, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.35)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  badgeCompact: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  id: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#FAFAFA",
    fontVariant: ["tabular-nums"],
  },
  idCompact: { fontSize: 13, letterSpacing: 1 },
  hint: { fontSize: 12, color: "#71717A", fontWeight: "600" },
});

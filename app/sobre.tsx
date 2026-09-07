import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { router } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";

const lime = "#C8FF00";
const dark = "#0A0A0A";
const darkCard = "#121212";
const borderSubtle = "#222222";
const limeSubtle = "#1A2200";
const limeBorder = "#2B3602";
const grayText = "#A0A0A0";
const lightGrayText = "#E0E0E0";

interface InfoCardProps {
  icon: React.ComponentProps<typeof IconSymbol>["name"];
  label: string;
  children: React.ReactNode;
  onPress?: () => void;
}

function InfoCard({ icon, label, children, onPress }: InfoCardProps) {
  const content = (
    <View style={styles.infoCard}>
      <View style={styles.infoIconBg}>
        <IconSymbol name={icon} size={22} color={lime} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

export default function SobrePage() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <IconSymbol name="arrow.left" size={16} color={lime} />
        <Text style={styles.backButtonText}>Voltar para o início</Text>
      </Pressable>

      {/* Header */}
      <View style={styles.logoRow}>
        <Text style={styles.logoText}>
          GESTOR <Text style={styles.logoAccent}>OS</Text>
        </Text>
      </View>
      <Text style={styles.title}>
        Sobre <Text style={styles.titleAccent}>Nós</Text>
      </Text>
      <Text style={styles.subtitle}>
        Conheça a ISA APP, a agência de desenvolvimento e tecnologia por trás do Kito Expert e do Gestor OS.
      </Text>

      {/* Destaque Principal */}
      <View style={styles.aiCard}>
        <View style={styles.aiIconPulse}>
          <IconSymbol name="hexagon.fill" size={28} color={lime} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiTitle}>Agência Gerenciada 100% por I.A.</Text>
          <Text style={styles.aiText}>
            Somos pioneiros no desenvolvimento de soluções inovadoras utilizando inteligência artificial de ponta. Do planejamento à execução, nossos sistemas são otimizados para entregar a máxima eficiência e performance.
          </Text>
        </View>
      </View>

      {/* Grid de Informações */}
      <View style={styles.grid}>
        <InfoCard icon="clock.fill" label="Horário de Atendimento">
          <Text style={styles.infoValueMain}>24 horas, 7 dias por semana</Text>
          <Text style={styles.infoValueSub}>Sempre online para dar suporte a você.</Text>
        </InfoCard>

        <InfoCard
          icon="phone.fill"
          label="Telefone de Contato"
          onPress={() => Linking.openURL("https://wa.me/5519990087686").catch(() => {})}
        >
          <Text style={[styles.infoValueMain, { color: lime }]}>+55 (19) 99008-7686</Text>
          <Text style={styles.infoValueSub}>Toque para abrir no WhatsApp</Text>
        </InfoCard>

        <InfoCard icon="location.fill" label="Endereço">
          <Text style={styles.infoValueMain}>Rua Comendador Torlogo Dauntre, 74</Text>
          <Text style={styles.infoValueSub}>Bairro: Cambuí</Text>
          <Text style={styles.infoValueSub}>CEP: 13025-270 — Campinas, SP</Text>
        </InfoCard>

        <InfoCard icon="building.2.fill" label="Empresa">
          <Text style={styles.infoValueMain}>
            ISA APP — DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR LTDA
          </Text>
          <Text style={styles.infoValueSub}>
            <Text style={{ color: lightGrayText, fontWeight: "700" }}>CNPJ:</Text>{" "}
            61.629.735/0001-73
          </Text>
        </InfoCard>
      </View>

      {/* Rodapé */}
      <Text style={styles.footerNote}>
        © 2025 – {new Date().getFullYear()} Kito Trainner. Desenvolvido por ISA APP.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dark,
  },
  content: {
    padding: 32,
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
    gap: 8,
  },
  backButtonText: {
    color: lime,
    fontSize: 14,
    fontWeight: "600",
  },
  logoRow: {
    marginBottom: 16,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 2,
  },
  logoAccent: {
    color: lime,
    backgroundColor: "rgba(217, 255, 63, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900",
    marginBottom: 8,
  },
  titleAccent: {
    color: lime,
  },
  subtitle: {
    color: grayText,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 40,
  },
  aiCard: {
    backgroundColor: limeSubtle,
    borderColor: limeBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 20,
    marginBottom: 32,
  },
  aiIconPulse: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(200,255,0,0.12)",
    borderColor: "rgba(200,255,0,0.3)",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  aiTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  aiText: {
    color: lightGrayText,
    fontSize: 14,
    lineHeight: 22,
  },
  grid: {
    gap: 16,
    marginBottom: 40,
  },
  infoCard: {
    backgroundColor: darkCard,
    borderColor: borderSubtle,
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  infoIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(200,255,0,0.08)",
    borderColor: "rgba(200,255,0,0.15)",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoLabel: {
    color: grayText,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  infoValueMain: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  infoValueSub: {
    color: grayText,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 2,
  },
  footerNote: {
    color: "#444",
    fontSize: 12,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: borderSubtle,
    paddingTop: 24,
  },
});

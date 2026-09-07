import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
  ActivityIndicator,
  Platform,
} from "react-native";
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
const errorRed = "#FF4444";

const WHATSAPP_NUMBER = "5519990087686";

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  error?: string;
}

function FormField({ label, placeholder, value, onChangeText, multiline, keyboardType, error }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={ff.wrapper}>
      <Text style={ff.label}>{label}</Text>
      <TextInput
        style={[
          ff.input,
          multiline && ff.textarea,
          focused && ff.inputFocused,
          error ? ff.inputError : null,
        ] as any}
        placeholder={placeholder}
        placeholderTextColor="#555"
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={multiline ? 5 : 1}
        keyboardType={keyboardType ?? "default"}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        textAlignVertical={multiline ? "top" : "center"}
      />
      {error ? <Text style={ff.errorText}>{error}</Text> : null}
    </View>
  );
}

const ff = StyleSheet.create({
  wrapper: { marginBottom: 20 },
  label: {
    color: grayText,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: darkCard,
    borderColor: borderSubtle,
    borderWidth: 1,
    borderRadius: 12,
    color: "#FFFFFF",
    fontSize: 15,
    height: 52,
    paddingHorizontal: 16,
    outlineStyle: "none",
  } as any,
  inputFocused: {
    borderColor: lime,
    backgroundColor: "#161F00",
  },
  inputError: {
    borderColor: errorRed,
  },
  textarea: {
    height: 130,
    paddingTop: 14,
    paddingBottom: 14,
  },
  errorText: {
    color: errorRed,
    fontSize: 12,
    marginTop: 6,
  },
});

export default function ContatoPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = "Nome é obrigatório";
    if (!email.trim() || !email.includes("@")) e.email = "E-mail inválido";
    if (!mensagem.trim()) e.mensagem = "Mensagem não pode estar vazia";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSend = async () => {
    if (!validate()) return;
    setSending(true);
    // Simula envio: redireciona para WhatsApp com a mensagem preenchida
    const texto = encodeURIComponent(
      `Olá! Me chamo *${nome.trim()}*.\n\n*E-mail:* ${email.trim()}${telefone ? `\n*Telefone:* ${telefone.trim()}` : ""}\n\n*Mensagem:*\n${mensagem.trim()}`
    );
    await new Promise((r) => setTimeout(r, 800));
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${texto}`).catch(() => {});
    setSending(false);
    setSent(true);
  };

  const openWhatsApp = () => {
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}`).catch(() => {});
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <IconSymbol name="arrow.left" size={16} color={lime} />
        <Text style={styles.backButtonText}>Voltar para o início</Text>
      </Pressable>

      <Text style={styles.logo}>
        GESTOR <Text style={styles.logoAccent}>OS</Text>
      </Text>
      <Text style={styles.title}>Fale Conosco</Text>
      <Text style={styles.subtitle}>
        Envie uma mensagem pela forma abaixo ou entre em contato direto via WhatsApp. Nossa equipe responde em minutos.
      </Text>

      {/* Acesso Rápido WhatsApp */}
      <Pressable onPress={openWhatsApp} style={styles.waButton}>
        <View style={styles.waIconBg}>
          <IconSymbol name="phone.fill" size={20} color={dark} />
        </View>
        <View>
          <Text style={styles.waLabel}>Suporte rápido via WhatsApp</Text>
          <Text style={styles.waNumber}>+55 (19) 99008-7686</Text>
        </View>
        <IconSymbol name="arrow.right" size={16} color={dark} style={{ marginLeft: "auto" } as any} />
      </Pressable>

      {/* Divisor */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>ou envie uma mensagem</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Formulário */}
      {sent ? (
        <View style={styles.successBox}>
          <IconSymbol name="checkmark.circle.fill" size={48} color={lime} />
          <Text style={styles.successTitle}>Mensagem Enviada!</Text>
          <Text style={styles.successText}>
            Sua mensagem foi aberta no WhatsApp. Nossa equipe irá respondê-la em breve.
          </Text>
          <Pressable onPress={() => setSent(false)} style={styles.successBtn}>
            <Text style={styles.successBtnText}>Enviar nova mensagem</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.form}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField
                label="Nome completo *"
                placeholder="Ex: João da Silva"
                value={nome}
                onChangeText={setNome}
                error={errors.nome}
              />
            </View>
          </View>

          <FormField
            label="E-mail *"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            error={errors.email}
          />

          <FormField
            label="Telefone / WhatsApp"
            placeholder="(19) 99999-9999"
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
          />

          <FormField
            label="Mensagem *"
            placeholder="Descreva sua dúvida, pedido ou sugestão..."
            value={mensagem}
            onChangeText={setMensagem}
            multiline
            error={errors.mensagem}
          />

          <Pressable onPress={handleSend} style={[styles.submitBtn, sending && { opacity: 0.7 }]} disabled={sending}>
            {sending ? (
              <ActivityIndicator color={dark} size="small" />
            ) : (
              <>
                <IconSymbol name="paperplane.fill" size={18} color={dark} />
                <Text style={styles.submitBtnText}>Enviar pelo WhatsApp</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.formNote}>
            Ao clicar em enviar, você será redirecionado ao WhatsApp com sua mensagem já preenchida.
          </Text>
        </View>
      )}

      {/* Info Cards */}
      <View style={styles.infoRow}>
        <View style={styles.infoMini}>
          <IconSymbol name="clock.fill" size={18} color={lime} />
          <Text style={styles.infoMiniTitle}>Resposta rápida</Text>
          <Text style={styles.infoMiniText}>Normalmente em menos de 1 hora</Text>
        </View>
        <View style={styles.infoMini}>
          <IconSymbol name="location.fill" size={18} color={lime} />
          <Text style={styles.infoMiniTitle}>Campinas, SP</Text>
          <Text style={styles.infoMiniText}>Atendimento em todo o Brasil</Text>
        </View>
      </View>
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
    maxWidth: 700,
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
  logo: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 12,
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
  subtitle: {
    color: grayText,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  waButton: {
    backgroundColor: "#0D1A00",
    borderColor: limeBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 32,
  },
  waIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: lime,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  waLabel: {
    color: grayText,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  waNumber: {
    color: lime,
    fontSize: 16,
    fontWeight: "800",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: borderSubtle,
  },
  dividerText: {
    color: grayText,
    fontSize: 13,
  },
  form: {},
  row: {
    flexDirection: "row",
    gap: 16,
  },
  submitBtn: {
    backgroundColor: lime,
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  submitBtnText: {
    color: dark,
    fontSize: 16,
    fontWeight: "800",
  },
  formNote: {
    color: "#555",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  successBox: {
    alignItems: "center",
    paddingVertical: 48,
    backgroundColor: limeSubtle,
    borderColor: limeBorder,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  successTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 16,
    marginBottom: 8,
  },
  successText: {
    color: lightGrayText,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  successBtn: {
    backgroundColor: lime,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  successBtnText: {
    color: dark,
    fontWeight: "700",
    fontSize: 14,
  },
  infoRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 32,
  },
  infoMini: {
    flex: 1,
    backgroundColor: darkCard,
    borderColor: borderSubtle,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  infoMiniTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  infoMiniText: {
    color: grayText,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
});

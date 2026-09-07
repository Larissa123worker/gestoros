import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Linking } from "react-native";
import { router } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";

const lime = "#C8FF00";
const dark = "#0A0A0A";
const darkCard = "#121212";
const borderSubtle = "#222222";
const grayText = "#A0A0A0";
const lightGrayText = "#E0E0E0";

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable style={styles.faqCard} onPress={() => setExpanded(!expanded)}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{question}</Text>
        <IconSymbol
          name={expanded ? "xmark" : "chevron.right"}
          size={16}
          color={expanded ? lime : grayText}
        />
      </View>
      {expanded && <Text style={styles.faqAnswer}>{answer}</Text>}
    </Pressable>
  );
}

export default function AjudaPage() {
  const [search, setSearch] = useState("");

  const faqs = [
    {
      question: "Como o técnico registra o início de um serviço?",
      answer: "O técnico em campo deve acessar o aplicativo móvel usando seu login individual, selecionar a ordem de serviço designada na aba ativa e clicar em 'Confirmar Chegada'. O app validará sua localização GPS com o endereço do cliente.",
    },
    {
      question: "O app funciona offline no celular do técnico?",
      answer: "Sim! Se o técnico perder o sinal de internet, ele pode continuar preenchendo o formulário, tirando fotos e colhendo a assinatura. Os dados serão salvos localmente e sincronizados automaticamente assim que a conexão for restabelecida.",
    },
    {
      question: "Como funciona a comprovação com fotos (evidências)?",
      answer: "O gestor pode configurar a exigência de fotos antes que uma ordem de serviço seja concluída. O técnico anexa fotos diretamente no aplicativo e elas são enviadas ao painel administrativo junto com a assinatura do cliente.",
    },
    {
      question: "Consigo alterar as permissões de cada funcionário?",
      answer: "Sim. No painel de controle do administrador, vá em 'Equipe', clique no funcionário e edite o perfil de acesso para definir se ele é um Gestor/Administrador ou um Técnico de campo.",
    },
    {
      question: "Como realizo a assinatura de contratos com os planos?",
      answer: "As assinaturas são processadas via checkout seguro (PIX ou Cartão de Crédito). Você pode gerenciar seu plano de cobrança a qualquer momento clicando em 'Assinatura' no painel de configurações.",
    },
  ];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <IconSymbol name="arrow.left" size={16} color={lime} />
        <Text style={styles.backButtonText}>Voltar para o início</Text>
      </Pressable>

      <Text style={styles.title}>Central de Ajuda</Text>
      <Text style={styles.subtitle}>
        Encontre respostas rápidas para dúvidas sobre o uso do Gestor OS ou entre em contato com nosso suporte técnico.
      </Text>

      <View style={styles.searchContainer}>
        <IconSymbol name="magnifyingglass" size={18} color={grayText} />
        <TextInput
          style={styles.searchInput}
          placeholder="Busque por termos, ex: GPS, Offline, Foto..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <Text style={styles.sectionHeading}>Perguntas Frequentes</Text>

      {filteredFaqs.length > 0 ? (
        filteredFaqs.map((faq, idx) => (
          <FAQItem key={idx} question={faq.question} answer={faq.answer} />
        ))
      ) : (
        <Text style={styles.noResults}>Nenhuma pergunta encontrada para sua busca.</Text>
      )}

      <View style={styles.contactCard}>
        <Text style={styles.contactTitle}>Ainda precisa de ajuda?</Text>
        <Text style={styles.contactText}>
          Seu problema não foi resolvido? Fale diretamente com nossa equipe técnica pelo WhatsApp Oficial.
        </Text>
        <Pressable
          onPress={() => Linking.openURL("https://wa.me/5519990087686")}
          style={styles.contactButton}
        >
          <IconSymbol name="phone.fill" size={16} color={dark} />
          <Text style={styles.contactButtonText}>Iniciar Conversa no WhatsApp</Text>
        </Pressable>
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: darkCard,
    borderColor: borderSubtle,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 40,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    marginLeft: 12,
    outlineStyle: "none",
  } as any,
  sectionHeading: {
    color: lime,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
  },
  faqCard: {
    backgroundColor: darkCard,
    borderColor: borderSubtle,
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    paddingRight: 16,
  },
  faqAnswer: {
    color: lightGrayText,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: borderSubtle,
    paddingTop: 16,
  },
  noResults: {
    color: grayText,
    fontSize: 15,
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 24,
  },
  contactCard: {
    backgroundColor: "#161B01",
    borderColor: "#2B3602",
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    marginTop: 40,
    alignItems: "center",
  },
  contactTitle: {
    color: lime,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  contactText: {
    color: lightGrayText,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 20,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: lime,
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 24,
    gap: 10,
  },
  contactButtonText: {
    color: dark,
    fontWeight: "700",
    fontSize: 15,
  },
});

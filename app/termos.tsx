import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";

const lime = "#C8FF00";
const dark = "#0A0A0A";
const darkCard = "#121212";
const borderSubtle = "#222222";
const grayText = "#A0A0A0";
const lightGrayText = "#E0E0E0";

export default function TermosPage() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <IconSymbol name="arrow.left" size={16} color={lime} />
        <Text style={styles.backButtonText}>Voltar para o início</Text>
      </Pressable>

      <Text style={styles.title}>Termos de Uso</Text>
      <Text style={styles.lastUpdated}>Última atualização: 30 de agosto de 2026</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Aceitação dos Termos</Text>
        <Text style={styles.text}>
          Ao acessar e utilizar a plataforma Gestor OS (web e aplicativo móvel), você concorda expressamente com os presentes Termos de Uso. Caso não concorde com qualquer uma das condições estabelecidas, você não deve acessar ou utilizar nossos serviços.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Descrição do Serviço</Text>
        <Text style={styles.text}>
          O Gestor OS é um ecossistema SaaS voltado para a gestão de ordens de serviço, rastreamento de equipes em campo por GPS, registro fotográfico de atividades, controle de inventário e geração de relatórios de produtividade. Os serviços são disponibilizados mediante planos de assinatura mensal ou anual.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Cadastro e Segurança</Text>
        <Text style={styles.text}>
          Para utilizar as funcionalidades completas do sistema, o Usuário/Empresa deve criar uma conta ativa fornecendo informações verdadeiras, atualizadas e completas. O Usuário é inteiramente responsável por manter a confidencialidade de suas credenciais de login (gestor e técnico) e por todas as atividades que ocorram sob sua conta.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Uso Aceitável e Responsabilidade do Usuário</Text>
        <Text style={styles.text}>
          Você concorda em utilizar a plataforma estritamente de acordo com as leis aplicáveis. É proibido:
          {"\n"}• Enviar conteúdos falsos, fraudulentos ou ofensivos.
          {"\n"}• Interferir ou tentar burlar os mecanismos de segurança e criptografia do sistema.
          {"\n"}• Utilizar automações não autorizadas (bots, scrapers) para extrair dados da plataforma.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Coleta de Dados de Localização (GPS)</Text>
        <Text style={styles.text}>
          O aplicativo móvel do Gestor OS coleta e processa dados de localização GPS em segundo plano dos técnicos em campo para comprovar a presença no local do atendimento. Esse rastreamento é essencial para o funcionamento do serviço e só é realizado durante o horário de trabalho ativado pelo usuário.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Propriedade Intelectual</Text>
        <Text style={styles.text}>
          Todo o código-fonte, layout visual, logotipos, ícones e conteúdos integrados ao Gestor OS são de propriedade exclusiva da nossa empresa e protegidos pela legislação de propriedade intelectual. É vedada a reprodução ou engenharia reversa sem autorização expressa.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. Limitação de Responsabilidade</Text>
        <Text style={styles.text}>
          O Gestor OS fornece seus serviços "como estão" e não garante disponibilidade ininterrupta ou isenção total de pequenos bugs operacionais. Não nos responsabilizamos por perdas de receitas decorrentes de falhas de conectividade à internet das equipes em campo ou mau funcionamento de dispositivos de terceiros.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>8. Alterações nos Termos</Text>
        <Text style={styles.text}>
          Reservamo-nos o direito de atualizar estes Termos de Uso a qualquer momento para refletir mudanças regulatórias ou evoluções no sistema. Notificaremos os usuários sobre mudanças significativas através de aviso em destaque na plataforma.
        </Text>
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
  lastUpdated: {
    color: grayText,
    fontSize: 14,
    marginBottom: 40,
  },
  section: {
    marginBottom: 32,
    backgroundColor: darkCard,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: borderSubtle,
  },
  sectionTitle: {
    color: lime,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  text: {
    color: lightGrayText,
    fontSize: 15,
    lineHeight: 24,
  },
});

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

export default function PrivacidadePage() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <IconSymbol name="arrow.left" size={16} color={lime} />
        <Text style={styles.backButtonText}>Voltar para o início</Text>
      </Pressable>

      <Text style={styles.title}>Política de Privacidade</Text>
      <Text style={styles.lastUpdated}>Última atualização: 30 de agosto de 2026</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Compromisso com a Privacidade</Text>
        <Text style={styles.text}>
          O Gestor OS tem o compromisso de proteger a privacidade e a segurança dos dados pessoais de seus clientes, gestores e técnicos em campo. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e compartilhamos suas informações ao utilizar nossos aplicativos e site.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Informações que Coletamos</Text>
        <Text style={styles.text}>
          Coletamos as seguintes categorias de dados para viabilizar e aprimorar nossos serviços:
          {"\n"}• **Dados Cadastrais:** Nome completo, e-mail corporativo, telefone, CNPJ e nome da empresa.
          {"\n"}• **Dados de Geolocalização (GPS):** Coordenadas geográficas coletadas do dispositivo do técnico em campo durante a execução de ordens de serviço.
          {"\n"}• **Conteúdo Multimídia:** Fotos anexadas como evidência de conclusão ou progresso dos serviços.
          {"\n"}• **Dados de Uso Técnico:** Endereço IP, tipo de navegador, identificador de dispositivo móvel e logs de erros.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Uso dos Dados de Geolocalização em Segundo Plano</Text>
        <Text style={styles.text}>
          Nosso aplicativo coleta dados de localização GPS em tempo real (mesmo quando fechado ou não em uso ativo) exclusivamente para:
          {"\n"}1. Validar a chegada e saída física do técnico no endereço do cliente cadastrado.
          {"\n"}2. Otimizar a atribuição de chamados emergenciais ao técnico mais próximo.
          {"\n"}Esses dados não são vendidos ou compartilhados com fins publicitários e seu rastreamento é restrito ao horário de expediente configurado pela empresa administradora.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Compartilhamento de Dados</Text>
        <Text style={styles.text}>
          Não comercializamos dados pessoais de usuários. O compartilhamento ocorre apenas sob as seguintes circunstâncias:
          {"\n"}• **Com Provedores de Infraestrutura:** Serviços de hospedagem em nuvem (como Supabase/AWS) e serviços de envio de e-mails/webhooks.
          {"\n"}• **Por Obrigatoriedade Legal:** Cumprimento de ordens judiciais ou regulatórias de autoridades competentes.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Segurança e Retenção</Text>
        <Text style={styles.text}>
          Adotamos protocolos de criptografia ponta a ponta (SSL/TLS), firewalls ativos e controle rígido de acesso às credenciais do banco de dados. Os dados coletados são retidos enquanto durar a conta do usuário ou pelo tempo exigido por lei para fins de contabilidade e auditoria jurídica.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Seus Direitos (LGPD)</Text>
        <Text style={styles.text}>
          De acordo com a Lei Geral de Proteção de Dados (LGPD) do Brasil, você tem direito a confirmar a existência de tratamento de dados, acessar seus dados salvos, corrigir informações incorretas ou solicitar a exclusão total de sua conta e dos dados a ela vinculados a qualquer momento pelo canal de suporte.
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

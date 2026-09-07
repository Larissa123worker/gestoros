import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Stack } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useColors } from "@/hooks/use-colors";
import * as SupabaseService from "@/lib/supabase-service";

/** Escolha apenas para gestores autenticados sem empresa ainda. */
export default function ChooseProfileScreen() {
  const colors = useColors();
  const { user, loading } = useSupabaseAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login" as any);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const company = await SupabaseService.getCompanyByUserId(user.id);
        if (cancelled) return;
        if (company) {
          router.replace("/(tabs)" as any);
          return;
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loading, router]);

  if (loading || checking) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 24, justifyContent: "center", gap: 20 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ gap: 8, marginBottom: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: "900", color: colors.foreground, letterSpacing: -0.5 }}>
          Cadastre sua empresa
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20 }}>
          Como gestor, você precisa cadastrar a empresa para gerar o ID XX-XXXXX e cadastrar os profissionais.
        </Text>
      </View>

      <Pressable
        onPress={() => router.replace("/register-company" as any)}
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: 20,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(6,182,212,0.12)", alignItems: "center", justifyContent: "center" }}>
            <IconSymbol name="building.2.fill" size={22} color="#D9FF3F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: "900", color: colors.foreground }}>Cadastrar empresa</Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>Gerar ID e começar a operar</Text>
          </View>
        </View>
      </Pressable>

      <Pressable onPress={() => router.replace("/login-profissional" as any)}>
        <Text style={{ fontSize: 13, textAlign: "center", color: colors.muted, fontWeight: "700" }}>
          Sou profissional — ir para login do campo
        </Text>
      </Pressable>
    </View>
  );
}

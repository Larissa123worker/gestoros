import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { store } from "@/lib/app-store";

export default function CameraScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [saving, setSaving] = useState(false);

  const capture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7, skipProcessing: false });
    if (!photo?.uri || !orderId) return;
    setSaving(true);
    store.addEvidence(orderId, photo.uri);
    router.back();
  };

  if (!permission) return <View style={styles.loader}><Text style={styles.white}>Preparando câmera...</Text></View>;
  if (!permission.granted) return <View style={styles.permission}><View style={styles.permissionIcon}><IconSymbol name="camera.fill" size={40} color="#D9FF3F" /></View><Text style={styles.permissionTitle}>Registre evidências do serviço</Text><Text style={styles.permissionText}>Precisamos da câmera para anexar fotos à ordem de serviço.</Text><Pressable onPress={requestPermission} style={styles.grant}><Text style={styles.grantText}>Permitir câmera</Text></Pressable><Pressable onPress={() => router.back()}><Text style={styles.cancel}>Cancelar</Text></Pressable></View>;

  return <View style={styles.root}>
    <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />
    <View style={styles.overlay}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} style={styles.icon}>
          <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.label}>EVIDÊNCIA FOTOGRÁFICA</Text>
        <Pressable onPress={() => setFacing((current) => current === "back" ? "front" : "back")} style={styles.icon}>
          <IconSymbol name="camera.fill" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
      <View style={styles.bottom}>
        <Text style={styles.guidance}>Centralize a evidência do atendimento no quadro.</Text>
        <ShutterButton onPress={() => void capture()} disabled={saving} />
        <Text style={styles.captureText}>{saving ? "Salvando..." : "Capturar foto"}</Text>
      </View>
    </View>
  </View>;
}

function ShutterButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(disabled ? 0.95 : 1, { duration: 150, easing: Easing.inOut(Easing.ease) }) }],
    opacity: withTiming(disabled ? 0.6 : 1, { duration: 150 }),
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable disabled={disabled} onPress={onPress} style={styles.shutter}>
        <View style={styles.shutterInner} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B1220" },
  overlay: { flex: 1, justifyContent: "space-between", paddingTop: 58, paddingBottom: 42, paddingHorizontal: 22, backgroundColor: "rgba(0,0,0,0.14)" },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.38)", alignItems: "center", justifyContent: "center" },
  label: { color: "#FFFFFF", fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  bottom: { alignItems: "center", gap: 13 },
  guidance: { color: "#FFFFFF", fontSize: 13, fontWeight: "700", textAlign: "center", textShadowColor: "#000000", textShadowRadius: 4 },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: "#FFFFFF", padding: 5, alignItems: "center", justifyContent: "center" },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFFFFF" },
  captureText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  loader: { flex: 1, backgroundColor: "#0B1220", alignItems: "center", justifyContent: "center" },
  white: { color: "#FFFFFF" },
  permission: { flex: 1, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", paddingHorizontal: 34, gap: 14 },
  permissionIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  permissionTitle: { color: "#0F172A", fontSize: 21, fontWeight: "800", textAlign: "center" },
  permissionText: { color: "#64748B", fontSize: 14, textAlign: "center", lineHeight: 20 },
  grant: { backgroundColor: "#D9FF3F", borderRadius: 14, paddingHorizontal: 20, paddingVertical: 13, marginTop: 6 },
  grantText: { color: "#FFFFFF", fontWeight: "800" },
  cancel: { color: "#D9FF3F", fontWeight: "800", marginTop: 5 },
});

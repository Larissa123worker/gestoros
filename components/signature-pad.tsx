import { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

type SignaturePadProps = { onChange: (signaturePath: string) => void };

export function SignaturePad({ onChange }: SignaturePadProps) {
  const pathRef = useRef("");
  const [path, setPath] = useState("");
  const commit = (next: string) => { pathRef.current = next; setPath(next); onChange(next); };
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      const { locationX, locationY } = event.nativeEvent;
      commit(`${pathRef.current} M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`);
    },
    onPanResponderMove: (event) => {
      const { locationX, locationY } = event.nativeEvent;
      commit(`${pathRef.current} L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`);
    },
  }), []);

  return <View style={styles.wrapper}>
    <View style={styles.canvas} {...panResponder.panHandlers}>
      {!path && <Text style={styles.hint}>Assine aqui com o dedo</Text>}
      <Svg width="100%" height="100%" viewBox="0 0 340 150" preserveAspectRatio="none"><Path d={path} stroke="#0B6E8E" strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
    </View>
    <View style={styles.footer}><Text style={styles.footerText}>A assinatura confirma o aceite do serviço.</Text><Pressable onPress={() => commit("")}><Text style={styles.clear}>Limpar</Text></Pressable></View>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  canvas: { height: 150, borderRadius: 15, borderWidth: 1, borderStyle: "dashed", borderColor: "#9FBAC2", backgroundColor: "#F7FBFC", overflow: "hidden", justifyContent: "center", alignItems: "center" },
  hint: { position: "absolute", color: "#7A8D94", fontSize: 13, fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerText: { flex: 1, color: "#6B7E85", fontSize: 11 },
  clear: { color: "#0B6E8E", fontSize: 12, fontWeight: "800" },
});


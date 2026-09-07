import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

export function Shimmer({ width, height, borderRadius = 12 }: { width: number; height: number; borderRadius?: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const translate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <View style={[styles.wrapper, { width, height, borderRadius }]}>
      <Animated.View
        style={[
          styles.shimmer,
          { width, height, borderRadius },
          { transform: [{ translateX: translate }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { overflow: "hidden", backgroundColor: "rgba(0,0,0,0.04)" },
  shimmer: { position: "absolute", top: 0, left: 0, backgroundColor: "rgba(255,255,255,0.45)" },
});

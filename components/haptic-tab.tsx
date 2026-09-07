import { useRef } from "react";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import { Animated, Platform } from "react-native";

export function HapticTab(props: BottomTabBarButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (ev: any) => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: Platform.OS !== "web",
      speed: 50,
      bounciness: 0,
    }).start();
    props.onPressIn?.(ev);
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: Platform.OS !== "web",
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <PlatformPressable {...props} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={{ transform: [{ scale }], flex: 1, alignItems: "center", justifyContent: "center" }}>
        {props.children}
      </Animated.View>
    </PlatformPressable>
  );
}

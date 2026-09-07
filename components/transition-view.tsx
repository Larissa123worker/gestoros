import { useRef } from "react";
import { Animated, Easing, View, type ViewProps } from "react-native";

type FadeInViewProps = ViewProps & {
  delay?: number;
  duration?: number;
  from?: { opacity?: number; translateY?: number };
};

export function FadeInView({
  children,
  delay = 0,
  duration = 320,
  from = { opacity: 0, translateY: 12 },
  style,
  ...props
}: FadeInViewProps) {
  const anim = useRef(new Animated.Value(0)).current;

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [from.opacity ?? 0, 1],
  });

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [from.translateY ?? 12, 0],
  });

  return (
    <Animated.View
      style={[
        { opacity, transform: [{ translateY }] },
        style,
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

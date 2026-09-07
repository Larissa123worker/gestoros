// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
export type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chart.bar.fill": "bar-chart",
  "chart.bar.xaxis": "analytics",
  "list.bullet": "assignment",
  "person.2.fill": "groups",
  "plus.circle.fill": "add-circle",
  "person.crop.circle.fill": "account-circle",
  "bell.fill": "notifications",
  "arrow.up.right": "north-east",
  "calendar": "event",
  "location.fill": "location-on",
  "wrench.and.screwdriver.fill": "build",
  "checkmark.circle.fill": "check-circle",
  "clock.fill": "schedule",
  "magnifyingglass": "search",
  "slider.horizontal.3": "tune",
  "person.fill": "person",
  "building.2.fill": "business",
  "briefcase.fill": "work",
  "phone.fill": "phone",
  "note.text": "notes",
  "arrow.right": "arrow-forward",
  "arrow.left": "arrow-back",
  "arrow.clockwise": "refresh",
  "camera.fill": "photo-camera",
  "photo.on.rectangle": "collections",
  "map.fill": "map",
  "location.north.fill": "navigation",
  "signature": "draw",
  "checkmark": "check",
  "doc.on.doc": "content-copy",
  "xmark": "close",
  "plus": "add",
  "hexagon.fill": "hexagon",
  "exclamationmark.triangle.fill": "warning",
  "tray.fill": "inbox",
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  "xmark.circle.fill": "cancel",
  "info.circle.fill": "info",
  "circle": "radio-button-unchecked",
  "rectangle.portrait.and.arrow.right": "logout",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}

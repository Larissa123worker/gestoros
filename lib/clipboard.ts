import { Platform } from "react-native";

export async function copyToClipboard(text: string): Promise<void> {
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Fallback nativo (API legada ainda disponível no RN)
  const { Clipboard } = require("react-native") as {
    Clipboard: { setString: (value: string) => void };
  };
  Clipboard.setString(text);
}

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@shared": path.resolve(__dirname, "./shared"),
      "expo-secure-store": path.resolve(__dirname, "./tests/mocks/expo-secure-store.ts"),
      "@react-native-async-storage/async-storage": path.resolve(__dirname, "./tests/mocks/async-storage.ts"),
      "react-native": path.resolve(__dirname, "./tests/mocks/react-native.ts"),
    },
  },
  test: {
    environment: "node",
  },
});

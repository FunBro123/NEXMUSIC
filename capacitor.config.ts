import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ru.nexmusic.app",
  appName: "NEXMUSIC",
  webDir: "dist",
  bundledWebRuntime: false,
  android: { backgroundColor: "#090a0f" }
};

export default config;
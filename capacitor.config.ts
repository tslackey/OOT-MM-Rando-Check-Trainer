import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "dev.tslackey.ootmmchecktrainer",
  appName: "OoTMM Check Trainer",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;

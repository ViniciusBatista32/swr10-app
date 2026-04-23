import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { I18nProvider } from "@/src/contexts/I18nContext";
import { SettingsProvider } from "@/src/contexts/SettingsContext";
import { BandProvider } from "@/src/contexts/BandContext";
import { colors } from "@/src/theme";

export default function RootLayout() {
  return (
    <I18nProvider>
      <SettingsProvider>
        <BandProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: "fade",
            }}
          />
        </BandProvider>
      </SettingsProvider>
    </I18nProvider>
  );
}

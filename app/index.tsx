import { Redirect } from "expo-router";
import { useBand } from "@/src/contexts/BandContext";

export default function Index() {
  const { state, isAutoReconnecting } = useBand();

  if (state === "connected" || isAutoReconnecting) {
    return <Redirect href="/(main)" />;
  }

  return <Redirect href="/connect" />;
}

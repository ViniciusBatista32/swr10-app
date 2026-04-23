import { NativeModules } from "react-native";

const { SWR10MediaModule } = NativeModules;

export type MediaSessionInfo = {
  packageName: string;
  label: string;
  isPlaying: boolean;
};

export async function getActiveSessions(): Promise<MediaSessionInfo[]> {
  if (!SWR10MediaModule) return [];
  try {
    const json: string = await SWR10MediaModule.getActiveSessions();
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export async function togglePlayPause(): Promise<void> {
  SWR10MediaModule?.togglePlayPause();
}

export async function nextTrack(): Promise<void> {
  SWR10MediaModule?.nextTrack();
}

export async function previousTrack(): Promise<void> {
  SWR10MediaModule?.previousTrack();
}

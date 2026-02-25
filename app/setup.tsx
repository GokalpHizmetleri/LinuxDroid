import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";

const C = Colors.dark;

interface ApkInfo {
  id: string;
  name: string;
  packageName: string;
  version: string;
  description: string;
  downloadUrl: string;
  size: string;
  required: boolean;
}

type DownloadStatus = "idle" | "downloading" | "installing" | "done" | "error";

interface DownloadState {
  termux: DownloadStatus;
  nethunter: DownloadStatus;
  termuxProgress: number;
  nethunterProgress: number;
  termuxError?: string;
  nethunterError?: string;
}

function BlinkingCursor() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [opacity]);

  return <Animated.Text style={[styles.cursor, { opacity }]}>█</Animated.Text>;
}

function ProgressBar({ progress, color = C.accentCyan }: { progress: number; color?: string }) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, width]);

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: color,
              width: width.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
            },
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color }]}>{Math.round(progress)}%</Text>
    </View>
  );
}

function AppCard({
  apk,
  status,
  progress,
  errorMsg,
  onDownload,
}: {
  apk: ApkInfo;
  status: DownloadStatus;
  progress: number;
  errorMsg?: string;
  onDownload: () => void;
}) {
  const isDownloading = status === "downloading";
  const isInstalling = status === "installing";
  const isDone = status === "done";
  const isError = status === "error";
  const iconColor = isDone ? C.accent : isError ? C.accentRed : C.accentCyan;

  return (
    <View style={[styles.appCard, isDone && styles.appCardDone]}>
      <View style={styles.appCardHeader}>
        <View style={[styles.appIconCircle, { borderColor: iconColor }]}>
          <MaterialCommunityIcons
            name={apk.id === "termux" ? "console" : "monitor-eye"}
            size={28}
            color={iconColor}
          />
        </View>

        <View style={styles.appCardInfo}>
          <View style={styles.appNameRow}>
            <Text style={styles.appName}>{apk.name}</Text>
            <Text style={styles.appVersion}>v{apk.version}</Text>
          </View>
          <Text style={styles.appDesc}>{apk.description}</Text>
          <Text style={styles.appSize}>Size: {apk.size}</Text>
        </View>

        {isDone && (
          <View style={[styles.badge, { borderColor: C.accent, backgroundColor: "rgba(0,255,65,0.1)" }]}>
            <Ionicons name="checkmark" size={12} color={C.accent} />
            <Text style={[styles.badgeText, { color: C.accent }]}>DONE</Text>
          </View>
        )}
      </View>

      {(isDownloading || isInstalling) && (
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>
            {isDownloading ? "Downloading..." : "Opening installer..."}
          </Text>
          <ProgressBar progress={isInstalling ? 100 : progress} />
        </View>
      )}

      {isError && errorMsg && (
        <Text style={styles.errorMsg}>{errorMsg}</Text>
      )}

      {(status === "idle" || isError) && (
        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={onDownload}
          activeOpacity={0.7}
        >
          <Ionicons name="download-outline" size={16} color="#0a0a0a" />
          <Text style={styles.downloadBtnText}>
            {isError ? "RETRY DOWNLOAD" : "DOWNLOAD & INSTALL"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const [dlState, setDlState] = useState<DownloadState>({
    termux: "idle",
    nethunter: "idle",
    termuxProgress: 0,
    nethunterProgress: 0,
  });
  const [logLines, setLogLines] = useState<{ text: string; color: string }[]>([
    { text: "[LinuxDroid] Welcome to LinuxDroid v1.0", color: C.accent },
    { text: "[LinuxDroid] Download required apps below, then continue.", color: C.textDim },
  ]);

  const { data: apks } = useQuery<ApkInfo[]>({
    queryKey: ["/api/apks"],
  });

  const addLog = (text: string, color = C.textDim) => {
    setLogLines((prev) => [...prev.slice(-25), { text, color }]);
  };

  const downloadAndInstall = async (apkId: string) => {
    if (!apks) return;
    const apk = apks.find((a) => a.id === apkId);
    if (!apk) return;

    const key = apkId === "termux" ? "termux" : "nethunter";
    const progressKey = apkId === "termux" ? "termuxProgress" : "nethunterProgress";
    const errorKey = apkId === "termux" ? "termuxError" : "nethunterError";

    if (Platform.OS !== "android") {
      Alert.alert(
        "Android Only",
        "APK installation requires a physical Android device. Run this app on your Android phone.",
        [{ text: "OK" }]
      );
      return;
    }

    setDlState((prev) => ({ ...prev, [key]: "downloading", [progressKey]: 0 }));
    addLog(`[DOWNLOAD] Fetching ${apk.name}...`, C.accentCyan);

    try {
      const fileUri = `${FileSystem.cacheDirectory}${apk.id}.apk`;

      const downloadResumable = FileSystem.createDownloadResumable(
        apk.downloadUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const total = downloadProgress.totalBytesExpectedToWrite;
          const progress = total > 0
            ? (downloadProgress.totalBytesWritten / total) * 100
            : 0;
          setDlState((prev) => ({ ...prev, [progressKey]: progress }));
        }
      );

      addLog(`[DOWNLOAD] Connecting to server...`, C.accentCyan);
      const result = await downloadResumable.downloadAsync();

      if (!result) throw new Error("Download returned no result");

      addLog(`[DOWNLOAD] ${apk.name} download complete.`, C.accentCyan);
      addLog(`[INSTALL] Opening system installer...`, C.accentPurple);

      setDlState((prev) => ({ ...prev, [key]: "installing" }));

      const contentUri = await FileSystem.getContentUriAsync(result.uri);
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        flags: 1,
        type: "application/vnd.android.package-archive",
      });

      addLog(`[OK] Installer launched for ${apk.name}.`, C.accent);
      setDlState((prev) => ({ ...prev, [key]: "done", [progressKey]: 0 }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      addLog(`[ERROR] ${apk.name}: ${message}`, C.accentRed);
      setDlState((prev) => ({
        ...prev,
        [key]: "error",
        [errorKey]: message,
        [progressKey]: 0,
      }));
    }
  };

  const termuxApk = apks?.find((a) => a.id === "termux");
  const nethunterApk = apks?.find((a) => a.id === "nethunter-kex");

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 + (Platform.OS === "web" ? 34 : 0) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <MaterialCommunityIcons name="penguin" size={40} color={C.accent} />
            <View>
              <Text style={styles.logoText}>LinuxDroid</Text>
              <Text style={styles.tagline}>Linux on Android</Text>
            </View>
          </View>
          <View style={styles.scanLine} />
        </View>

        <View style={styles.terminalBox}>
          <View style={styles.terminalHeader}>
            <View style={[styles.termDot, { backgroundColor: C.accentRed }]} />
            <View style={[styles.termDot, { backgroundColor: C.accentAmber }]} />
            <View style={[styles.termDot, { backgroundColor: C.accent }]} />
            <Text style={styles.termTitle}>setup@linuxdroid:~$</Text>
          </View>
          <ScrollView style={styles.terminalContent} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {logLines.map((line, i) => (
              <Text key={i} style={[styles.termLine, { color: line.color }]}>
                {line.text}
              </Text>
            ))}
            <View style={styles.cursorRow}>
              <Text style={[styles.termLine, { color: C.accent }]}>$ </Text>
              <BlinkingCursor />
            </View>
          </ScrollView>
        </View>

        <Text style={styles.sectionTitle}>REQUIRED PACKAGES</Text>

        {termuxApk ? (
          <AppCard
            apk={termuxApk}
            status={dlState.termux}
            progress={dlState.termuxProgress}
            errorMsg={dlState.termuxError}
            onDownload={() => downloadAndInstall("termux")}
          />
        ) : (
          <View style={styles.skeletonCard} />
        )}

        {nethunterApk ? (
          <AppCard
            apk={nethunterApk}
            status={dlState.nethunter}
            progress={dlState.nethunterProgress}
            errorMsg={dlState.nethunterError}
            onDownload={() => downloadAndInstall("nethunter-kex")}
          />
        ) : (
          <View style={styles.skeletonCard} />
        )}

        {Platform.OS !== "android" && (
          <View style={styles.warningBox}>
            <Ionicons name="phone-portrait-outline" size={18} color={C.accentAmber} />
            <Text style={styles.warningText}>
              APK installation requires a physical Android device. Scan the QR code in Expo Go on your phone.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => router.push("/distros")}
          activeOpacity={0.8}
        >
          <Text style={styles.continueBtnText}>CONTINUE TO DISTROS</Text>
          <Ionicons name="arrow-forward" size={18} color="#0a0a0a" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  header: {
    marginBottom: 4,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "700",
    color: C.accent,
    fontFamily: "ShareTechMono_400Regular",
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 12,
    color: C.textDim,
    fontFamily: "ShareTechMono_400Regular",
    letterSpacing: 1,
  },
  scanLine: {
    height: 1,
    backgroundColor: C.accent,
    opacity: 0.3,
    marginBottom: 4,
  },
  terminalBox: {
    backgroundColor: "#050505",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    height: 140,
  },
  terminalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#111",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  termDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  termTitle: {
    fontSize: 11,
    color: C.textDim,
    fontFamily: "ShareTechMono_400Regular",
    marginLeft: 8,
  },
  terminalContent: {
    flex: 1,
    padding: 12,
  },
  termLine: {
    fontSize: 11,
    fontFamily: "ShareTechMono_400Regular",
    lineHeight: 18,
  },
  cursorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cursor: {
    fontSize: 11,
    color: C.accent,
    fontFamily: "ShareTechMono_400Regular",
  },
  sectionTitle: {
    fontSize: 11,
    color: C.textDim,
    fontFamily: "ShareTechMono_400Regular",
    letterSpacing: 2,
    marginTop: 4,
  },
  appCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 12,
  },
  appCardDone: {
    borderColor: "rgba(0,255,65,0.3)",
    backgroundColor: "rgba(0,255,65,0.03)",
  },
  appCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  appIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  appCardInfo: {
    flex: 1,
    gap: 2,
  },
  appNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  appName: {
    fontSize: 16,
    fontWeight: "600",
    color: C.text,
    fontFamily: "ShareTechMono_400Regular",
  },
  appVersion: {
    fontSize: 10,
    color: C.textDim,
    fontFamily: "ShareTechMono_400Regular",
  },
  appDesc: {
    fontSize: 12,
    color: C.textDim,
    lineHeight: 17,
  },
  appSize: {
    fontSize: 11,
    color: C.textMuted,
    fontFamily: "ShareTechMono_400Regular",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "ShareTechMono_400Regular",
    letterSpacing: 0.5,
  },
  progressSection: {
    gap: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: C.accentCyan,
    fontFamily: "ShareTechMono_400Regular",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontFamily: "ShareTechMono_400Regular",
    width: 36,
    textAlign: "right",
  },
  errorMsg: {
    fontSize: 11,
    color: C.accentRed,
    fontFamily: "ShareTechMono_400Regular",
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.accentCyan,
    borderRadius: 8,
    paddingVertical: 12,
  },
  downloadBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0a0a0a",
    fontFamily: "ShareTechMono_400Regular",
    letterSpacing: 1,
  },
  skeletonCard: {
    height: 100,
    borderRadius: 12,
    backgroundColor: C.card,
    opacity: 0.5,
  },
  warningBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(255,183,0,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,183,0,0.3)",
    borderRadius: 10,
    padding: 14,
    alignItems: "flex-start",
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: C.accentAmber,
    lineHeight: 18,
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  continueBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0a0a0a",
    fontFamily: "ShareTechMono_400Regular",
    letterSpacing: 1.5,
  },
});

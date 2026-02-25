import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import Colors from "@/constants/colors";

const C = Colors.dark;

type LaunchMode = "cli" | "desktop" | null;

const TERMUX_SCRIPTS: Record<string, { cli: string; desktop: string }> = {
  ubuntu: {
    cli: "pkg update -y && pkg install wget curl proot tar -y && wget https://raw.githubusercontent.com/AndronixApp/AndronixOrigin/master/Installer/Ubuntu22/ubuntu22.sh -O ubuntu22.sh && chmod +x ubuntu22.sh && bash ubuntu22.sh",
    desktop: "pkg update -y && pkg install wget curl proot tar -y && wget https://raw.githubusercontent.com/AndronixApp/AndronixOrigin/master/Installer/Ubuntu22/ubuntu22-xfce.sh -O ubuntu22-xfce.sh && chmod +x ubuntu22-xfce.sh && bash ubuntu22-xfce.sh",
  },
  debian: {
    cli: "pkg update -y && pkg install wget curl proot tar -y && wget https://raw.githubusercontent.com/AndronixApp/AndronixOrigin/master/Installer/Debian/debian.sh -O debian.sh && chmod +x debian.sh && bash debian.sh",
    desktop: "pkg update -y && pkg install wget curl proot tar -y && wget https://raw.githubusercontent.com/AndronixApp/AndronixOrigin/master/Installer/Debian/debian-xfce.sh -O debian-xfce.sh && chmod +x debian-xfce.sh && bash debian-xfce.sh",
  },
  kali: {
    cli: "pkg update -y && pkg install wget curl proot tar -y && wget https://raw.githubusercontent.com/AndronixApp/AndronixOrigin/master/Installer/Kali/kali.sh -O kali.sh && chmod +x kali.sh && bash kali.sh",
    desktop: "pkg update -y && pkg install wget curl proot tar -y && wget https://raw.githubusercontent.com/AndronixApp/AndronixOrigin/master/Installer/Kali/kali-xfce.sh -O kali-xfce.sh && chmod +x kali-xfce.sh && bash kali-xfce.sh",
  },
  void: {
    cli: "",
    desktop: "pkg update -y && pkg install wget curl proot tar -y && wget https://raw.githubusercontent.com/AndronixApp/AndronixOrigin/master/Installer/Void/void-xfce.sh && chmod +x void-xfce.sh && bash void-xfce.sh",
  },
  fedora: {
    cli: "",
    desktop: "pkg update -y && pkg install wget curl proot tar -y && wget https://raw.githubusercontent.com/AndronixApp/AndronixOrigin/master/Installer/Fedora/fedora-xfce.sh -O fedora-xfce.sh && chmod +x fedora-xfce.sh && bash fedora-xfce.sh",
  },
  arch: {
    cli: "pkg update -y && pkg install wget curl proot tar -y && wget https://raw.githubusercontent.com/AndronixApp/AndronixOrigin/master/Installer/Arch/armhf/arch.sh -O arch.sh && chmod +x arch.sh && bash arch.sh",
    desktop: "pkg update -y && pkg install wget curl proot tar -y && wget https://raw.githubusercontent.com/AndronixApp/AndronixOrigin/master/Installer/Arch/armhf/arch-xfce.sh -O arch-xfce.sh && chmod +x arch-xfce.sh && bash arch-xfce.sh",
  },
};

const DISTRO_ICONS: Record<string, string> = {
  ubuntu: "ubuntu",
  debian: "debian",
  kali: "shield-skull",
  void: "linux",
  fedora: "fedora",
  arch: "arch",
};

function ModeCard({
  title,
  subtitle,
  icon,
  selected,
  disabled,
  onSelect,
  accentColor,
}: {
  title: string;
  subtitle: string;
  icon: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  accentColor: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (disabled) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
      <TouchableOpacity
        style={[
          styles.modeCard,
          selected && { borderColor: accentColor, backgroundColor: `${accentColor}10` },
          disabled && styles.modeCardDisabled,
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={disabled}
      >
        <MaterialCommunityIcons
          name={icon as any}
          size={32}
          color={disabled ? C.textMuted : selected ? accentColor : C.textDim}
        />
        <Text style={[
          styles.modeTitle,
          selected && { color: accentColor },
          disabled && { color: C.textMuted },
        ]}>
          {title}
        </Text>
        <Text style={[styles.modeSub, disabled && { color: C.border }]}>{subtitle}</Text>
        {disabled && (
          <View style={styles.disabledBadge}>
            <Text style={styles.disabledText}>N/A</Text>
          </View>
        )}
        {selected && (
          <View style={[styles.selectedDot, { backgroundColor: accentColor }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function CommandPreview({ command }: { command: string }) {
  if (!command) return null;
  return (
    <View style={styles.cmdPreview}>
      <Text style={styles.cmdLabel}>TERMUX COMMAND</Text>
      <View style={styles.cmdBox}>
        <Text style={styles.cmdPrompt}>$ </Text>
        <Text style={styles.cmdText}>{command}</Text>
      </View>
    </View>
  );
}

export default function LaunchScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    version: string;
    accentColor: string;
    supportsCli: string;
    supportsDesktop: string;
  }>();

  const [selectedMode, setSelectedMode] = useState<LaunchMode>(null);
  const [copied, setCopied] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;

  const supportsCli = params.supportsCli === "true";
  const supportsDesktop = params.supportsDesktop === "true";
  const accentColor = params.accentColor || C.accent;
  const scripts = TERMUX_SCRIPTS[params.id] || { cli: "", desktop: "" };
  const currentScript = selectedMode === "cli" ? scripts.cli : selectedMode === "desktop" ? scripts.desktop : "";
  const iconName = DISTRO_ICONS[params.id] || "linux";

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  useEffect(() => {
    if (!supportsCli && selectedMode === "cli") setSelectedMode(null);
  }, [supportsCli, selectedMode]);

  useEffect(() => {
    if (copied) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [copied, pulseAnim]);

  const handleCopyCommand = async () => {
    if (!selectedMode || !currentScript) return;

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    await Clipboard.setStringAsync(currentScript);
    setCopied(true);

    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={accentColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: accentColor }]}>CONFIGURE</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 + (Platform.OS === "web" ? 34 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[
          styles.distroHeader,
          {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          },
        ]}>
          <View style={[styles.distroHeroIcon, { backgroundColor: `${accentColor}15`, borderColor: `${accentColor}40` }]}>
            <MaterialCommunityIcons name={iconName as any} size={72} color={accentColor} />
          </View>
          <View style={styles.distroHeroInfo}>
            <Text style={styles.distroHeroName}>{params.name}</Text>
            <Text style={[styles.distroHeroVersion, { color: accentColor }]}>{params.version}</Text>
            <View style={[styles.statusIndicator, { borderColor: `${accentColor}50` }]}>
              <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
              <Text style={[styles.statusText, { color: accentColor }]}>READY TO DEPLOY</Text>
            </View>
          </View>
        </Animated.View>

        <View style={[styles.separator, { backgroundColor: `${accentColor}30` }]} />

        <Text style={styles.sectionLabel}>SELECT LAUNCH MODE</Text>

        <View style={styles.modesRow}>
          <ModeCard
            title="CLI Only"
            subtitle="Terminal interface"
            icon="console-line"
            selected={selectedMode === "cli"}
            disabled={!supportsCli}
            onSelect={() => setSelectedMode("cli")}
            accentColor={accentColor}
          />
          <ModeCard
            title="Desktop"
            subtitle="XFCE via KeX"
            icon="monitor-screenshot"
            selected={selectedMode === "desktop"}
            disabled={!supportsDesktop}
            onSelect={() => setSelectedMode("desktop")}
            accentColor={accentColor}
          />
        </View>

        {selectedMode && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={C.accentCyan} />
            <Text style={styles.infoText}>
              {selectedMode === "cli"
                ? `Installs ${params.name} in Termux using proot. Provides full shell access with root access.`
                : `Installs ${params.name} with XFCE desktop. Open NetHunter KeX after installation to start the GUI.`}
            </Text>
          </View>
        )}

        {currentScript ? <CommandPreview command={currentScript} /> : null}

        <View style={styles.requirementsBox}>
          <Text style={styles.requirementsTitle}>REQUIREMENTS</Text>
          <View style={styles.reqItem}>
            <Ionicons name="information-circle-outline" size={14} color={C.accentAmber} />
            <Text style={styles.reqText}>Termux installed & updated</Text>
          </View>
          {selectedMode === "desktop" && (
            <View style={styles.reqItem}>
              <Ionicons name="information-circle-outline" size={14} color={C.accentAmber} />
              <Text style={styles.reqText}>NetHunter KeX installed</Text>
            </View>
          )}
          <View style={styles.reqItem}>
            <Ionicons name="information-circle-outline" size={14} color={C.textDim} />
            <Text style={styles.reqText}>Stable internet connection</Text>
          </View>
          <View style={styles.reqItem}>
            <Ionicons name="information-circle-outline" size={14} color={C.textDim} />
            <Text style={styles.reqText}>~2 GB free storage</Text>
          </View>
        </View>

        {copied && (
          <View style={styles.copiedBanner}>
            <Ionicons name="checkmark-circle" size={16} color={C.accent} />
            <Text style={styles.copiedBannerText}>Command copied! Open Termux and paste to run.</Text>
          </View>
        )}

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[
              styles.launchBtn,
              {
                backgroundColor: copied
                  ? "rgba(0,255,65,0.15)"
                  : selectedMode
                  ? accentColor
                  : C.border,
                borderWidth: copied ? 1.5 : 0,
                borderColor: copied ? C.accent : "transparent",
              },
            ]}
            onPress={handleCopyCommand}
            disabled={!selectedMode}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={copied ? "clipboard-check" : "content-copy"}
              size={20}
              color={copied ? C.accent : selectedMode ? "#0a0a0a" : C.textMuted}
            />
            <Text style={[
              styles.launchBtnText,
              !selectedMode && { color: C.textMuted },
              copied && { color: C.accent },
            ]}>
              {copied
                ? "COMMAND COPIED!"
                : selectedMode
                ? `COPY ${selectedMode === "cli" ? "CLI" : "DESKTOP"} COMMAND`
                : "SELECT A MODE FIRST"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "ShareTechMono_400Regular",
    letterSpacing: 3,
  },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16 },
  distroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingVertical: 8,
  },
  distroHeroIcon: {
    width: 100,
    height: 100,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  distroHeroInfo: { flex: 1, gap: 6 },
  distroHeroName: {
    fontSize: 26,
    fontWeight: "700",
    color: C.text,
    fontFamily: "ShareTechMono_400Regular",
  },
  distroHeroVersion: {
    fontSize: 13,
    fontFamily: "ShareTechMono_400Regular",
    letterSpacing: 1,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: {
    fontSize: 9,
    fontFamily: "ShareTechMono_400Regular",
    letterSpacing: 1,
  },
  separator: { height: 1, marginVertical: 4 },
  sectionLabel: {
    fontSize: 11,
    color: C.textDim,
    fontFamily: "ShareTechMono_400Regular",
    letterSpacing: 2,
  },
  modesRow: { flexDirection: "row", gap: 12 },
  modeCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 16,
    alignItems: "center",
    gap: 8,
    position: "relative",
    minHeight: 120,
    justifyContent: "center",
    flex: 1,
  },
  modeCardDisabled: { opacity: 0.4 },
  modeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
    fontFamily: "ShareTechMono_400Regular",
    textAlign: "center",
  },
  modeSub: { fontSize: 11, color: C.textDim, textAlign: "center" },
  disabledBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: C.border,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  disabledText: {
    fontSize: 8,
    color: C.textMuted,
    fontFamily: "ShareTechMono_400Regular",
  },
  selectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: "absolute",
    bottom: 10,
  },
  infoBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(0,229,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,229,255,0.2)",
    borderRadius: 10,
    padding: 14,
    alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 12, color: C.textDim, lineHeight: 18 },
  cmdPreview: { gap: 8 },
  cmdLabel: {
    fontSize: 9,
    color: C.textMuted,
    fontFamily: "ShareTechMono_400Regular",
    letterSpacing: 2,
  },
  cmdBox: {
    flexDirection: "row",
    backgroundColor: "#050505",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  cmdPrompt: {
    fontSize: 12,
    color: C.accent,
    fontFamily: "ShareTechMono_400Regular",
  },
  cmdText: {
    fontSize: 12,
    color: C.accentCyan,
    fontFamily: "ShareTechMono_400Regular",
    flex: 1,
  },
  requirementsBox: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 10,
  },
  requirementsTitle: {
    fontSize: 10,
    color: C.textMuted,
    fontFamily: "ShareTechMono_400Regular",
    letterSpacing: 2,
    marginBottom: 2,
  },
  reqItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  reqText: { fontSize: 13, color: C.textDim, fontFamily: "ShareTechMono_400Regular" },
  launchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 18,
    marginTop: 4,
  },
  launchBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0a0a0a",
    fontFamily: "ShareTechMono_400Regular",
    letterSpacing: 1.5,
  },
  copiedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(0,255,65,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,255,65,0.3)",
    borderRadius: 10,
    padding: 12,
  },
  copiedBannerText: {
    flex: 1,
    fontSize: 12,
    color: C.accent,
    fontFamily: "ShareTechMono_400Regular",
    lineHeight: 18,
  },
});

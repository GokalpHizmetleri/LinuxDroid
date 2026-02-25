import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";

const C = Colors.dark;

interface Distro {
  id: string;
  name: string;
  version: string;
  description: string;
  accentColor: string;
  icon: string;
  supportsCli: boolean;
  supportsDesktop: boolean;
  beta: boolean;
  scriptBase: string;
}

const DISTRO_ICONS: Record<string, string> = {
  ubuntu: "ubuntu",
  debian: "debian",
  manjaro: "manjaro",
  kali: "kali-linux",
  fedora: "fedora",
  arch: "arch",
  alpine: "linux",
};

function AnimatedDistroCard({ distro, index }: { distro: Distro; index: number }) {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.97)).current;

  React.useEffect(() => {
    const delay = index * 80;
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 350, delay, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
    ]).start();
  }, [index, translateY, opacity, scale]);

  const handlePress = () => {
    router.push({
      pathname: "/launch",
      params: {
        id: distro.id,
        name: distro.name,
        version: distro.version,
        accentColor: distro.accentColor,
        supportsDesktop: distro.supportsDesktop ? "true" : "false",
      },
    });
  };

  const iconName = DISTRO_ICONS[distro.id] || "linux";

  return (
    <Animated.View style={{ transform: [{ translateY }, { scale }], opacity }}>
      <TouchableOpacity
        style={styles.distroCard}
        onPress={handlePress}
        activeOpacity={0.75}
      >
        <View style={[styles.distroAccentBar, { backgroundColor: distro.accentColor }]} />
        <View style={styles.distroCardInner}>
          <View style={[styles.distroIconWrap, { backgroundColor: `${distro.accentColor}15` }]}>
            <MaterialCommunityIcons
              name={iconName as any}
              size={36}
              color={distro.accentColor}
            />
          </View>

          <View style={styles.distroInfo}>
            <View style={styles.distroTitleRow}>
              <Text style={styles.distroName}>{distro.name}</Text>
              {distro.beta && (
                <View style={[styles.betaBadge, { borderColor: C.accentAmber }]}>
                  <Text style={[styles.betaText, { color: C.accentAmber }]}>BETA</Text>
                </View>
              )}
            </View>
            <Text style={styles.distroVersion}>{distro.version}</Text>
            <Text style={styles.distroDesc} numberOfLines={2}>{distro.description}</Text>

            <View style={styles.modesRow}>
              <View style={[styles.modeChip, { backgroundColor: "rgba(0,255,65,0.1)", borderColor: "rgba(0,255,65,0.3)" }]}>
                <MaterialCommunityIcons name="console-line" size={10} color={C.accent} />
                <Text style={[styles.modeChipText, { color: C.accent }]}>CLI</Text>
              </View>
              {distro.supportsDesktop ? (
                <View style={[styles.modeChip, { backgroundColor: "rgba(0,229,255,0.1)", borderColor: "rgba(0,229,255,0.3)" }]}>
                  <MaterialCommunityIcons name="monitor" size={10} color={C.accentCyan} />
                  <Text style={[styles.modeChipText, { color: C.accentCyan }]}>DESKTOP</Text>
                </View>
              ) : (
                <View style={[styles.modeChip, { backgroundColor: "rgba(100,100,100,0.1)", borderColor: "rgba(100,100,100,0.3)" }]}>
                  <MaterialCommunityIcons name="monitor-off" size={10} color={C.textMuted} />
                  <Text style={[styles.modeChipText, { color: C.textMuted }]}>CLI ONLY</Text>
                </View>
              )}
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function DistrosScreen() {
  const insets = useSafeAreaInsets();

  const { data: distros, isLoading, error, refetch } = useQuery<Distro[]>({
    queryKey: ["/api/distros"],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={C.accent} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>SELECT DISTRO</Text>
          <Text style={styles.headerSub}>Choose your Linux environment</Text>
        </View>
        <MaterialCommunityIcons name="penguin" size={28} color={C.accent} />
      </View>
      <View style={styles.divider} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 + (Platform.OS === "web" ? 34 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <View style={styles.loadingContainer}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.skeletonCard} />
            ))}
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={40} color={C.accentRed} />
            <Text style={styles.errorTitle}>Failed to load distros</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>RETRY</Text>
            </TouchableOpacity>
          </View>
        )}

        {distros && (
          <>
            <View style={styles.countRow}>
              <Text style={styles.countText}>{distros.length} distributions available</Text>
              <View style={styles.countDot} />
            </View>
            {distros.map((distro, index) => (
              <AnimatedDistroCard key={distro.id} distro={distro} index={index} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
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
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    fontFamily: "ShareTechMono_400Regular",
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 11,
    color: C.textDim,
    fontFamily: "ShareTechMono_400Regular",
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 20,
    marginBottom: 4,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  countText: {
    fontSize: 11,
    color: C.textMuted,
    fontFamily: "ShareTechMono_400Regular",
  },
  countDot: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  distroCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    flexDirection: "row",
  },
  distroAccentBar: {
    width: 4,
  },
  distroCardInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 14,
  },
  distroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  distroInfo: {
    flex: 1,
    gap: 3,
  },
  distroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  distroName: {
    fontSize: 16,
    fontWeight: "600",
    color: C.text,
    fontFamily: "ShareTechMono_400Regular",
  },
  betaBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  betaText: {
    fontSize: 8,
    fontFamily: "ShareTechMono_400Regular",
    letterSpacing: 0.5,
  },
  distroVersion: {
    fontSize: 11,
    color: C.textMuted,
    fontFamily: "ShareTechMono_400Regular",
  },
  distroDesc: {
    fontSize: 12,
    color: C.textDim,
    lineHeight: 17,
    marginTop: 2,
  },
  modesRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  modeChipText: {
    fontSize: 9,
    fontFamily: "ShareTechMono_400Regular",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    gap: 12,
  },
  skeletonCard: {
    height: 90,
    borderRadius: 14,
    backgroundColor: C.card,
    opacity: 0.5,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 16,
  },
  errorTitle: {
    fontSize: 16,
    color: C.accentRed,
    fontFamily: "ShareTechMono_400Regular",
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: C.accentRed,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: {
    fontSize: 13,
    color: C.accentRed,
    fontFamily: "ShareTechMono_400Regular",
    letterSpacing: 1,
  },
});

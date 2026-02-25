import type { Express } from "express";
import { createServer, type Server } from "node:http";

const APK_REGISTRY = [
  {
    id: "termux",
    name: "Termux",
    packageName: "com.termux",
    version: "1022",
    description: "Terminal emulator and Linux environment",
    downloadUrl: "https://f-droid.org/repo/com.termux_1022.apk",
    size: "~68 MB",
    required: true,
  },
  {
    id: "nethunter-kex",
    name: "NetHunter KeX",
    packageName: "com.offsec.nethunter.kex",
    version: "1.3",
    description: "Run XFCE-Enabled Distros",
    downloadUrl: "https://store.nethunter.com/repo/com.offsec.nethunter.kex_11525001.apk",
    size: "~15 MB",
    required: true,
  },
];

const DISTROS = [
  {
    id: "ubuntu",
    name: "Ubuntu",
    version: "22.04 LTS",
    description: "The most popular Linux distro. Great for beginners.",
    accentColor: "#E95420",
    icon: "ubuntu",
    supportsCli: true,
    supportsDesktop: true,
    beta: false,
  },
  {
    id: "debian",
    name: "Debian",
    version: "12 Bookworm",
    description: "Stable, reliable, and universal. The mother of many distros.",
    accentColor: "#A80030",
    icon: "debian",
    supportsCli: true,
    supportsDesktop: true,
    beta: false,
  },
  {
    id: "kali",
    name: "Kali Linux",
    version: "2024.1",
    description: "The ultimate penetration testing and security platform.",
    accentColor: "#2678D2",
    icon: "kali",
    supportsCli: true,
    supportsDesktop: true,
    beta: false,
  },
  {
    id: "void",
    name: "Void Linux",
    version: "Rolling",
    description: "Independent, rolling-release distro with runit init system.",
    accentColor: "#478061",
    icon: "linux",
    supportsCli: false,
    supportsDesktop: true,
    beta: false,
  },
  {
    id: "fedora",
    name: "Fedora",
    version: "40",
    description: "Cutting-edge features with Red Hat backing.",
    accentColor: "#3C6EB4",
    icon: "fedora",
    supportsCli: false,
    supportsDesktop: true,
    beta: false,
  },
  {
    id: "arch",
    name: "Arch Linux",
    version: "Rolling",
    description: "Minimalist, highly customizable. For the hardcore enthusiast.",
    accentColor: "#1793D1",
    icon: "arch",
    supportsCli: true,
    supportsDesktop: true,
    beta: true,
  },
];

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/apks", (_req, res) => {
    res.json(APK_REGISTRY);
  });

  app.get("/api/apks/:id", (req, res) => {
    const apk = APK_REGISTRY.find((a) => a.id === req.params.id);
    if (!apk) {
      return res.status(404).json({ message: "APK not found" });
    }
    res.json(apk);
  });

  app.get("/api/distros", (_req, res) => {
    res.json(DISTROS);
  });

  app.get("/api/distros/:id", (req, res) => {
    const distro = DISTROS.find((d) => d.id === req.params.id);
    if (!distro) {
      return res.status(404).json({ message: "Distro not found" });
    }
    res.json(distro);
  });

  const httpServer = createServer(app);
  return httpServer;
}

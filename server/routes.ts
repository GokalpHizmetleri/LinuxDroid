import type { Express } from "express";
import { createServer, type Server } from "node:http";

const APK_REGISTRY = [
  {
    id: "termux",
    name: "Termux",
    packageName: "com.termux",
    version: "0.118.1",
    description: "Terminal emulator and Linux environment",
    downloadUrl: "https://github.com/termux/termux-app/releases/download/v0.118.1/termux-app_v0.118.1+github-debug_arm64-v8a.apk",
    size: "~68 MB",
    required: true,
  },
  {
    id: "nethunter-kex",
    name: "NetHunter KeX",
    packageName: "com.offsec.nethunter.kex",
    version: "1.3",
    description: "Kali NetHunter Desktop Experience",
    downloadUrl: "https://store.nethunter.com/packages/com.offsec.nethunter.kex.apk",
    size: "~15 MB",
    required: true,
  },
];

const DISTROS = [
  {
    id: "ubuntu",
    name: "Ubuntu",
    version: "24.04 LTS",
    description: "The most popular Linux distro. Great for beginners.",
    accentColor: "#E95420",
    icon: "ubuntu",
    supportsCli: true,
    supportsDesktop: true,
    beta: false,
    scriptBase: "ubuntu",
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
    scriptBase: "debian",
  },
  {
    id: "manjaro",
    name: "Manjaro",
    version: "23.1",
    description: "User-friendly Arch-based distro with rolling releases.",
    accentColor: "#35BF5C",
    icon: "manjaro",
    supportsCli: true,
    supportsDesktop: true,
    beta: false,
    scriptBase: "manjaro",
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
    scriptBase: "kali",
  },
  {
    id: "fedora",
    name: "Fedora",
    version: "40",
    description: "Cutting-edge features with Red Hat backing.",
    accentColor: "#3C6EB4",
    icon: "fedora",
    supportsCli: true,
    supportsDesktop: true,
    beta: false,
    scriptBase: "fedora",
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
    scriptBase: "arch",
  },
  {
    id: "alpine",
    name: "Alpine",
    version: "3.20",
    description: "Security-oriented, lightweight Linux based on musl libc.",
    accentColor: "#0D597F",
    icon: "alpine",
    supportsCli: true,
    supportsDesktop: false,
    beta: false,
    scriptBase: "alpine",
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

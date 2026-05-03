export const SITE_CONFIG = {
  name: "CineNexus",
  firstName: "Cine",
  lastName: "Nexus",
  shortName: "CN",
  tagline: "The Cinematic Social Hub",
  description: "Book movies, join communities, and chat with fellow film enthusiasts. CineNexus combines premium cinema booking with a vibrant social network.",
  domain: "cinenexus.app",
  author: "CineNexus Team",
  year: new Date().getFullYear() > 2026 ? `2026-${new Date().getFullYear()}` : "2026",
  version: "1.0.0",
  
  contact: {
    email: "hello@cinenexus.app",
    support: "support@cinenexus.app",
    address: "Cinema Street, Film District, CA 90210",
  },

  social: {
    twitter: "https://twitter.com/CineNexus",
    instagram: "https://instagram.com/cinenexus",
    github: "https://github.com/cinenexus",
    discord: "https://discord.gg/cinenexus",
  },

  theme: {
    primary: "#1fb6ff", // accent-blue
    secondary: "#ff3366", // accent-pink
    accent: "#a855f7", // purple-500
    background: "#0f172a", // slate-900
    surface: "#1e293b", // slate-800
  },

  assets: {
    logo: "/logo.png",
    favicon: "/favicon.ico",
    ogImage: "/og-image.png",
    authBackground: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop",
  },

  navigation: {
    main: [
      { name: "Home", path: "/" },
      { name: "Movies", path: "/movies" },
      { name: "Cinemas", path: "/theatres" },
      { name: "Community", path: "/search" },
    ],
    footer: [
      { name: "About Us", path: "/about" },
      { name: "Privacy Policy", path: "/privacy" },
      { name: "Terms of Service", path: "/terms" },
      { name: "API Docs", path: "/api-docs" },
    ],
  },

  features: {
    enableChat: true,
    enableReviews: true,
    enableSubscriptions: true,
    maintenanceMode: false,
  },

  analytics: {
    googleAnalyticsId: "G-XXXXXXXXXX",
    sentryDsn: "",
  },

  stats: {
    users: "50k+",
    partners: "2.5k+",
  }
};

export const SITE_CONFIG = {
  // Brand is configurable per deployment (VITE_APP_NAME etc.) so resellers can white-label.
  name: import.meta.env.VITE_APP_NAME || "Nexus Platform",
  firstName: (import.meta.env.VITE_APP_NAME || "Nexus Platform").split(" ")[0],
  lastName: (import.meta.env.VITE_APP_NAME || "Nexus Platform").split(" ").slice(1).join(" "),
  shortName: "NP",
  tagline: "Business services platform",
  description: "One account for authentication, messaging, chatbots, developer tools, bookings and community services, with reseller support.",
  domain: import.meta.env.VITE_APP_DOMAIN || "localhost",
  author: "Platform Team",
  year: new Date().getFullYear() > 2026 ? `2026-${new Date().getFullYear()}` : "2026",
  version: "1.0.0",
  
  contact: {
    email: import.meta.env.VITE_CONTACT_EMAIL || "",
    support: import.meta.env.VITE_SUPPORT_EMAIL || "",
    address: "",
  },

  social: {
    twitter: "",
    instagram: "",
    github: "",
    discord: "",
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

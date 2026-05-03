import { SITE_CONFIG } from '../config/site.config.js';

export const SEO_CONFIG = {
  SITE_NAME: SITE_CONFIG.name,
  DEFAULT_TITLE: `${SITE_CONFIG.name} - ${SITE_CONFIG.tagline}`,
  DEFAULT_DESCRIPTION: SITE_CONFIG.description,
  DEFAULT_KEYWORDS: "movies, cinema, booking, tickets, shows, theater, popcorn, trailers, chat, social, community",
  DEFAULT_OG_IMAGE: SITE_CONFIG.assets.ogImage,
  TITLE_TEMPLATE: `%s | ${SITE_CONFIG.name}`,
  THEME_COLOR: SITE_CONFIG.theme.background,
};

export const PAGE_META = {
  HOME: {
    TITLE: "Home",
    DESCRIPTION: "Explore the latest blockbusters and find the best cinema experience near you.",
  },
  MOVIES: {
    TITLE: "Movies",
    DESCRIPTION: "Browse all currently playing and upcoming movies.",
  },
  CINEMAS: {
    TITLE: "Cinemas",
    DESCRIPTION: "Find your nearest theatres and check showtimes.",
  },
  SEARCH: {
    TITLE: "Search",
    DESCRIPTION: "Search for movies, actors, or theatres.",
  },
  AUTH: {
    LOGIN: {
      TITLE: "Login",
      DESCRIPTION: `Sign in to your ${SITE_CONFIG.name} account to manage bookings.`,
    },
    REGISTER: {
      TITLE: "Register",
      DESCRIPTION: `Join ${SITE_CONFIG.name} to get personalized movie recommendations and easy booking.`,
    },
  },
  DASHBOARD: {
    TITLE: "Dashboard",
    DESCRIPTION: "Manage your profile, bookings, and preferences.",
  },
};

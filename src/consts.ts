import type { Site, Page, Links, Socials } from "@types"

// Global
export const SITE: Site = {
  TITLE: "METEOR",
  DESCRIPTION: "Welcome to METEOR, Utility Token for the Decentralized Infrastructure",
  AUTHOR: "GenesisLab",
}

// Roadmap Page
export const ROADMAP: Page = {
  TITLE: "Roadmap",
  DESCRIPTION: "Project milestones and timeline.",
}

// How-To Page
export const HOWTO: Page = {
  TITLE: "How-To",
  DESCRIPTION: "Step-by-step guide.",
}

// Projects Page 
export const PROJECTS: Page = {
  TITLE: "Projects",
  DESCRIPTION: "Ongoing and upcoming initiatives.",
}

// Search Page
export const SEARCH: Page = {
  TITLE: "Search",
  DESCRIPTION: "Search all posts and projects by keyword.",
}

// Links
export const LINKS: Links = [
  { 
    TEXT: "Home", 
    HREF: "/", 
  },
  { 
    TEXT: "Roadmap", 
    HREF: "/roadmap", 
  },
  { 
    TEXT: "How-To", 
    HREF: "/howto", 
  },
  { 
    TEXT: "Projects", 
    HREF: "/projects", 
  },
]

// Socials
export const SOCIALS: Socials = [
  { 
    NAME: "Github",
    ICON: "github",
    TEXT: "meteor-42",
    HREF: "https://github.com/meteor-42"
  },
  { 
    NAME: "Twitter!",
    ICON: "twitter-x",
    TEXT: "42_meteor",
    HREF: "https://x.com/42_meteor",
  },
  { 
    NAME: "Telegram",
    ICON: "telegram",
    TEXT: "mtr_x42",
    HREF: "https://t.me/mtr_x42",
  }
]

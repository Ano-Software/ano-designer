import type { LinkButtonStyle } from "@/types/api";

export type TextAlignment = "left" | "center" | "right";
export type FontChoice = "sans" | "serif" | "mono" | "display";
export type BackgroundKind = "color" | "gradient";
export type HeroImageAlignment = "left" | "center" | "right";

export type HeroImage = {
  dataUrl: string;
  fileName: string;
  backgroundRemoved: boolean;
  assetUrl?: string | null;
};

export type HeroSettings = {
  heading: string;
  subheading: string;
  headerHeight: number;
  backgroundKind: BackgroundKind;
  backgroundColor: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  titleColor: string;
  subtitleColor: string;
  alignment: TextAlignment;
  titleFont: FontChoice;
  subtitleFont: FontChoice;
  titleSize: number;
  subtitleSize: number;
  coverImage: HeroImage | null;
  coverImagePosition: HeroImageAlignment;
  autoRemoveBackground: boolean;
  autoOptimizeImage: boolean;
};

export type ButtonCanvasItem = {
  id: string;
  label: string;
  url: string;
  style: LinkButtonStyle;
  textColor: string;
  backgroundColor: string;
  secondaryColor?: string | null;
  gradientAngle?: number;
  icon?: string | null;
  image?: string | null;
  buttonHeight?: number;
};

export type ProjectDraft = {
  base: {
    title: string;
    slug: string;
  };
  style: {
    hero: HeroSettings;
    buttons: ButtonCanvasItem[];
  };
  content: {
    clientName: string;
    clientPhone: string;
    primaryLink: string;
  };
  publication: {
    status: "draft" | "published";
  };
  metadata: {
    updatedAt: string;
  };
};

export const defaultHeroSettings: HeroSettings = {
  heading: "",
  subheading: "",
  headerHeight: 320,
  backgroundKind: "gradient",
  backgroundColor: "#0f172a",
  gradientFrom: "#22d3ee",
  gradientTo: "#0f172a",
  gradientAngle: 45,
  titleColor: "#ffffff",
  subtitleColor: "#f1f5f9",
  alignment: "center",
  titleFont: "sans",
  subtitleFont: "sans",
  titleSize: 40,
  subtitleSize: 18,
  coverImage: null,
  coverImagePosition: "center",
  autoRemoveBackground: true,
  autoOptimizeImage: true,
};

export const defaultProjectDraft: ProjectDraft = {
  base: {
    title: "",
    slug: "",
  },
  style: {
    hero: { ...defaultHeroSettings },
    buttons: [],
  },
  content: {
    clientName: "",
    clientPhone: "",
    primaryLink: "",
  },
  publication: {
    status: "draft",
  },
  metadata: {
    updatedAt: new Date(0).toISOString(),
  },
};

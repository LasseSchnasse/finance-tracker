import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finance Tracker",
    short_name: "Finance",
    description: "Persönlicher Finanz-Tracker",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#18181b",
    orientation: "portrait",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}

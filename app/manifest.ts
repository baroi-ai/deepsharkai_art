import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DeepShark AI Studio",
    short_name: "DeepShark",
    description: "The Ultimate AI Image & Video Studio",
    start_url: "/",
    display: "standalone", // This makes it look like a native app (hides URL bar)
    background_color: "#020617", // Matches your slate-950 background
    theme_color: "#14b8a6", // Matches your teal-500 branding
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

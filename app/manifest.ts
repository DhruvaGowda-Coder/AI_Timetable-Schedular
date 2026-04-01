import { type MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TimetabiQ",
    short_name: "TimetabiQ",
    description: "AI-powered timetable scheduling with analytics and exports.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2e6fb8",
    icons: [
      {
        src: "/logo.png",
        sizes: "768x768",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}


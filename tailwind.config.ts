import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0F1A",
        card: "#11162A",
        primary: "#7B6CFF",
        border: "#1E2440",
        muted: "#9AA0B5",
        text: "#E6E8F0",
      },
    },
  },
  plugins: [],
};

export default config;

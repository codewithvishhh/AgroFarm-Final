/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      opacity: {
        4: "0.04",
        6: "0.06",
        8: "0.08",
        12: "0.12",
        35: "0.35",
        45: "0.45",
        55: "0.55",
        65: "0.65",
        85: "0.85",
      },
      colors: {
        soil: {
          900: "#0D1512",
          800: "#121D18",
          700: "#16241E",
          600: "#1D2F27",
          500: "#274236",
        },
        crop: "#4FBF7A",
        harvest: "#E2A03F",
        chill: "#5AA9CE",
        rot: "#E2564D",
        husk: "#E6EFE8",
        moss: "#8CA79A",
        // Cinematic extensions used by the glass and depth system.
        canopy: "#06120C",
        emeraldDeep: "#0A3A26",
        beige: "#E8E2D4",
      },
      fontFamily: {
        display: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel:
          "0 1px 0 rgba(255,255,255,0.03) inset, 0 12px 32px rgba(0,0,0,0.35)",
        glass:
          "0 1px 0 rgba(255,255,255,0.08) inset, 0 20px 50px -20px rgba(0,0,0,0.75)",
        lift:
          "0 1px 0 rgba(255,255,255,0.10) inset, 0 32px 70px -26px rgba(0,0,0,0.85)",
        glow: "0 0 0 1px rgba(79,191,122,0.25), 0 18px 45px -18px rgba(79,191,122,0.45)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.9)", opacity: "0.8" },
          "70%": { transform: "scale(1.9)", opacity: "0" },
          "100%": { transform: "scale(1.9)", opacity: "0" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translate3d(0,0,0) rotate(0deg)" },
          "50%": { transform: "translate3d(0,-14px,0) rotate(2deg)" },
        },
        drift: {
          "0%": { transform: "translate3d(0,0,0)" },
          "100%": { transform: "translate3d(0,-120px,0)" },
        },
        sheen: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(220%)" },
        },
        auroraShift: {
          "0%, 100%": { transform: "translate3d(-4%, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(4%, -3%, 0) scale(1.08)" },
        },
      },
      animation: {
        pulseRing: "pulseRing 2.2s ease-out infinite",
        floatSlow: "floatSlow 9s ease-in-out infinite",
        drift: "drift 18s linear infinite",
        sheen: "sheen 2.6s ease-in-out infinite",
        aurora: "auroraShift 22s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

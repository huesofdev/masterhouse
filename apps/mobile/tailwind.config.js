/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#D97706',   // Amber 600
          secondary: '#F59E0B', // Amber 500
          cta: '#7C3AED',       // Violet 600
        },
        surface: {
          DEFAULT: '#FFFFFF',
          highlight: '#F1F5F9',
        },
        text: {
          primary: '#0F172A',
          secondary: '#475569',
          disabled: '#94A3B8',
        },
        status: {
          success: '#059669',
          error: '#DC2626',
          warning: '#EA580C',
        },
        // OLED Dark Mode overrides from UI UX Pro Max
        oled: {
          primary: '#0F172A',
          secondary: '#334155',
          cta: '#0369A1',
          bg: '#000000', // Deep black for OLED
          text: '#F8FAFC'
        }
      }
    },
  },
  plugins: [],
};

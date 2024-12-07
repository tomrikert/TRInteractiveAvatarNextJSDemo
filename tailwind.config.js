import {nextui} from '@nextui-org/theme'

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      colors: {
        primary: '#1A73E8', // OpenAI-like blue
        secondary: '#F1F3F4', // Light gray
        accent: '#34A853', // Green accent
        background: '#FFFFFF', // White background
        text: '#202124', // Dark text
      },
    },
  },
  darkMode: "class",
  plugins: [nextui()],
}

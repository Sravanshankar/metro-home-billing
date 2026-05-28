/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#09090B', // Obsidian base
          800: '#14141B', // Card background
          700: '#1F1F2E', // Borders and input focus
          600: '#2F2F42', // Soft borders / text
        },
        brand: {
          cyan: '#06B6D4',    // POS, barcode, core links
          emerald: '#10B981', // Revenue, success, stock-safe
          amber: '#F59E0B',   // Warnings, low-stock
          rose: '#EF4444',    // Alerts, deleted items, unpaid bills
          indigo: '#6366F1'  // Customer cards, loyalty levels
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'glass-sm': '0 2px 8px 0 rgba(0, 0, 0, 0.3)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
        'neon-cyan': '0 0 15px rgba(6, 182, 212, 0.35)',
        'neon-emerald': '0 0 15px rgba(16, 189, 129, 0.35)',
      }
    },
  },
  plugins: [],
}

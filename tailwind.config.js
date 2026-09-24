/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
        urdu: ['"Noto Nastaliq Urdu"', '"Jameel Noori Nastaleeq"', '"Noto Naskh Arabic"', 'serif'],
        num: ['Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        brand: {
          teal: '#134e4a',
          emerald: '#047857',
          gold: '#ca8a04',
          stone: '#44403c'
        }
      },
      boxShadow: {
        glass: '0 20px 50px -12px rgba(6, 78, 59, 0.35)',
        card: '0 10px 30px -10px rgba(6, 78, 59, 0.25)'
      },
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem'
      },
      borderRadius: {
        '4xl': '1.25rem'
      }
    }
  },
  plugins: []
};

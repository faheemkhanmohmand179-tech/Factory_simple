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
          indigo: '#1e3a8a',
          violet: '#7c3aed',
          pink: '#db2777',
          amber: '#f59e0b'
        }
      },
      boxShadow: {
        glass: '0 20px 50px -12px rgba(30, 58, 138, 0.35)',
        card: '0 10px 30px -10px rgba(30, 58, 138, 0.25)'
      },
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem'
      },
      borderRadius: {
        '4xl': '2rem'
      }
    }
  },
  plugins: []
};

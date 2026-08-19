module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#f97316',
          'orange-dark': '#ea580c',
          purple: '#9333ea',
          'purple-dark': '#7e22ce',
          violet: '#8b5cf6'
        }
      }
    }
  },
  plugins: []
};

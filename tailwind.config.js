/** @type {import('tailwindcss').Config} */

const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  content: [
    "./src/**/*.{html,ts}",
    "./node_modules/flowbite/**/*.js" // add this lines
  ],
  theme: {
    colors: {
      'primary-bg': '#fefaf1'
    },
    extend: {
      fontFamily: {
          'sans': ['Roboto', ...defaultTheme.fontFamily.sans]
        }
    }    
  },
  plugins: [
    require('flowbite/plugin')
  ],
}


    
  
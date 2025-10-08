/** @type {import('tailwindcss').Config} */
export default {
 content: [
 "./index.html",
 "./src/**/*.{js,ts,jsx,tsx}",
 ],
 darkMode: 'class',
 theme: {
 extend: {
 colors: {
 primary: {
 50: '#f0f1ff',
 100: '#e5e7ff',
 500: '#6366f1',
 600: '#4f46e5',
 700: '#4338ca',
 },
 secondary: {
 500: '#10b981',
 600: '#059669',
 },
 dark: {
 primary: '#0f1117',
 secondary: '#1a1d29',
 tertiary: '#23263a',
 hover: '#2d3148',
 },
 text: {
 primary: '#ffffff',
 secondary: '#9ca3af',
 muted: '#6b7280',
 },
 },
 animation: {
 'slide-in': 'slideIn 0.3s ease-out',
 'float': 'float 3s ease-in-out infinite',
 },
 keyframes: {
 slideIn: {
 '0%': { opacity: '0', transform: 'translateY(20px)' },
 '100%': { opacity: '1', transform: 'translateY(0)' },
 },
 float: {
 '0%, 100%': { transform: 'translateY(0)' },
 '50%': { transform: 'translateY(-20px)' },
 },
 },
 },
 },
 plugins: [],
}

// Page setup for the runs site (fonts, title, background), then hand back its App
const font = document.createElement('link')
font.rel = 'stylesheet'
font.href = 'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Inter:wght@400;500;600;700&display=swap'
document.head.appendChild(font)

document.title = 'Runs · CourtFlow Hoops'

// Home screen icon + name (the admin page adds its own manifest so "Add to Home Screen" opens admin)
for (const [tag, attrs] of [
  ['link', { rel: 'apple-touch-icon', href: '/runs-icon-180.png' }],
  ['meta', { name: 'apple-mobile-web-app-title', content: 'Runs' }],
  ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }],
]) {
  const el = document.createElement(tag)
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
  document.head.appendChild(el)
}
document.documentElement.style.background = '#0c0d10'
document.body.style.background = '#0c0d10'
document.body.style.color = '#f4f1ea'
document.body.classList.add('font-body')
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0c0d10')
document.querySelector('meta[name="viewport"]')?.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover')

export { default } from './App.jsx'

// Page setup for the runs site (fonts, title, background), then hand back its App
const font = document.createElement('link')
font.rel = 'stylesheet'
font.href = 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,600;0,6..72,700;1,6..72,600;1,6..72,700&display=swap'
document.head.appendChild(font)

document.title = 'Pickup Runs · CourtFlow'
document.documentElement.style.background = '#fbf7f1'
document.body.style.background = '#fbf7f1'
document.body.style.color = '#1f1a16'
document.querySelector('meta[name="viewport"]')?.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover')

export { default } from './App.jsx'

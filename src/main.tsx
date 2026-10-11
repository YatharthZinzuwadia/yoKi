import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/fraunces/full-italic.css'
import '@fontsource-variable/fraunces/full.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/tiro-devanagari-sanskrit/400.css'
import './styles/app.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

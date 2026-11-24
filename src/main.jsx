import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// After a deploy an open tab may ask for a script file that no longer exists.
// Reload once to pick up the new version (guarded so it can never loop).
window.addEventListener('vite:preloadError', () => {
  try {
    if (sessionStorage.getItem('reloaded-after-deploy')) return
    sessionStorage.setItem('reloaded-after-deploy', '1')
  } catch { /* storage blocked — reload anyway */ }
  window.location.reload()
})
setTimeout(() => { try { sessionStorage.removeItem('reloaded-after-deploy') } catch { /* ignore */ } }, 15000)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

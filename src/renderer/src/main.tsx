import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import { App } from './app/App'
import './app/styles.css'

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)

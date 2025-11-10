import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Importa os estilos do Tailwind
import { TestModeProvider } from './contexts/TestModeContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TestModeProvider>
      <App />
    </TestModeProvider>
  </React.StrictMode>,
)
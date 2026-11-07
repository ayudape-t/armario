import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { SesionProvider } from './lib/sesion';
import './styles.css';

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <BrowserRouter basename="/app">
      <SesionProvider>
        <App />
      </SesionProvider>
    </BrowserRouter>
  </StrictMode>,
);

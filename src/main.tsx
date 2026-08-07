import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  const aiIcon = new Image();
  aiIcon.src = 'https://i.ibb.co/jvfRYXDR/cone-Circular-Abstrato-em-Espiral-removebg-preview.png';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

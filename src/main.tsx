import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeWebModelContext } from '@mcp-b/global';

// Initialize the official W3C Web Model Context Protocol (WebMCP) runtime
// Exposes window.document.modelContext and navigator.modelContext
try {
  initializeWebModelContext();
  console.log('[WebMCP] Initialized W3C Web Model Context Protocol runtime via @mcp-b/global');
} catch (err) {
  console.warn('[WebMCP] WebModelContext initialization note:', err);
}

createRoot(document.getElementById('root')!).render(<App />);

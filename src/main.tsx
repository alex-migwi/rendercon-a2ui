import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeWebModelContext } from '@mcp-b/global';

// Initialize the WebMCP (Web Model Context Protocol) runtime via the @mcp-b polyfill.
// WebMCP is a W3C Web Machine Learning Community Group draft, not yet a ratified standard.
// Exposes window.document.modelContext (and navigator.modelContext) for tool discovery.
try {
  initializeWebModelContext();
  console.log('[WebMCP] Initialized Web Model Context Protocol runtime (experimental) via @mcp-b/global');
} catch (err) {
  console.warn('[WebMCP] WebModelContext initialization note:', err);
}

createRoot(document.getElementById('root')!).render(<App />);

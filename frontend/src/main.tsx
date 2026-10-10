import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Fonts are bundled from npm (the Google Fonts files), so the app also works offline.
// Each weight file includes the cyrillic-ext subset needed for Kazakh letters.
import '@fontsource/golos-text/400.css';
import '@fontsource/golos-text/500.css';
import '@fontsource/golos-text/600.css';
import '@fontsource/source-serif-4/600.css';

import './shared/i18n';
import './shared/styles/tokens.css';
import './shared/styles/global.css';
import { App } from './app/App';

const root = document.getElementById('root');
if (!root) throw new Error('index.html must contain <div id="root">');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

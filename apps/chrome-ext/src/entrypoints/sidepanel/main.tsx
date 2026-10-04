import '../../styles/sidepanel.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { SidePanelApp } from '../../sidepanel/side-panel-app';

const rootElement = document.getElementById('root');
if (rootElement === null) throw new Error('sidepanel/index.html must contain <div id="root">.');

createRoot(rootElement).render(
  <StrictMode>
    <SidePanelApp />
  </StrictMode>,
);

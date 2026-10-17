import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { clearLegacyAssistantChatHistory } from './lib/legacyAssistantChatHistory';
import { applyAppZoom, getSavedAppZoom } from './lib/appZoom';
import { applyAppTheme, getSavedAppTheme } from './lib/appThemes';

clearLegacyAssistantChatHistory();
applyAppZoom(getSavedAppZoom());
applyAppTheme(getSavedAppTheme());
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

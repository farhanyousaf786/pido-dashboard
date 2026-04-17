import React from 'react';
import ReactDOM from 'react-dom/client';
import Main from './pages/main';
import { AuthProvider } from './core/auth/AuthContext';
import { initThemeFromStorage } from './core/theme/theme.js';
import './styles.css';

initThemeFromStorage();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <Main />
    </AuthProvider>
  </React.StrictMode>,
);

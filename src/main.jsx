import React from 'react';
import ReactDOM from 'react-dom/client';
import Main from './pages/main';
import { AuthProvider } from './core/auth/AuthContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <Main />
    </AuthProvider>
  </React.StrictMode>,
);

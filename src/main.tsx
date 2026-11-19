import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './theme.css';
import { prepareOffline } from './offline';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
// El WebView de Tauri usa los recursos empaquetados; la Web usa caché de aplicación.
prepareOffline();

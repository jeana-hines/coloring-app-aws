// src/main.jsx
// This is the standard entry point file for the Vite/React application.
// Its sole purpose is to connect the React library to the HTML document.

import React from 'react';
import ReactDOM from 'react-dom/client';
// 1. Import your main application component (App.jsx)
import App from './App.jsx';
// 2. Import the global CSS file
import './index.css'; 

// 3. Find the root element in index.html and start rendering the React app.
// It renders the <App /> component into the <div id="root"> element in index.html.
ReactDOM.createRoot(document.getElementById('root')).render(
  // React.StrictMode is a tool for identifying potential problems in an application
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
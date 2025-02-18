import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';  // Add the .js extension here
import './index.css';

const rootEl = document.getElementById('root');
const root = ReactDOM.createRoot(rootEl);
root.render(<App />);

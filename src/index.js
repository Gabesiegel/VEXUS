import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  return <h1>Hello from React + VExUS!</h1>;
}

const rootEl = document.getElementById('root');
const root = ReactDOM.createRoot(rootEl);
root.render(<App />);

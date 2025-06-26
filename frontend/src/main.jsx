import React from 'react';
import ReactDOM from 'react-dom/client';
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';
import AuthCallback from './AuthCallback.jsx';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </BrowserRouter>              
  </React.StrictMode>
);

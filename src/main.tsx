import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import BuyTheDipPage from '@/app/strategies/buy-the-dip/page';
import DowntrendBreakoutPage from '@/app/strategies/downtrend-breakout/page';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/strategies/buy-the-dip" element={<BuyTheDipPage />} />
        <Route path="/strategies/downtrend-breakout" element={<DowntrendBreakoutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);

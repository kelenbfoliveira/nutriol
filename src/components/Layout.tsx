import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

// Simulate auth check for layout wrapper
const Layout: React.FC = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

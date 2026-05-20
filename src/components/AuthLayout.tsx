import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="auth-container">
      <div className="auth-card fade-in">
        <div className="logo-container">
          <h1 className="logo-text">NutriOl</h1>
        </div>
        <h2 className="auth-title">{title}</h2>
        <p className="auth-subtitle">{subtitle}</p>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;

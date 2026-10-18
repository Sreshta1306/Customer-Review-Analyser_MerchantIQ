import React from 'react';
import './AuthLayout.css';

interface AuthLayoutProps {
  children: React.ReactNode;
  mode: 'login' | 'signup';
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, mode }) => {
  return (
    <div className="auth-page">
      <div className="auth-background" aria-hidden="true" />
      <main className="auth-main">
        <div className="auth-content">
          <header className="auth-brand-row">
            <div className="auth-brand">
              <span className="auth-brand-mark" aria-hidden="true">M</span>
              <span className="auth-brand-copy">
                <strong>Merchant<span>IQ</span></strong>
                <small>Review to Action</small>
              </span>
            </div>
            <span className="auth-mode-label">{mode === 'login' ? 'MERCHANT PORTAL' : 'NEW WORKSPACE'}</span>
          </header>

          <section
            className="auth-card"
            aria-label={mode === 'login' ? 'Sign in to MerchantIQ' : 'Create a MerchantIQ account'}
          >
            <div className="auth-form-content">{children}</div>
          </section>

          <p className="auth-footer">MerchantIQ <span aria-hidden="true">&middot;</span> Review to Action</p>
        </div>
      </main>
    </div>
  );
};
import React, { useEffect, useRef } from 'react';
import landingMarkup from './landing-content.html?raw';
import { attachLandingInteractions, LandingAuthDestination } from './landing-interactions';
import './landing-page.css';

interface PublicLandingPageProps {
  onNavigate: (destination: LandingAuthDestination) => void;
}

export const PublicLandingPage: React.FC<PublicLandingPageProps> = ({ onNavigate }) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const previousTitle = document.title;
    const documentElement = document.documentElement;
    const previousScrollBehavior = documentElement.style.scrollBehavior;
    const previousScrollPaddingTop = documentElement.style.scrollPaddingTop;
    document.title = 'MerchantIQ — From Customer Feedback to Corrective Action';
    documentElement.style.scrollPaddingTop = '76px';
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      documentElement.style.scrollBehavior = 'smooth';
    }
    const detachInteractions = attachLandingInteractions(root, onNavigate);
    return () => {
      detachInteractions();
      document.title = previousTitle;
      documentElement.style.scrollBehavior = previousScrollBehavior;
      documentElement.style.scrollPaddingTop = previousScrollPaddingTop;
    };
  }, [onNavigate]);

  return (
    <div
      ref={rootRef}
      className="merchantiq-landing"
      dangerouslySetInnerHTML={{ __html: landingMarkup }}
    />
  );
};

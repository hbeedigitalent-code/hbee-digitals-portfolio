'use client';

import { useEffect, useState } from 'react';
import SvgIcon from './SvgIcon';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 500) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--btn-primary-text)] shadow-lg transition-all hover:scale-110 hover:bg-[var(--accent-lime)]"
      aria-label="Scroll to top"
    >
      <SvgIcon name="chevron-up" size={20} color="currentColor" />
    </button>
  );
}
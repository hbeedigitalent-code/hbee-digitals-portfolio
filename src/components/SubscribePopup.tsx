'use client';

import { useState, useEffect } from 'react';
import SvgIcon from '@/components/ui/SvgIcon';

export default function SubscribePopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Check if user already subscribed or dismissed
    const hasSubscribed = localStorage.getItem('hbee_subscribed');
    const hasDismissedPopup = localStorage.getItem('hbee_popup_dismissed');
    
    if (hasSubscribed || hasDismissedPopup) {
      return;
    }

    // Show popup after 2 minutes
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 120000); // 2 minutes

    return () => clearTimeout(timer);
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, source: 'popup' }),
      });

      if (res.ok) {
        setStatus('success');
        localStorage.setItem('hbee_subscribed', 'true');
        setTimeout(() => {
          setIsVisible(false);
          setIsCollapsed(false);
        }, 2000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const handleNoThanks = () => {
    localStorage.setItem('hbee_popup_dismissed', 'true');
    
    if (isCollapsed) {
      setIsVisible(false);
      setIsCollapsed(false);
    } else {
      setIsCollapsed(true);
    }
  };

  const handleExpand = () => {
    setIsCollapsed(false);
  };

  if (!isVisible) return null;

  // Collapsed sidebar widget
  if (isCollapsed) {
    return (
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50">
        <button
          onClick={handleExpand}
          className="group flex items-center gap-2 bg-gradient-orange-green text-white px-4 py-3 rounded-l-xl shadow-lg hover:scale-105 transition transform origin-right"
        >
          <SvgIcon name="bell" size={18} color="white" />
          <span className="text-sm font-bold hidden md:inline">Stay Updated</span>
          <span className="text-xs font-bold md:hidden">Updates</span>
        </button>
      </div>
    );
  }

  // Full popup modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md mx-4 bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
        {/* Close button */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </button>

        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-[var(--accent)]/10 to-[var(--accent-orange)]/10 p-6 text-center border-b border-[var(--border)]">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-orange-green flex items-center justify-center">
            <SvgIcon name="bell" size={28} color="white" />
          </div>
          <h3 className="text-2xl font-black text-[var(--text-primary)]">Stay Updated!</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Get notified about new updates, products, tips and tutorials. No spam. You can always unsubscribe.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubscribe} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="your@email.com"
            />
          </div>

          {status === 'success' && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg p-3 text-sm text-center">
              ✓ Subscribed successfully! Check your email.
            </div>
          )}
          {status === 'error' && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm text-center">
              Something went wrong. Please try again.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={status === 'loading'}
              className="flex-1 bg-gradient-orange-green text-white px-4 py-2 rounded-full font-bold hover:scale-105 transition disabled:opacity-50"
            >
              {status === 'loading' ? 'Subscribing...' : 'Join the list'}
            </button>
            <button
              type="button"
              onClick={handleNoThanks}
              className="px-4 py-2 rounded-full border border-[var(--border)] text-[var(--text-muted)] font-bold hover:bg-[var(--bg-section)] transition"
            >
              No, thanks
            </button>
          </div>
        </form>

        {/* Footer note */}
        <div className="bg-[var(--bg-section)] px-6 py-3 text-center text-xs text-[var(--text-muted)] border-t border-[var(--border)]">
          <p>Unsubscribe anytime. We respect your privacy.</p>
        </div>
      </div>
    </div>
  );
}
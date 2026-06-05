'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

function subscribeClient(onChange: () => void) {
  onChange();
  return () => {};
}

/**
 * Tela de loading animada — aparece após hidratação no cliente e some com fade.
 */
export function AppLoadingScreen() {
  const isClient = useSyncExternalStore(
    subscribeClient,
    () => true,
    () => false,
  );
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!isClient) return;
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => setVisible(false), 500);
    }, 1200);
    return () => clearTimeout(timer);
  }, [isClient]);

  if (!isClient || !visible) return null;

  return (
    <>
      <style>{`
        @keyframes ng-dot {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1);   }
        }
        .ng-loading-screen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #F4F9F8;
          padding-top: env(safe-area-inset-top, 0px);
          padding-bottom: env(safe-area-inset-bottom, 0px);
          transition: opacity 500ms ease-out;
        }
        .ng-loading-screen.fading { opacity: 0; }
        .ng-loading-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #136C62;
          animation: ng-dot 1.2s ease-in-out infinite;
        }
      `}</style>

      <div className={`ng-loading-screen${fading ? ' fading' : ''}`} aria-hidden="true">
        <img
          src="/app-icon.png"
          alt=""
          width={120}
          height={120}
          style={{
            width: '120px',
            height: '120px',
            objectFit: 'contain',
            display: 'block',
          }}
        />

        <p style={{
          marginTop: '24px',
          marginBottom: 0,
          fontSize: '24px',
          fontWeight: '700',
          color: '#136C62',
          letterSpacing: '-0.3px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          NutriGestão
        </p>

        <p style={{
          marginTop: '6px',
          marginBottom: 0,
          fontSize: '11px',
          color: '#8FA8A5',
          letterSpacing: '0.8px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          GESTÃO NUTRICIONAL PROFISSIONAL
        </p>

        <div style={{ display: 'flex', gap: '10px', marginTop: '40px' }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="ng-loading-dot"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';

/**
 * Tela de loading animada — aparece imediatamente via SSR (visible=true no servidor)
 * e desaparece com fade após o app hidratar.
 */
export function AppLoadingScreen() {
  // Iniciar como false para não renderizar no SSR.
  // No cliente, mostra imediatamente após montagem e some após 1200ms.
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Mostrar imediatamente no cliente
    setVisible(true);

    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => setVisible(false), 500);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

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
        {/* Logo */}
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

        {/* Nome */}
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

        {/* Subtítulo */}
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

        {/* Dots */}
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

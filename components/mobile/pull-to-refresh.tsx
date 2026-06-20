'use client';

import { useEffect } from 'react';

import { isNativeApp } from '@/lib/mobile/platform';

/**
 * Pull-to-refresh nativo para Android e iOS.
 *
 * Detecta o gesto de arrastar para baixo quando a página já está no topo
 * (scrollY ≈ 0) e, ao ultrapassar o limiar, dispara window.location.reload()
 * — equivalente ao Ctrl+F5 no browser (reload forçado, sem cache).
 *
 * Técnica:
 * - Touch events passivos (não bloqueiam o scroll nativo).
 * - Fórmula de resistência: pullPx = delta * 0.55 → exige ~127px de arrasto
 *   para atingir o limiar de 70px, simulando a sensação elástica nativa.
 * - Indicador visual (spinner) reaparece suavemente seguindo o dedo.
 * - Ao soltar após o limiar: mantém o spinner girando e recarrega em 300ms.
 */

const PULL_THRESHOLD_PX = 70;
const RESISTANCE = 0.55; // fator de redução do arrasto → feel elástico

export function PullToRefresh() {
  useEffect(() => {
    if (!isNativeApp()) return;

    // ─── Estado do gesto ────────────────────────────────────────────────────
    let startY = 0;
    let isPulling = false;
    let triggered = false;
    let indicator: HTMLDivElement | null = null;

    // ─── Safe-area top para posicionar o indicador ──────────────────────────
    const safeTop =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--status-bar-height'),
      ) || 28;

    // ─── Estilos de animação ─────────────────────────────────────────────────
    const styleEl = document.createElement('style');
    styleEl.id = '__ptr_styles__';
    styleEl.textContent = `
      @keyframes __ptr_spin__ {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      #__ptr_indicator__ {
        position: fixed;
        top: ${safeTop + 6}px;
        left: 50%;
        transform: translateX(-50%) translateY(-64px);
        z-index: 99999;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 2px 10px rgba(0,0,0,0.18);
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        opacity: 0;
        will-change: transform, opacity;
      }
      #__ptr_indicator__.ptr-dismiss {
        transition: transform 0.22s ease, opacity 0.22s ease;
        transform: translateX(-50%) translateY(-64px) !important;
        opacity: 0 !important;
      }
      #__ptr_indicator__.ptr-triggered {
        background: #2D6A4F;
      }
      #__ptr_indicator__.ptr-triggered svg {
        stroke: #ffffff;
        animation: __ptr_spin__ 0.7s linear infinite;
      }
    `;
    document.head.appendChild(styleEl);

    // ─── Helpers do indicador ────────────────────────────────────────────────

    function getIndicator(): HTMLDivElement {
      if (indicator) return indicator;

      const el = document.createElement('div');
      el.id = '__ptr_indicator__';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
             stroke="#2D6A4F" stroke-width="2.5" stroke-linecap="round"
             style="display:block">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>`;
      document.body.appendChild(el);
      indicator = el;
      return el;
    }

    function updateIndicator(pullPx: number): void {
      const el = getIndicator();
      const progress = Math.min(pullPx / PULL_THRESHOLD_PX, 1);

      // Move para baixo seguindo o dedo (máx. +20px além da posição inicial)
      const translateY = -64 + Math.min(pullPx * 0.9, 84);
      const opacity = Math.min(progress * 1.6, 1);

      el.style.transform = `translateX(-50%) translateY(${translateY}px)`;
      el.style.opacity = String(opacity);

      const svg = el.querySelector<SVGElement>('svg');
      if (svg) svg.style.transform = `rotate(${progress * 320}deg)`;

      if (progress >= 1) {
        el.classList.add('ptr-triggered');
      } else {
        el.classList.remove('ptr-triggered');
      }
    }

    function dismissIndicator(): void {
      if (!indicator) return;
      const el = indicator;
      indicator = null;
      el.classList.add('ptr-dismiss');
      setTimeout(() => el.remove(), 250);
    }

    function lockIndicatorSpinning(): void {
      if (!indicator) return;
      indicator.classList.add('ptr-triggered');
      // Remove a transição de posição para não tremer durante o reload
      indicator.style.transition = 'none';
    }

    // ─── Handlers de toque ───────────────────────────────────────────────────

    function onTouchStart(e: TouchEvent): void {
      startY = e.touches[0].clientY;
      isPulling = false;
      triggered = false;
    }

    function onTouchMove(e: TouchEvent): void {
      // Se já scrollou para baixo, não é pull-to-refresh
      const scrollTop =
        document.documentElement.scrollTop || document.body.scrollTop || window.scrollY;
      if (scrollTop > 4) {
        if (isPulling) {
          isPulling = false;
          dismissIndicator();
        }
        return;
      }

      const delta = e.touches[0].clientY - startY;

      // Apenas arrastar para BAIXO a partir do topo
      if (delta < 4) {
        if (isPulling) {
          isPulling = false;
          dismissIndicator();
        }
        return;
      }

      isPulling = true;

      // Resistência elástica
      const pullPx = delta * RESISTANCE;
      updateIndicator(pullPx);

      if (pullPx >= PULL_THRESHOLD_PX) {
        triggered = true;
      }
    }

    function onTouchEnd(): void {
      if (!isPulling) return;
      isPulling = false;

      if (triggered) {
        // Trava o spinner e aguarda 300ms antes de recarregar
        lockIndicatorSpinning();
        setTimeout(() => {
          window.location.reload();
        }, 300);
      } else {
        dismissIndicator();
      }
    }

    // ─── Registro dos listeners ──────────────────────────────────────────────

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      document.getElementById('__ptr_styles__')?.remove();
      indicator?.remove();
      indicator = null;
    };
  }, []);

  return null;
}

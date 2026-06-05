/**
 * Gera um UUID v4 compatível com todos os ambientes:
 * - Browsers modernos e Android WebView recente: usa crypto.randomUUID()
 * - Android WebView antigo (< Chrome 92 / Android 12): fallback manual
 * - Node.js (SSR): usa crypto.randomUUID() nativo
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 manual
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

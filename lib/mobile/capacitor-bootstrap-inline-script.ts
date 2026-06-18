import { ANDROID_STATUS_BAR_FALLBACK_PX } from '@/lib/mobile/safe-area-insets';

/**
 * Script inline no <head> — roda sem hidratação do React.
 * Esconde o splash cedo e aplica safe-area no Android (sem plugin StatusBar).
 */
export const CAPACITOR_BOOTSTRAP_INLINE_SCRIPT = `(function () {
  var ANDROID_FALLBACK = ${ANDROID_STATUS_BAR_FALLBACK_PX};
  var STYLE_ID = 'nutrigestao-native-safe-area';
  var PLATFORM_ATTR = 'data-ng-platform';
  var NATIVE_CLIENT_COOKIE = 'ng_native_client=1; path=/; max-age=31536000; SameSite=Lax';

  function persistNativeClientCookie() {
    var secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = NATIVE_CLIENT_COOKIE + secure;
  }

  function persistStyle(px) {
    if (!px || px <= 0) return;
    var el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent =
      ':root{--status-bar-height:' + px + 'px;}' +
      'html[data-ng-platform="android"],html.native-android{--safe-area-top:max(env(safe-area-inset-top,0px),var(--status-bar-height,0px),' + ANDROID_FALLBACK + 'px);}';
  }

  function ensureHeight(px) {
    if (!px || px <= 0) return;
    var current = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--status-bar-height') || '0',
    );
    var next = (!isFinite(current) || px > current) ? px : current;
    persistStyle(next);
  }

  function markAndroid() {
    document.documentElement.classList.add('native-app', 'native-android');
    document.documentElement.setAttribute(PLATFORM_ATTR, 'android');
    ensureHeight(ANDROID_FALLBACK);
  }

  if (/Android/i.test(navigator.userAgent) && /; wv\\)/.test(navigator.userAgent)) {
    markAndroid();
    persistNativeClientCookie();
  }

  function isNative() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }
  function platform() {
    return (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform()) || '';
  }
  function plugins() {
    return (window.Capacitor && window.Capacitor.Plugins) || {};
  }
  function pluginsReady() {
    var p = plugins();
    return !!(p.SplashScreen || p.StatusBar);
  }

  function applyPlatformClasses() {
    document.documentElement.classList.add('native-app');
    if (platform() === 'android') {
      markAndroid();
    } else if (platform() === 'ios') {
      document.documentElement.classList.add('native-ios');
      document.documentElement.setAttribute(PLATFORM_ATTR, 'ios');
    }
  }

  async function hideSplash() {
    try {
      var splash = plugins().SplashScreen;
      if (splash && splash.hide) await splash.hide();
    } catch (_) {}
  }

  async function configureStatusBar() {
    if (!isNative()) return;
    applyPlatformClasses();
    if (platform() === 'android') {
      ensureHeight(ANDROID_FALLBACK);
      return;
    }
    try {
      var sb = plugins().StatusBar;
      if (!sb) return;
      if (sb.setOverlaysWebView) {
        try { await sb.setOverlaysWebView({ overlay: false }); } catch (_) {}
      }
      if (sb.setBackgroundColor) {
        try { await sb.setBackgroundColor({ color: '#F4F9F8' }); } catch (_) {}
      }
      if (sb.setStyle) await sb.setStyle({ style: 'LIGHT' });
      if (sb.show) await sb.show();
    } catch (_) {}
  }

  async function bootstrap() {
    if (!isNative()) return;
    applyPlatformClasses();
    persistNativeClientCookie();
    await hideSplash();
    await configureStatusBar();
  }

  function whenReady(cb, left) {
    if (!isNative()) return;
    applyPlatformClasses();
    if (pluginsReady()) {
      cb();
      return;
    }
    if (left <= 0) return;
    setTimeout(function () { whenReady(cb, left - 1); }, 50);
  }

  whenReady(bootstrap, 80);
})();`;

(() => {
  if (window.__micMaxLoaderScriptReady) return;
  window.__micMaxLoaderScriptReady = true;

  const EXT = globalThis.browser ?? globalThis.chrome;
  if (!EXT?.runtime?.getURL) return;

  const injectorUrl = EXT.runtime.getURL('core/injector.js');

  const HEARTBEAT_INTERVAL_MS = 5000;

  function sendHeartbeat(hookReady = false) {
    try {
      const result = EXT.runtime.sendMessage({ type: 'MICMAX_HEARTBEAT', hookReady });
      if (result?.catch) result.catch(() => {});
    } catch (_) {}
  }

  function inject() {
    if (window.__micMaxLoaderBusy) return;
    window.__micMaxLoaderBusy = true;

    const alreadyInjected = document.documentElement?.dataset?.micMaxLoaderInjected === '1';
    if (alreadyInjected && window.__micMaxInjectorReady) {
      window.__micMaxLoaderBusy = false;
      sendHeartbeat(true);
      return;
    }

    const script = document.createElement('script');
    script.src = injectorUrl;
    script.async = false;
    script.dataset.omniWhatsAppLord = 'injector';
    script.onload = () => {
      document.documentElement.dataset.micMaxLoaderInjected = '1';
      window.__micMaxLoaderBusy = false;
      sendHeartbeat(false);
      script.remove();
    };
    script.onerror = () => {
      window.__micMaxLoaderBusy = false;
      script.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  inject();
  setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

  window.addEventListener('pageshow', () => {
    if (!window.__micMaxInjectorReady) inject();
  }, { passive: true });
})();

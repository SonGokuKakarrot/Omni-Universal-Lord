// Omni Mic Max V4 Pro - background module (adapted for all sites)
const EXT = globalThis.browser ?? globalThis.chrome;
const state = { installedAt: Date.now(), lastHeartbeat: 0, hookActiveTabs: new Map() };

function reply(sendResponse, payload) {
  try { sendResponse(payload); } catch (_) {}
}

function isInjectableUrl(url = '') {
  return /^(https?|file):/i.test(url);
}

async function injectIntoOpenTabs() {
  if (!EXT?.tabs?.query || !EXT?.scripting?.executeScript) return;
  let tabs = [];
  try {
    tabs = await EXT.tabs.query({});
  } catch (_) {
    return;
  }

  await Promise.allSettled(tabs
    .filter((tab) => tab?.id != null && isInjectableUrl(tab.url))
    .map((tab) => EXT.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ['content/loader.js', 'content/service.js']
    })));
}

if (EXT?.runtime?.onInstalled) {
  EXT.runtime.onInstalled.addListener(() => {
    console.log('[Omni Mic Max V4 Pro] installed');
    injectIntoOpenTabs();
  });
}

injectIntoOpenTabs();

if (EXT?.runtime?.onMessage) {
  EXT.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message !== 'object') return false;

    if (message.type === 'MICMAX_HEARTBEAT') {
      state.lastHeartbeat = Date.now();
      if (sender?.tab?.id != null) {
        const tabState = state.hookActiveTabs.get(sender.tab.id) || {};
        state.hookActiveTabs.set(sender.tab.id, {
          lastHeartbeat: state.lastHeartbeat,
          hookReadyAt: message.hookReady === true ? state.lastHeartbeat : tabState.hookReadyAt || 0
        });
      }
      reply(sendResponse, { ok: true });
      return false;
    }

    if (message.type === 'MICMAX_STATUS_REQUEST') {
      reply(sendResponse, {
        ok: true,
        installedAt: state.installedAt,
        lastHeartbeat: state.lastHeartbeat,
        hookReady: [...state.hookActiveTabs.values()].some((tab) => tab.hookReadyAt && Date.now() - tab.hookReadyAt < 30000),
        activeTabs: [...state.hookActiveTabs.keys()]
      });
      return false;
    }

    if (message.type === 'MICMAX_RESET_STATUS') {
      state.hookActiveTabs.clear();
      state.lastHeartbeat = 0;
      reply(sendResponse, { ok: true });
      return false;
    }

    return false;
  });
}

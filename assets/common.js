(() => {
  const cfg = window.APP_CONFIG || {};
  const configured = cfg.supabaseUrl && cfg.supabasePublishableKey && !String(cfg.supabaseUrl).startsWith('YOUR_') && !String(cfg.supabasePublishableKey).startsWith('YOUR_');
  window.GlossaryApp = {
    configured,
    db: configured && window.supabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    }) : null,
    escapeHtml(value='') {
      return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
    },
    normalize(value='') {
      return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    },
    toast(message) {
      const node = document.getElementById('toast');
      if (!node) return;
      node.textContent = message;
      node.classList.remove('hidden');
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => node.classList.add('hidden'), 2600);
    }
  };
})();

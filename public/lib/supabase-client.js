/**
 * supabase-client.js
 * Loads Supabase config from the backend (/api/config) so credentials
 * never appear in static source files.
 *
 * Usage in HTML:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
 *   <script src="/lib/supabase-client.js"></script>
 *   Then use: await window._supabaseReady; window._supabase.auth.signIn(...)
 */

window._supabaseReady = (async function () {
  if (typeof supabase === 'undefined') {
    console.error('[EG] Supabase CDN not loaded. Add the CDN script before supabase-client.js');
    return null;
  }

  try {
    const cfg = await fetch('/api/config').then(r => r.json());
    if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      console.error('[EG] /api/config returned invalid config');
      return null;
    }

    const client = supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    window._supabase = client;
    window.SUPABASE_URL = cfg.supabaseUrl;
    return client;
  } catch (e) {
    console.error('[EG] Failed to load config:', e.message);
    return null;
  }
})();

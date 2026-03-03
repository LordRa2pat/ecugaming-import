/**
 * supabase-client.js
 * Browser Supabase client — uses anon key (safe to expose in frontend).
 * Security is enforced by RLS policies in the database.
 *
 * Usage in HTML:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
 *   <script src="/lib/supabase-client.js"></script>
 *   Then use: window._supabase.auth.signIn(...), etc.
 */

(function () {
  // ⚠️ Replace these with your actual Supabase project values
  // These are PUBLIC values — the anon key is safe to include in frontend code
  const SUPABASE_URL     = 'https://YOUR_PROJECT_REF.supabase.co';
  const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';

  if (typeof supabase === 'undefined') {
    console.error('[EG] Supabase CDN not loaded. Add the CDN script before supabase-client.js');
    return;
  }

  const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession:    true,
      autoRefreshToken:  true,
      detectSessionInUrl: true
    }
  });

  // Expose globally
  window._supabase = client;
  window.SUPABASE_URL = SUPABASE_URL;
})();

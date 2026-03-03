/**
 * auth.js
 * Auth utilities for all frontend pages.
 * Requires supabase-client.js to be loaded first.
 */

const Auth = {
  /**
   * Get the current session (or null if not logged in)
   */
  async getSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    return session;
  },

  /**
   * Get current user + profile merged together, or null
   */
  async getUser() {
    const session = await this.getSession();
    if (!session) return null;
    const { data: profile } = await _supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    return profile ? { ...session.user, ...profile, token: session.access_token } : null;
  },

  /**
   * Ensure user is logged in. If not, redirect to login page.
   * Returns session if logged in, null (and redirects) if not.
   */
  async requireAuth(redirectTo = 'login.html') {
    const session = await this.getSession();
    if (!session) {
      location.href = `${redirectTo}?redirect=${encodeURIComponent(location.pathname + location.search)}`;
      return null;
    }
    return session;
  },

  /**
   * Ensure user is an admin. Redirects if not authenticated or not admin.
   * Returns the session access token for API calls.
   */
  async requireAdmin() {
    const session = await this.getSession();
    if (!session) {
      location.href = 'login.html';
      return null;
    }
    const { data: profile } = await _supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    if (!profile || profile.role !== 'admin') {
      alert('Acceso denegado. Se requieren permisos de administrador.');
      location.href = 'index.html';
      return null;
    }
    return session.access_token;
  },

  /**
   * Sign out and redirect to home
   */
  async signOut() {
    await _supabase.auth.signOut();
    location.href = 'index.html';
  },

  /**
   * Update the auth header UI element (if present on page).
   * Looks for #authArea element and renders login link or user menu.
   */
  async updateAuthUI() {
    const el = document.getElementById('authArea');
    if (!el) return;
    const session = await this.getSession();
    if (!session) {
      el.innerHTML = `
        <a href="login.html" class="btn-auth">
          <i class="fas fa-user"></i> Iniciar Sesión
        </a>`;
      return;
    }
    const { data: profile } = await _supabase
      .from('profiles')
      .select('first_name, role')
      .eq('id', session.user.id)
      .single();
    const name = profile?.first_name || session.user.email.split('@')[0];
    el.innerHTML = `
      <div class="user-menu">
        <button class="btn-auth user-btn" onclick="document.getElementById('userDropdown').classList.toggle('open')">
          <i class="fas fa-user-circle"></i> ${name}
          <i class="fas fa-chevron-down" style="font-size:10px;margin-left:4px"></i>
        </button>
        <div id="userDropdown" class="user-dropdown">
          <a href="account.html"><i class="fas fa-box"></i> Mi Cuenta</a>
          ${profile?.role === 'admin' ? '<a href="admin.html"><i class="fas fa-cog"></i> Panel Admin</a>' : ''}
          <a href="#" onclick="Auth.signOut()"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</a>
        </div>
      </div>`;
  }
};

// Close dropdown on outside click
document.addEventListener('click', function (e) {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown && !e.target.closest('.user-menu')) {
    dropdown.classList.remove('open');
  }
});

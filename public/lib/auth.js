/**
 * auth.js
 * Auth utilities for all frontend pages.
 * Requires supabase-client.js to be loaded first.
 * All methods await window._supabaseReady before using _supabase.
 */

const Auth = {
  async _ready() {
    return window._supabaseReady;
  },

  async getSession() {
    await this._ready();
    const { data: { session } } = await _supabase.auth.getSession();
    return session;
  },

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

  async requireAuth(redirectTo = '/login') {
    const session = await this.getSession();
    if (!session) {
      location.href = `${redirectTo}?redirect=${encodeURIComponent(location.pathname + location.search)}`;
      return null;
    }
    return session;
  },

  async requireAdmin() {
    const session = await this.getSession();
    if (!session) {
      location.href = '/login';
      return null;
    }
    const { data: profile } = await _supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    if (!profile || profile.role !== 'admin') {
      alert('Acceso denegado. Se requieren permisos de administrador.');
      location.href = '/';
      return null;
    }
    return session.access_token;
  },

  async signOut() {
    await this._ready();
    await _supabase.auth.signOut();
    location.href = '/';
  },

  async updateAuthUI() {
    const el = document.getElementById('authArea');
    if (!el) return;
    const session = await this.getSession();
    if (!session) {
      el.innerHTML = `
        <a href="/login" class="btn-auth">
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
          <a href="/account"><i class="fas fa-box"></i> Mi Cuenta</a>
          ${profile?.role === 'admin' ? '<a href="/admin"><i class="fas fa-cog"></i> Panel Admin</a>' : ''}
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

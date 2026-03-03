/**
 * cart.js
 * Shopping cart utilities — persists in localStorage (works for guests and logged-in users).
 * Cart items are sent to the server only at checkout (POST /api/orders/create).
 *
 * Item structure:
 * {
 *   id:         string (product UUID),
 *   name:       string,
 *   price:      number,
 *   sale_price: number|null,
 *   image_url:  string|null,
 *   category:   string,
 *   qty:        number
 * }
 */

const Cart = {
  _KEY: 'eg_cart',

  get() {
    try {
      return JSON.parse(localStorage.getItem(this._KEY) || '[]');
    } catch {
      return [];
    }
  },

  save(items) {
    localStorage.setItem(this._KEY, JSON.stringify(items));
  },

  add(product, qty = 1) {
    const items = this.get();
    const existing = items.find(i => i.id === product.id);
    if (existing) {
      existing.qty = (existing.qty || 1) + qty;
    } else {
      items.push({
        id:        product.id,
        name:      product.name,
        price:     product.sale_price ?? product.price,
        image_url: product.image_url || product.image || null,
        category:  product.category || '',
        qty
      });
    }
    this.save(items);
    this._dispatch('cart:updated');
  },

  remove(index) {
    const items = this.get();
    items.splice(index, 1);
    this.save(items);
    this._dispatch('cart:updated');
  },

  updateQty(index, qty) {
    const items = this.get();
    if (items[index]) {
      if (qty <= 0) {
        items.splice(index, 1);
      } else {
        items[index].qty = qty;
      }
      this.save(items);
      this._dispatch('cart:updated');
    }
  },

  clear() {
    localStorage.removeItem(this._KEY);
    this._dispatch('cart:updated');
  },

  count() {
    return this.get().reduce((sum, i) => sum + (i.qty || 1), 0);
  },

  subtotal() {
    return this.get().reduce((sum, i) => sum + (i.price * (i.qty || 1)), 0);
  },

  isEmpty() {
    return this.get().length === 0;
  },

  // Dispatch a custom event so any page component can listen
  _dispatch(eventName) {
    document.dispatchEvent(new CustomEvent(eventName, {
      detail: { count: this.count(), subtotal: this.subtotal() }
    }));
  },

  // Update cart badge in header
  updateBadge() {
    const badge = document.getElementById('cartBadge');
    if (badge) {
      const count = this.count();
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  }
};

// Auto-update badge when cart changes
document.addEventListener('cart:updated', () => Cart.updateBadge());

// Initialize badge on page load
document.addEventListener('DOMContentLoaded', () => Cart.updateBadge());

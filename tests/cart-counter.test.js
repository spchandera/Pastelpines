/**
 * @jest-environment jsdom
 */
const cartCounter = require('../assets/cart-counter.js');

describe('cart-counter', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.themeSettings = undefined;
  });

  describe('getMinOrderLimit', () => {
    it('returns 0 when no theme settings are present', () => {
      expect(cartCounter.getMinOrderLimit()).toBe(0);
    });

    it('reads the configured minimum order limit', () => {
      window.themeSettings = { minOrderLimit: 50 };
      expect(cartCounter.getMinOrderLimit()).toBe(50);
    });
  });

  describe('isCartMutation', () => {
    it('matches cart add/change/update endpoints', () => {
      expect(cartCounter.isCartMutation('https://shop/cart/add.js')).toBe(true);
      expect(cartCounter.isCartMutation('https://shop/cart/change.js')).toBe(true);
      expect(cartCounter.isCartMutation('https://shop/cart/update.js')).toBe(true);
    });

    it('ignores unrelated requests', () => {
      expect(cartCounter.isCartMutation('https://shop/products/abc.js')).toBe(false);
    });
  });

  describe('updateCartCount', () => {
    it('removes the badge when the cart is empty', () => {
      document.body.innerHTML = '<span data-js-cart-count>3</span>';
      cartCounter.updateCartCount(0);
      expect(document.querySelector('[data-js-cart-count]')).toBeNull();
    });

    it('updates an existing badge', () => {
      document.body.innerHTML = '<span data-js-cart-count>1</span>';
      cartCounter.updateCartCount(5);
      expect(document.querySelector('[data-js-cart-count]').textContent).toBe('5');
    });

    it('creates a badge on the cart icon when one does not exist', () => {
      document.body.innerHTML = '<a data-js-cart-icon></a>';
      cartCounter.updateCartCount(2);
      const badge = document.querySelector('[data-js-cart-icon] [data-js-cart-count]');
      expect(badge).not.toBeNull();
      expect(badge.textContent).toBe('2');
    });

    it('does nothing when there is no icon to attach to', () => {
      cartCounter.updateCartCount(2);
      expect(document.querySelector('[data-js-cart-count]')).toBeNull();
    });
  });

  describe('setCheckoutEnabled', () => {
    beforeEach(() => {
      document.body.innerHTML =
        '<button name="checkout">Checkout</button>' +
        '<div class="dynamic-button-wrap"></div>';
    });

    it('disables checkout controls', () => {
      cartCounter.setCheckoutEnabled(false);
      const btn = document.querySelector('button[name="checkout"]');
      expect(btn.disabled).toBe(true);
      expect(btn.classList.contains('checkout-disabled')).toBe(true);
      expect(btn.getAttribute('aria-disabled')).toBe('true');
      expect(
        document.querySelector('.dynamic-button-wrap').classList.contains('checkout-disabled')
      ).toBe(true);
    });

    it('enables checkout controls', () => {
      cartCounter.setCheckoutEnabled(true);
      const btn = document.querySelector('button[name="checkout"]');
      expect(btn.disabled).toBe(false);
      expect(btn.classList.contains('checkout-disabled')).toBe(false);
      expect(btn.hasAttribute('aria-disabled')).toBe(false);
    });
  });

  describe('applyCart', () => {
    beforeEach(() => {
      document.body.innerHTML =
        '<a data-js-cart-icon></a><button name="checkout">Checkout</button>';
    });

    it('ignores an empty cart payload', () => {
      expect(() => cartCounter.applyCart(null)).not.toThrow();
    });

    it('updates the badge and enables checkout when above the minimum', () => {
      window.themeSettings = { minOrderLimit: 10 };
      cartCounter.applyCart({ item_count: 3, total_price: 5000 });
      expect(document.querySelector('[data-js-cart-count]').textContent).toBe('3');
      expect(document.querySelector('button[name="checkout"]').disabled).toBe(false);
    });

    it('disables checkout when below the minimum', () => {
      window.themeSettings = { minOrderLimit: 100 };
      cartCounter.applyCart({ item_count: 1, total_price: 5000 });
      expect(document.querySelector('button[name="checkout"]').disabled).toBe(true);
    });
  });

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  describe('refreshCart', () => {
    it('updates the UI from the /cart.js endpoint', async () => {
      window.themeSettings = { minOrderLimit: 10 };
      document.body.innerHTML =
        '<a data-js-cart-icon></a><button name="checkout">Checkout</button>';
      window.fetch = jest.fn(() =>
        Promise.resolve({
          url: '/cart.js',
          json: () => Promise.resolve({ item_count: 4, total_price: 5000 }),
        })
      );

      await cartCounter.refreshCart();

      expect(document.querySelector('[data-js-cart-count]').textContent).toBe('4');
      expect(document.querySelector('button[name="checkout"]').disabled).toBe(false);
    });

    it('swallows network errors without throwing', async () => {
      window.fetch = jest.fn(() => Promise.reject(new Error('offline')));
      await expect(cartCounter.refreshCart()).resolves.toBeUndefined();
    });
  });

  describe('patchFetch', () => {
    it('refreshes the cart after a cart-mutating request', async () => {
      window.themeSettings = { minOrderLimit: 0 };
      document.body.innerHTML = '<a data-js-cart-icon></a>';
      const originalFetch = jest.fn((url) =>
        Promise.resolve({
          url,
          json: () => Promise.resolve({ item_count: 7, total_price: 100 }),
        })
      );
      window.fetch = originalFetch;

      cartCounter.patchFetch();
      await window.fetch('/cart/add.js');
      await flush();
      await flush();

      expect(document.querySelector('[data-js-cart-count]').textContent).toBe('7');
    });
  });

  describe('init', () => {
    it('refreshes immediately when the document is already parsed', async () => {
      window.themeSettings = { minOrderLimit: 0 };
      document.body.innerHTML = '<a data-js-cart-icon></a>';
      window.fetch = jest.fn(() =>
        Promise.resolve({
          url: '/cart.js',
          json: () => Promise.resolve({ item_count: 9, total_price: 100 }),
        })
      );

      cartCounter.init();
      await flush();

      expect(document.querySelector('[data-js-cart-count]').textContent).toBe('9');
    });
  });
});

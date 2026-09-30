/**
 * @jest-environment jsdom
 */
const customEvents = require('../assets/custom-events.js');

describe('custom-events', () => {
  beforeEach(() => {
    window.themeCustomEventHandlers = undefined;
  });

  it('forwards a mapped event to the matching handler with the picked payload', () => {
    const received = [];
    window.themeCustomEventHandlers = {
      cartItemAdded: (product) => received.push(product),
    };
    customEvents.register();

    const product = { id: 1, title: 'Candle' };
    document.dispatchEvent(new CustomEvent('cart:item-added', { detail: { product } }));

    expect(received).toEqual([product]);
  });

  it('does not throw when no handlers are defined', () => {
    customEvents.register();
    expect(() =>
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: {} } }))
    ).not.toThrow();
  });

  it('dispatch ignores non-function handlers', () => {
    window.themeCustomEventHandlers = { cartUpdated: 'not-a-function' };
    expect(() => customEvents.dispatch('cartUpdated', {})).not.toThrow();
  });

  it('exposes an event map covering the documented theme events', () => {
    const types = customEvents.EVENT_MAP.map((entry) => entry.type);
    expect(types).toContain('cart:item-added');
    expect(types).toContain('product:variant-change');
    expect(types).toContain('quickview:loaded');
  });

  it('picks the documented payload for every mapped event', () => {
    const calls = {};
    window.themeCustomEventHandlers = {};
    customEvents.EVENT_MAP.forEach((entry) => {
      window.themeCustomEventHandlers[entry.handler] = (payload) => {
        calls[entry.handler] = payload;
      };
    });
    customEvents.register();

    const detail = {
      product: { id: 1 },
      cart: { token: 'abc' },
      errorMessage: 'Out of stock',
      variant: { id: 2 },
      quantity: 3,
    };

    customEvents.EVENT_MAP.forEach((entry) => {
      document.dispatchEvent(new CustomEvent(entry.type, { detail }));
    });

    expect(calls.cartItemAdded).toEqual(detail.product);
    expect(calls.cartUpdated).toEqual(detail.cart);
    expect(calls.cartError).toBe(detail.errorMessage);
    expect(calls.variantChange).toEqual(detail.variant);
    expect(calls.quantityUpdate).toEqual(detail);
    expect(calls.quickCartOpen).toEqual(detail.cart);
    // Events with no payload still invoke their handler.
    expect('quickCartClose' in calls).toBe(true);
    expect('quickviewLoaded' in calls).toBe(true);
  });
});

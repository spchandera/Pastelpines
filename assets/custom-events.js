/**
 * Custom theme event bridge.
 *
 * The theme dispatches a number of DOM events for cart and product
 * interactions. This file forwards those events to optional merchant-defined
 * handlers so custom functionality can be added without touching the theme
 * internals. Define any subset of handlers before this script runs:
 *
 *   window.themeCustomEventHandlers = {
 *     cartItemAdded: (product) => { ... },
 *     cartUpdated:   (cart) => { ... },
 *     cartError:     (message) => { ... },
 *     quickCartOpen: (cart) => { ... },
 *     quickCartClose: () => { ... },
 *     variantChange: (variant) => { ... },
 *     quantityUpdate: (detail) => { ... },
 *     quickviewLoaded: () => { ... },
 *   };
 *
 * Enable this file by setting `useCustomEvents` to true in theme-globals.liquid.
 */
(function () {
  var EVENT_MAP = [
    { type: 'cart:item-added', handler: 'cartItemAdded', pick: function (d) { return d && d.product; } },
    { type: 'cart:updated', handler: 'cartUpdated', pick: function (d) { return d && d.cart; } },
    { type: 'cart:error', handler: 'cartError', pick: function (d) { return d && d.errorMessage; } },
    { type: 'quick-cart:open', handler: 'quickCartOpen', pick: function (d) { return d && d.cart; } },
    { type: 'quick-cart:close', handler: 'quickCartClose', pick: function () { return undefined; } },
    { type: 'product:variant-change', handler: 'variantChange', pick: function (d) { return d && d.variant; } },
    { type: 'product:quantity-update', handler: 'quantityUpdate', pick: function (d) { return d; } },
    { type: 'quickview:loaded', handler: 'quickviewLoaded', pick: function () { return undefined; } },
  ];

  function dispatch(handlerName, payload) {
    var handlers = window.themeCustomEventHandlers;
    var handler = handlers && handlers[handlerName];

    if (typeof handler === 'function') {
      handler(payload);
    }
  }

  function register() {
    EVENT_MAP.forEach(function (entry) {
      document.addEventListener(entry.type, function (evt) {
        dispatch(entry.handler, entry.pick(evt.detail || {}));
      });
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EVENT_MAP: EVENT_MAP, dispatch: dispatch, register: register };
  } else {
    register();
  }
})();

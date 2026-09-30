/**
 * Cart counter + minimum-order checkout gate.
 *
 * Keeps the header cart badge in sync with the live cart and disables the
 * checkout controls until the cart total meets the configured minimum order
 * amount. A single fetch interceptor watches for cart mutations so both
 * behaviours stay in sync without polling.
 */
(function () {
  var CART_COUNT_SELECTOR = '[data-js-cart-count]';
  var CART_ICON_SELECTOR = '[data-js-cart-icon]';
  var CHECKOUT_BTN_SELECTOR = 'button[name="checkout"]';
  var DYNAMIC_WRAP_SELECTOR = '.dynamic-button-wrap';
  var DISABLED_CLASS = 'checkout-disabled';
  var CART_MUTATION_PATHS = ['/cart/add', '/cart/change', '/cart/update'];

  var lastCartCount = null;
  var fetchPatched = false;

  function getMinOrderLimit() {
    return Number((window.themeSettings && window.themeSettings.minOrderLimit) || 0);
  }

  function updateCartCount(count) {
    var el = document.querySelector(CART_COUNT_SELECTOR);
    var icon = document.querySelector(CART_ICON_SELECTOR);

    // Remove the badge entirely when the cart is empty.
    if (count <= 0) {
      if (el) {
        el.remove();
      }
      return;
    }

    // Update the existing badge.
    if (el) {
      el.textContent = count;
      return;
    }

    // Create the badge when there is a cart icon to attach it to.
    if (!icon) {
      return;
    }

    var span = document.createElement('span');
    span.setAttribute('data-js-cart-count', '');
    span.textContent = count;
    icon.appendChild(span);
  }

  function setCheckoutEnabled(enabled) {
    document.querySelectorAll(CHECKOUT_BTN_SELECTOR).forEach(function (btn) {
      btn.classList.toggle(DISABLED_CLASS, !enabled);
      btn.disabled = !enabled;
      if (enabled) {
        btn.removeAttribute('aria-disabled');
      } else {
        btn.setAttribute('aria-disabled', 'true');
      }
    });

    document.querySelectorAll(DYNAMIC_WRAP_SELECTOR).forEach(function (wrap) {
      wrap.classList.toggle(DISABLED_CLASS, !enabled);
    });
  }

  function applyCart(cart) {
    if (!cart) {
      return;
    }

    if (cart.item_count !== lastCartCount) {
      lastCartCount = cart.item_count;
      updateCartCount(cart.item_count);
    }

    var cartTotal = cart.total_price / 100;
    setCheckoutEnabled(cartTotal >= getMinOrderLimit());
  }

  function refreshCart() {
    return fetch('/cart.js')
      .then(function (res) {
        return res.json();
      })
      .then(applyCart)
      .catch(function () {
        // Network/parse failures leave the current UI state untouched.
      });
  }

  function isCartMutation(url) {
    return CART_MUTATION_PATHS.some(function (path) {
      return url.indexOf(path) !== -1;
    });
  }

  function patchFetch() {
    if (fetchPatched || typeof window.fetch !== 'function') {
      return;
    }
    fetchPatched = true;

    var originalFetch = window.fetch;
    window.fetch = function (...args) {
      return originalFetch.apply(this, args).then(function (response) {
        if (response && response.url && isCartMutation(response.url)) {
          refreshCart();
        }
        return response;
      });
    };
  }

  function init() {
    patchFetch();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', refreshCart, { once: true });
    } else {
      refreshCart();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      getMinOrderLimit: getMinOrderLimit,
      updateCartCount: updateCartCount,
      setCheckoutEnabled: setCheckoutEnabled,
      applyCart: applyCart,
      isCartMutation: isCartMutation,
      refreshCart: refreshCart,
      patchFetch: patchFetch,
      init: init,
    };
  } else {
    init();
  }
})();

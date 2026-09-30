(function () {
  console.log('[CART COUNT] Auto-init file loaded');
  
  let lastCartCount = null;
  let fetchBound = false;

  function fetchCartAndUpdate() {
    console.log('[CART COUNT] Fetching /cart.js');

    fetch('/cart.js')
      .then(res => res.json())
      .then(cart => {
        console.log('[CART COUNT] item_count:', cart.item_count);
        console.log('CART Total', cart.total_price);

        if (cart.item_count !== lastCartCount) {
          lastCartCount = cart.item_count;
          updateCartCount(cart.item_count);
        }
      })
      .catch(err => {
        console.error('[CART COUNT] Error:', err);
      });
  }

    function updateCartCount(count) {
    const el = document.querySelector('[data-js-cart-count]');
    const icon = document.querySelector('[data-js-cart-icon]');

    // ❌ Hide / remove when cart is empty
    if (count <= 0) {
        if (el) {
        el.remove();
        console.log('[CART COUNT] Removed cart count (empty cart)');
        }
        return;
    }

    // ✅ Update existing badge
    if (el) {
        el.textContent = count;
        return;
    }

    // ✅ Create badge when count > 0
    if (!icon) {
        console.warn('[CART COUNT] Cart icon not found');
        return;
    }

    const span = document.createElement('span');
    span.setAttribute('data-js-cart-count', '');
    span.textContent = count;
    icon.appendChild(span);

    console.log('[CART COUNT] Created cart count:', count);
    }

  function bindFetchWatcher() {
    if (fetchBound) return;
    fetchBound = true;

    const originalFetch = window.fetch;
    window.fetch = function () {
      return originalFetch.apply(this, arguments).then(response => {
        if (
          response.url.includes('/cart/add') ||
          response.url.includes('/cart/change') ||
          response.url.includes('/cart/update')
        ) {
          console.log('[CART COUNT] Cart updated via:', response.url);
          fetchCartAndUpdate();
        }
        return response;
      });
    };
  }

  bindFetchWatcher();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchCartAndUpdate);
  } else {
    fetchCartAndUpdate();
  }

})();


// Custom code for check the min order amount and disable the checkout buttons.
(function () {
  console.log('[CHECKOUT LIMIT] Initializing');

  const SELECTOR_CHECKOUT_BTN = 'button[name="checkout"]';
  const SELECTOR_DYNAMIC_WRAP = '.dynamic-button-wrap';

  function getMinOrderLimit() {
    return Number(window.themeSettings?.minOrderLimit || 0);
  }

  function disableCheckoutUI() {
    // Disable standard checkout buttons
    document.querySelectorAll(SELECTOR_CHECKOUT_BTN).forEach(btn => {
      btn.classList.add('checkout-disabled');
      btn.setAttribute('aria-disabled', 'true');
      btn.disabled = true;
    });

    // Disable dynamic checkout wrappers
    document.querySelectorAll(SELECTOR_DYNAMIC_WRAP).forEach(wrap => {
      wrap.classList.add('checkout-disabled');
    });
  }

  function enableCheckoutUI() {
    // Enable standard checkout buttons
    document.querySelectorAll(SELECTOR_CHECKOUT_BTN).forEach(btn => {
      btn.classList.remove('checkout-disabled');
      btn.removeAttribute('aria-disabled');
      btn.disabled = false;
    });

    // Enable dynamic checkout wrappers
    document.querySelectorAll(SELECTOR_DYNAMIC_WRAP).forEach(wrap => {
      wrap.classList.remove('checkout-disabled');
    });
  }

  function validateCheckout(cartTotal) {
    const minLimit = getMinOrderLimit();

    console.log('[CHECKOUT LIMIT] Cart:', cartTotal, 'Min:', minLimit);

    if (cartTotal < minLimit) {
      disableCheckoutUI();
    } else {
      enableCheckoutUI();
    }
  }

  function fetchCartAndValidate() {
    fetch('/cart.js')
      .then(res => res.json())
      .then(cart => {
        validateCheckout(cart.total_price / 100);
      })
      .catch(err => {
        console.error('[CHECKOUT LIMIT] Error:', err);
      });
  }

  function bindCartWatcher() {
    const originalFetch = window.fetch;

    window.fetch = function () {
      return originalFetch.apply(this, arguments).then(response => {
        if (
          response.url.includes('/cart/add') ||
          response.url.includes('/cart/change') ||
          response.url.includes('/cart/update')
        ) {
          fetchCartAndValidate();
        }
        return response;
      });
    };
  }

  bindCartWatcher();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchCartAndValidate);
  } else {
    fetchCartAndValidate();
  }

})();
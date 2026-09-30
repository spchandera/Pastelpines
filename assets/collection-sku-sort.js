const COLLECTION_SELECTOR = '[data-section-type="collection"][data-layout-type="grid"]';
const PRODUCTS_SELECTOR = '.collection__products';
const PRODUCT_ITEM_SELECTOR = '.product-item';
const ACTIVE_SORT_VALUE = 'title-ascending';

let mutationObserver = null;
let sortScheduled = false;

function getCollectionSection() {
  return document.querySelector(COLLECTION_SELECTOR);
}

function getActiveSortValue(section) {
  const checkedSort = section.querySelector('input[name="sort_by"]:checked');

  if (checkedSort && checkedSort.value) {
    return checkedSort.value;
  }

  return new URLSearchParams(window.location.search).get('sort_by') || '';
}

function sortProductsBySku(section) {
  if (!section || getActiveSortValue(section) !== ACTIVE_SORT_VALUE) {
    return;
  }

  const productsContainer = section.querySelector(PRODUCTS_SELECTOR);

  if (!productsContainer) {
    return;
  }

  const productItems = Array.from(productsContainer.querySelectorAll(PRODUCT_ITEM_SELECTOR));

  if (productItems.length < 2) {
    return;
  }

  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  });

  const sortedItems = productItems
    .map((item, index) => ({
      index,
      item,
      sku: (item.dataset.sortSku || '').trim(),
    }))
    .sort((a, b) => {
      const aHasSku = a.sku !== '';
      const bHasSku = b.sku !== '';

      if (aHasSku !== bHasSku) {
        return aHasSku ? -1 : 1;
      }

      if (aHasSku && bHasSku) {
        const comparison = collator.compare(a.sku, b.sku);

        if (comparison !== 0) {
          return comparison;
        }
      }

      return a.index - b.index;
    });

  const nextOrder = sortedItems.map(({ item }) => item);
  const alreadySorted = productItems.every((item, index) => item === nextOrder[index]);

  if (alreadySorted) {
    return;
  }

  const fragment = document.createDocumentFragment();

  sortedItems.forEach(({ item }) => {
    fragment.appendChild(item);
  });

  productsContainer.appendChild(fragment);
}

function scheduleSort() {
  if (sortScheduled) {
    return;
  }

  sortScheduled = true;

  window.requestAnimationFrame(() => {
    sortScheduled = false;
    sortProductsBySku(getCollectionSection());
  });
}

function observeCollection(section) {
  if (mutationObserver) {
    mutationObserver.disconnect();
  }

  mutationObserver = new MutationObserver(() => {
    scheduleSort();
  });

  mutationObserver.observe(section, {
    childList: true,
    subtree: true,
  });
}

function initCollectionSkuSort() {
  const section = getCollectionSection();

  if (!section) {
    return;
  }

  sortProductsBySku(section);
  observeCollection(section);

  window.addEventListener('collection:updated', scheduleSort);
  document.addEventListener('collection:updated', scheduleSort);
  window.addEventListener('popstate', scheduleSort);

  section.querySelectorAll('input[name="sort_by"]').forEach((input) => {
    input.addEventListener('change', scheduleSort);
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getActiveSortValue,
    sortProductsBySku,
    initCollectionSkuSort,
    scheduleSort,
    observeCollection,
    getCollectionSection,
    ACTIVE_SORT_VALUE,
  };
} else if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCollectionSkuSort, { once: true });
} else {
  initCollectionSkuSort();
}

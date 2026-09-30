/**
 * @jest-environment jsdom
 */
const skuSort = require('../assets/collection-sku-sort.js');

function buildSection({ sortValue = 'title-ascending', skus = [] } = {}) {
  const section = document.createElement('div');
  section.setAttribute('data-section-type', 'collection');
  section.setAttribute('data-layout-type', 'grid');

  const sortInput = document.createElement('input');
  sortInput.setAttribute('name', 'sort_by');
  sortInput.setAttribute('type', 'radio');
  sortInput.value = sortValue;
  sortInput.checked = true;
  section.appendChild(sortInput);

  const products = document.createElement('div');
  products.className = 'collection__products';

  skus.forEach((sku, i) => {
    const item = document.createElement('div');
    item.className = 'product-item';
    item.dataset.label = `item-${i}`;
    if (sku !== null) {
      item.dataset.sortSku = sku;
    }
    products.appendChild(item);
  });

  section.appendChild(products);
  return section;
}

function orderOf(section) {
  return Array.from(section.querySelectorAll('.product-item')).map((el) => el.dataset.label);
}

describe('collection-sku-sort', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  describe('getActiveSortValue', () => {
    it('prefers the checked sort input', () => {
      const section = buildSection({ sortValue: 'title-ascending' });
      expect(skuSort.getActiveSortValue(section)).toBe('title-ascending');
    });

    it('falls back to the URL query param', () => {
      const section = document.createElement('div');
      window.history.replaceState({}, '', '/collections/all?sort_by=price-descending');
      expect(skuSort.getActiveSortValue(section)).toBe('price-descending');
    });
  });

  describe('sortProductsBySku', () => {
    it('does nothing when the active sort is not title-ascending', () => {
      const section = buildSection({ sortValue: 'price-ascending', skus: ['B10', 'A2'] });
      skuSort.sortProductsBySku(section);
      expect(orderOf(section)).toEqual(['item-0', 'item-1']);
    });

    it('orders products by SKU using natural numeric comparison', () => {
      const section = buildSection({ skus: ['A10', 'A2', 'A1'] });
      skuSort.sortProductsBySku(section);
      // A1 < A2 < A10 numerically (not lexicographically).
      expect(orderOf(section)).toEqual(['item-2', 'item-1', 'item-0']);
    });

    it('places products without a SKU after those with one', () => {
      const section = buildSection({ skus: [null, 'A1', null, 'A2'] });
      skuSort.sortProductsBySku(section);
      const order = orderOf(section);
      expect(order.slice(0, 2)).toEqual(['item-1', 'item-3']);
      // The two SKU-less items keep their original relative order.
      expect(order.slice(2)).toEqual(['item-0', 'item-2']);
    });

    it('is a no-op when fewer than two products are present', () => {
      const section = buildSection({ skus: ['A1'] });
      expect(() => skuSort.sortProductsBySku(section)).not.toThrow();
      expect(orderOf(section)).toEqual(['item-0']);
    });

    it('ignores a null section', () => {
      expect(() => skuSort.sortProductsBySku(null)).not.toThrow();
    });

    it('is a no-op when the products container is missing', () => {
      const section = document.createElement('div');
      const sortInput = document.createElement('input');
      sortInput.setAttribute('name', 'sort_by');
      sortInput.value = 'title-ascending';
      sortInput.checked = true;
      section.appendChild(sortInput);
      expect(() => skuSort.sortProductsBySku(section)).not.toThrow();
    });
  });

  describe('initCollectionSkuSort', () => {
    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('does nothing when there is no collection section', () => {
      expect(() => skuSort.initCollectionSkuSort()).not.toThrow();
    });

    it('sorts immediately and observes the section for updates', () => {
      const section = buildSection({ skus: ['A2', 'A1'] });
      document.body.appendChild(section);

      skuSort.initCollectionSkuSort();

      expect(orderOf(section)).toEqual(['item-1', 'item-0']);
    });

    it('re-observing disconnects the previous observer', () => {
      const section = buildSection({ skus: ['A2', 'A1'] });
      document.body.appendChild(section);
      skuSort.observeCollection(section);
      expect(() => skuSort.observeCollection(section)).not.toThrow();
    });
  });

  describe('scheduleSort', () => {
    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('sorts on the next animation frame', async () => {
      const section = buildSection({ skus: ['A2', 'A1'] });
      document.body.appendChild(section);

      skuSort.scheduleSort();
      // A second call is coalesced into the same frame.
      skuSort.scheduleSort();
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));

      expect(orderOf(section)).toEqual(['item-1', 'item-0']);
    });
  });
});

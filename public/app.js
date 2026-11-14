import { request } from './api.js';

const categories = ['Home', 'Electronics', 'Accessories', 'Stationery'];
const elements = {
  body: document.querySelector('#products-body'),
  category: document.querySelector('#category-filter'),
  count: document.querySelector('#result-count'),
  dialog: document.querySelector('#product-dialog'),
  form: document.querySelector('#product-form'),
  formError: document.querySelector('#form-error'),
  lastUpdated: document.querySelector('#last-updated'),
  search: document.querySelector('#search-input'),
  sort: document.querySelector('#sort-select'),
  state: document.querySelector('#table-state'),
  toastRegion: document.querySelector('#toast-region'),
};

let products = [];
let searchTimer;
let listController;
let toastTimer;
let loading = false;

function formatPrice(price) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function showToast(message, type = 'success') {
  clearTimeout(toastTimer);
  elements.toastRegion.replaceChildren();
  const toast = makeElement('div', `toast toast-${type}`);
  const icon = makeElement('span', 'toast-icon', type === 'success' ? '✓' : '!');
  icon.setAttribute('aria-hidden', 'true');
  toast.append(icon, makeElement('span', '', message));
  elements.toastRegion.append(toast);
  toastTimer = setTimeout(() => {
    toast.classList.add('toast-leaving');
    setTimeout(() => toast.remove(), 220);
  }, 3600);
}

function setTableState(message, type = '') {
  elements.body.replaceChildren();
  elements.state.hidden = false;
  elements.state.className = `table-state${type ? ` table-state-${type}` : ''}`;
  elements.state.textContent = message;
}

function stockControl(product) {
  const group = makeElement('div', 'stock-control');
  const decrement = makeElement('button', 'stock-button', '−');
  decrement.type = 'button';
  decrement.disabled = product.stock <= 0 || loading;
  decrement.setAttribute('aria-label', `Decrease ${product.name} stock`);
  decrement.addEventListener('click', () => changeStock(product, -1, decrement, increment));

  const value = makeElement('span', 'stock-value', String(product.stock));
  value.setAttribute('aria-label', `${product.stock} in stock`);
  const increment = makeElement('button', 'stock-button', '+');
  increment.type = 'button';
  increment.disabled = loading;
  increment.setAttribute('aria-label', `Increase ${product.name} stock`);
  increment.addEventListener('click', () => changeStock(product, 1, decrement, increment));

  group.append(decrement, value, increment);
  return group;
}

function renderProducts() {
  elements.count.textContent = `${products.length} ${products.length === 1 ? 'item' : 'items'}`;
  elements.state.hidden = true;
  elements.body.replaceChildren();

  if (loading) {
    setTableState('Loading your products…', 'loading');
    return;
  }

  if (products.length === 0) {
    setTableState('No products found. Try adjusting your search or filters.', 'empty');
    return;
  }

  const rows = products.map((product) => {
    const row = document.createElement('tr');
    const productCell = document.createElement('td');
    const identity = makeElement('div', 'product-identity');
    const avatar = makeElement('span', 'product-avatar', product.name.trim().charAt(0).toUpperCase() || '?');
    avatar.setAttribute('aria-hidden', 'true');
    const text = makeElement('span', 'product-name', product.name);
    identity.append(avatar, text);
    productCell.append(identity);

    const sku = makeElement('td', 'sku-cell', product.sku);
    const categoryCell = document.createElement('td');
    categoryCell.append(makeElement('span', `category-pill category-${product.category.toLowerCase()}`, product.category));
    const price = makeElement('td', 'price-cell', formatPrice(product.price));
    const stock = document.createElement('td');
    stock.append(stockControl(product));
    const action = document.createElement('td');
    action.className = 'action-cell';
    const remove = makeElement('button', 'icon-button delete-button', '×');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Delete ${product.name}`);
    remove.title = 'Delete product';
    remove.addEventListener('click', () => removeProduct(product, remove));
    action.append(remove);
    row.append(productCell, sku, categoryCell, price, stock, action);
    return row;
  });
  elements.body.append(...rows);
}

async function loadProducts() {
  listController?.abort();
  const controller = new AbortController();
  listController = controller;

  const params = new URLSearchParams();
  const query = elements.search.value.trim();
  if (query) params.set('q', query);
  if (elements.category.value) params.set('category', elements.category.value);
  if (elements.sort.value) params.set('sort', elements.sort.value);
  const queryString = params.toString();
  const url = `/api/products${queryString ? `?${queryString}` : ''}`;

  loading = true;
  renderProducts();
  try {
    const result = await request(url, { signal: controller.signal });
    if (controller.signal.aborted) return;
    products = result.data;
    loading = false;
    renderProducts();
    elements.lastUpdated.textContent = `Updated ${new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date())}`;
  } catch (error) {
    if (error.name === 'AbortError') return;
    loading = false;
    products = [];
    renderProducts();
    setTableState('We couldn’t load your products. Please try again.', 'error');
    showToast(error.message || 'Unable to load products.', 'error');
  }
}

async function changeStock(product, difference, decrement, increment) {
  const nextStock = product.stock + difference;
  if (nextStock < 0) return;
  decrement.disabled = true;
  increment.disabled = true;

  try {
    const result = await request(`/api/products/${encodeURIComponent(product.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: nextStock }),
    });
    products = products.map((item) => item.id === product.id ? result.data : item);
    renderProducts();
    showToast(`${product.name} stock updated.`);
  } catch (error) {
    decrement.disabled = false;
    increment.disabled = false;
    showToast(error.message || 'Could not update stock.', 'error');
  }
}

async function removeProduct(product, button) {
  if (!window.confirm(`Delete “${product.name}”? This cannot be undone.`)) return;
  button.disabled = true;
  try {
    await request(`/api/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' });
    products = products.filter((item) => item.id !== product.id);
    renderProducts();
    showToast(`${product.name} deleted.`);
  } catch (error) {
    button.disabled = false;
    showToast(error.message || 'Could not delete product.', 'error');
  }
}

function clearFormErrors() {
  for (const errorElement of elements.form.querySelectorAll('[data-error-for]')) {
    errorElement.textContent = '';
  }
  for (const input of elements.form.querySelectorAll('[name]')) {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }
  elements.formError.hidden = true;
  elements.formError.textContent = '';
}

function displayFormErrors(error) {
  clearFormErrors();
  if (error.fields) {
    for (const [field, message] of Object.entries(error.fields)) {
      const errorElement = elements.form.querySelector(`[data-error-for="${CSS.escape(field)}"]`);
      const input = elements.form.elements.namedItem(field);
      if (errorElement) errorElement.textContent = message;
      if (input instanceof HTMLElement) {
        input.setAttribute('aria-invalid', 'true');
        if (errorElement) input.setAttribute('aria-describedby', errorElement.id || `error-${field}`);
      }
    }
  }
  elements.formError.textContent = error.message || 'Please check the product details and try again.';
  elements.formError.hidden = false;
}

function setSubmitting(isSubmitting) {
  const submitButton = document.querySelector('#submit-product');
  submitButton.disabled = isSubmitting;
  submitButton.querySelector('.button-label').textContent = isSubmitting ? 'Saving…' : 'Save product';
  submitButton.querySelector('.button-spinner').hidden = !isSubmitting;
}

elements.search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadProducts, 300);
});
elements.category.addEventListener('change', loadProducts);
elements.sort.addEventListener('change', loadProducts);

document.querySelector('#open-product-dialog').addEventListener('click', () => {
  clearFormErrors();
  elements.form.reset();
  elements.dialog.showModal();
  document.querySelector('#product-name').focus();
});
document.querySelector('#close-product-dialog').addEventListener('click', () => elements.dialog.close());
document.querySelector('#cancel-product').addEventListener('click', () => elements.dialog.close());
elements.dialog.addEventListener('click', (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});
elements.form.addEventListener('input', (event) => {
  const field = event.target.name;
  const errorElement = elements.form.querySelector(`[data-error-for="${CSS.escape(field)}"]`);
  if (errorElement?.textContent) {
    errorElement.textContent = '';
    event.target.removeAttribute('aria-invalid');
    event.target.removeAttribute('aria-describedby');
  }
  if (!elements.form.querySelector('[data-error-for]:not(:empty)')) {
    elements.formError.hidden = true;
  }
});

elements.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearFormErrors();
  const formData = new FormData(elements.form);
  const priceValue = formData.get('price');
  const stockValue = formData.get('stock');
  const product = {
    name: String(formData.get('name') ?? '').trim(),
    sku: String(formData.get('sku') ?? '').trim(),
    category: formData.get('category'),
    price: priceValue === '' ? null : Number(priceValue),
    stock: stockValue === '' ? null : Number(stockValue),
  };
  if (!categories.includes(product.category)) {
    displayFormErrors({ message: 'Please choose a valid category.', fields: { category: 'Select a category.' } });
    return;
  }

  setSubmitting(true);
  try {
    await request('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    elements.dialog.close();
    elements.form.reset();
    showToast(`${product.name} added to your inventory.`);
    await loadProducts();
  } catch (error) {
    displayFormErrors(error);
    showToast(error.message || 'Could not save product.', 'error');
  } finally {
    setSubmitting(false);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !elements.dialog.open && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    elements.search.focus();
  }
});

loadProducts();

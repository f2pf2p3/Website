const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000' : 'https://website-backend-70pc.onrender.com';

const state = { products: [], cart: [], categories: [] };
const money = (value) => `$${Number(value).toFixed(2)}`;
const token = () => localStorage.getItem('token');
const headers = () => token() ? { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };

function showToast(text) {
    const toast = document.getElementById('toast');
    toast.textContent = text;
    toast.classList.add('visible');
    window.setTimeout(() => toast.classList.remove('visible'), 2600);
}

function renderProducts(products = state.products) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = products.length ? products.map((product, index) => `
        <article class="product-card" style="--product-color: ${product.color}; animation-delay: ${index * 55}ms">
            <div class="product-image"><span>${product.category}</span><strong>${String(index + 1).padStart(2, '0')}</strong><div class="product-shape"></div></div>
            <div class="product-meta"><div><p class="product-category">${product.badge}</p><h3>${product.name}</h3></div><strong>${money(product.price)}</strong></div>
            <p class="product-description">${product.description}</p>
            <button class="add-button" data-product-id="${product.id}" type="button">Add to bag <span>+</span></button>
        </article>`).join('') : '<p class="empty-state">No pieces in this edit yet.</p>';
    grid.querySelectorAll('.add-button').forEach((button) => button.addEventListener('click', () => addToCart(button.dataset.productId)));
}

function renderCategories() {
    document.getElementById('categoryFilters').innerHTML = state.categories.map((category, index) => `<button class="category-button${index === 0 ? ' active' : ''}" data-category="${category}" type="button">${category}</button>`).join('');
    document.querySelectorAll('.category-button').forEach((button) => button.addEventListener('click', () => {
        document.querySelectorAll('.category-button').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        renderProducts(button.dataset.category === 'All' ? state.products : state.products.filter((product) => product.category === button.dataset.category));
    }));
}

function renderCart() {
    const items = document.getElementById('cartItems');
    const total = state.cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    document.getElementById('cartCount').textContent = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartTotal').textContent = money(total);
    items.innerHTML = state.cart.length ? state.cart.map((item) => `<div class="cart-item"><div class="cart-thumb" style="--product-color: ${item.product.color}"></div><div><h3>${item.product.name}</h3><p>${item.quantity} × ${money(item.product.price)}</p></div><button class="remove-item" data-product-id="${item.product.id}" type="button" aria-label="Remove ${item.product.name}">×</button></div>`).join('') : '<p class="empty-state">Your bag is waiting for something good.</p>';
    items.querySelectorAll('.remove-item').forEach((button) => button.addEventListener('click', () => removeFromCart(button.dataset.productId)));
}

async function syncCart() {
    if (token()) {
        const response = await fetch(`${API_URL}/api/cart`, { headers: headers() });
        if (response.ok) state.cart = (await response.json()).items;
    } else {
        state.cart = JSON.parse(localStorage.getItem('guestCart') || '[]').map((item) => ({ ...item, product: state.products.find((product) => product.id === item.productId) })).filter((item) => item.product);
    }
    renderCart();
}

async function addToCart(productId) {
    if (token()) {
        const response = await fetch(`${API_URL}/api/cart/items`, { method: 'POST', headers: headers(), body: JSON.stringify({ productId }) });
        if (!response.ok) return showToast('Could not add that piece right now.');
        state.cart = (await response.json()).items;
    } else {
        const existing = state.cart.find((item) => item.productId === productId);
        if (existing) existing.quantity += 1;
        else state.cart.push({ productId, quantity: 1, product: state.products.find((product) => product.id === productId) });
        localStorage.setItem('guestCart', JSON.stringify(state.cart.map(({ product, ...item }) => item)));
    }
    renderCart();
    showToast('Added to your bag.');
    openCart();
}

async function removeFromCart(productId) {
    if (token()) {
        const response = await fetch(`${API_URL}/api/cart/items/${productId}`, { method: 'DELETE', headers: headers() });
        if (response.ok) state.cart = (await response.json()).items;
    } else {
        state.cart = state.cart.filter((item) => item.productId !== productId);
        localStorage.setItem('guestCart', JSON.stringify(state.cart.map(({ product, ...item }) => item)));
    }
    renderCart();
}

function openCart() { document.getElementById('cartDrawer').classList.add('open'); document.getElementById('drawerBackdrop').classList.add('visible'); document.getElementById('cartDrawer').setAttribute('aria-hidden', 'false'); }
function closeCart() { document.getElementById('cartDrawer').classList.remove('open'); document.getElementById('drawerBackdrop').classList.remove('visible'); document.getElementById('cartDrawer').setAttribute('aria-hidden', 'true'); }

async function checkout() {
    if (!state.cart.length) return showToast('Your bag is empty.');
    if (!token()) { window.location.href = 'login.html'; return; }
    const response = await fetch(`${API_URL}/api/orders`, { method: 'POST', headers: headers(), body: JSON.stringify({ shipping: 'Studio pickup' }) });
    const data = await response.json();
    if (!response.ok) return showToast(data.message || 'Checkout failed.');
    state.cart = [];
    renderCart();
    showToast(`Order ${data.order.id} confirmed.`);
}

document.addEventListener('DOMContentLoaded', async () => {
    const response = await fetch(`${API_URL}/api/products`);
    const data = await response.json();
    state.products = data.products || [];
    state.categories = data.categories || ['All'];
    renderCategories();
    renderProducts();
    await syncCart();
    document.getElementById('cartToggle').addEventListener('click', openCart);
    document.getElementById('cartClose').addEventListener('click', closeCart);
    document.getElementById('drawerBackdrop').addEventListener('click', closeCart);
    document.getElementById('checkoutButton').addEventListener('click', checkout);
    if (token()) document.getElementById('accountLink').textContent = 'Your account';
});
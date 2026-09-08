const API_URL = '';
const userTable = document.getElementById('userTable');
const totalUsers = document.getElementById('totalUsers');
const refreshBtn = document.getElementById('refreshBtn');
const logoutBtn = document.getElementById('logoutBtn');
const productTable = document.getElementById('productTable');
const productForm = document.getElementById('productForm');
const totalProducts = document.getElementById('totalProducts');

function getToken() {
    const query = new URLSearchParams(window.location.search);
    const queryToken = query.get('token');

    if (queryToken) {
        localStorage.setItem('token', queryToken);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    return localStorage.getItem('token');
}

function logout(message) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    if (message) alert(message);
    window.location.href = 'login.html';
}

async function request(path, options = {}) {
    const token = getToken();
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`
        }
    });

    if (response.status === 401 || response.status === 403) {
        logout('Your admin session has expired.');
        throw new Error('Unauthorized');
    }

    return response;
}

async function loadUsers() {
    try {
        const response = await request('/api/users');
        if (!response.ok) throw new Error('Could not load users');

        const users = await response.json();
        totalUsers.textContent = users.length;
        userTable.replaceChildren();

        users.forEach((user) => {
            const row = document.createElement('tr');
            [user.id, user.username, user.email, user.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : 'N/A'].forEach((value) => {
                const cell = document.createElement('td');
                cell.textContent = value;
                row.appendChild(cell);
            });

            const statusCell = document.createElement('td');
            statusCell.textContent = user.role === 'admin' ? 'Admin' : 'Active';
            row.appendChild(statusCell);

            const actionCell = document.createElement('td');
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.textContent = 'Delete';
            deleteButton.disabled = user.id === 0;
            deleteButton.addEventListener('click', () => deleteUser(user.id));
            actionCell.appendChild(deleteButton);
            row.appendChild(actionCell);
            userTable.appendChild(row);
        });
    } catch (error) {
        if (error.message !== 'Unauthorized') {
            console.error('Loading users failed:', error);
        }
    }
}

async function loadProducts() {
    const response = await request('/api/products?includeUnavailable=true');
    if (!response.ok) throw new Error('Could not load products');
    const data = await response.json();
    totalProducts.textContent = data.products.length;
    productTable.replaceChildren();
    data.products.forEach((product) => {
        const card = document.createElement('article');
        card.className = 'admin-product-card';
        card.innerHTML = `
            <div class="admin-product-color" style="background:${product.color}"></div>
            <div class="admin-product-copy"><span>${product.category}</span><h3>${product.name}</h3><p>${product.badge} · $${Number(product.price).toFixed(2)}</p></div>
            <select aria-label="Stock mode for ${product.name}"><option value="restock">Restock</option><option value="out-of-stock">Out of stock</option></select>
            <button class="delete-btn" type="button">Delete</button>`;
        const modeSelect = card.querySelector('select');
        modeSelect.value = product.mode;
        modeSelect.addEventListener('change', () => updateProduct(product.id, { mode: modeSelect.value }));
        card.querySelector('.delete-btn').addEventListener('click', () => deleteProduct(product.id, product.name));
        productTable.appendChild(card);
    });
}

async function updateProduct(productId, body) {
    const response = await request(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!response.ok) alert((await response.json()).message || 'Could not update listing');
}

async function deleteProduct(productId, name) {
    if (!window.confirm(`Delete ${name}?`)) return;
    const response = await request(`/api/admin/products/${productId}`, { method: 'DELETE' });
    if (!response.ok) return alert((await response.json()).message || 'Could not delete listing');
    await loadProducts();
}

async function deleteUser(userId) {
    if (!window.confirm('Delete this user?')) return;

    try {
        const response = await request(`/api/users/${userId}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Delete failed');
        await loadUsers();
    } catch (error) {
        if (error.message !== 'Unauthorized') alert(error.message);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const token = getToken();
    if (!token) {
        logout('Please log in first.');
        return;
    }

    try {
        const response = await request('/api/me');
        const data = await response.json();
        if (data.user?.role !== 'admin') {
            logout('Administrator access is required.');
            return;
        }
        document.getElementById('adminName').textContent = data.user.username;
        await loadUsers();
        await loadProducts();
    } catch (error) {
        if (error.message !== 'Unauthorized') logout('Could not verify your session.');
        return;
    }

    refreshBtn.addEventListener('click', loadUsers);
    document.getElementById('refreshProductsBtn').addEventListener('click', loadProducts);
    productForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(productForm);
        const response = await request('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.fromEntries(formData.entries()))
        });
        if (!response.ok) return alert((await response.json()).message || 'Could not add listing');
        productForm.reset();
        await loadProducts();
    });
    logoutBtn.addEventListener('click', () => logout());
});

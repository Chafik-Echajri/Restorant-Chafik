
// App State
const state = {
    menu: [],
    cart: [],
    categories: ['all'],
    currentCategory: 'all',
    searchQuery: ''
};

// Config
const CONFIG = {
    CURRENCY: 'MAD',
    WHATSAPP_NUMBER: '212618361660',
    RESTAURANT_NAME: 'Restaurant Chafik'
};

// DOM Elements
const elements = {
    menuSection: document.getElementById('menu-section'),
    categoryList: document.getElementById('category-list'),
    cartBtn: document.getElementById('cart-btn'),
    cartOverlay: document.getElementById('cart-overlay'),
    cartDrawer: document.getElementById('cart-drawer'),
    closeCartBtn: document.getElementById('close-cart'),
    cartItemsContainer: document.getElementById('cart-items'),
    cartCount: document.getElementById('cart-count'),
    cartSubtotal: document.getElementById('cart-subtotal'),
    cartTotal: document.getElementById('cart-total'),
    checkoutForm: document.getElementById('checkout-form'),
    sendOrderBtn: document.getElementById('send-order-btn'),
    checkoutBtn: document.getElementById('checkout-btn'), // New button in drawer
    checkoutModal: document.getElementById('checkout-modal'), // Modal
    closeModalBtn: document.getElementById('close-modal'), // Close modal
    searchInput: document.getElementById('search-input'),
    customerAddress: document.getElementById('customer-address'),
    addressGroup: document.getElementById('address-group'),
    orderTypeInputs: document.querySelectorAll('input[name="orderType"]')
};

// --- Initialization ---
async function init() {
    loadCart();
    await fetchMenu();
    setupEventListeners();
    renderCategories();
    renderMenu();
    updateCartUI();
}

// --- Data Fetching ---
async function fetchMenu() {
    try {
        // Use global variable from menu-data.js if available
        if (typeof MENU_DATA !== 'undefined') {
            state.menu = MENU_DATA;
        } else {
            // Fallback for server environments if valid
            const response = await fetch('menu.json');
            state.menu = await response.json();
        }

        // Extract unique categories
        const cats = new Set(state.menu.map(item => item.category));
        state.categories = ['all', ...cats];

    } catch (error) {
        console.error('Error loading menu:', error);
        elements.menuSection.innerHTML = '<p class="error">Failed to load menu. Ensure menu-data.js is loaded.</p>';
    }
}

// --- Rendering ---
function renderCategories() {
    elements.categoryList.innerHTML = state.categories.map(cat => `
        <li>
            <button class="cat-btn ${cat === state.currentCategory ? 'active' : ''}" 
                    data-category="${cat}">
                ${cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
        </li>
    `).join('');
}

function renderMenu() {
    const { menu, currentCategory, searchQuery } = state;

    let filtered = menu;

    // Filter by Category
    if (currentCategory !== 'all') {
        filtered = filtered.filter(item => item.category === currentCategory);
    }

    // Filter by Search
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(item =>
            item.name.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query)
        );
    }

    // Render
    elements.menuSection.innerHTML = filtered.map(item => {
        const cartItem = state.cart.find(c => c.id === item.id);
        const qty = cartItem ? cartItem.qty : 0;

        return `
        <article class="meal-card">
            <div class="meal-image" style="background-image: url('${item.image || 'assets/placeholder.jpg'}'); background-size: cover; background-position: center;">
                <!-- Fallback if no image -->
            </div>
            <div class="meal-info">
                <div class="meal-header">
                    <h3 class="meal-title">${item.name}</h3>
                    <span class="meal-price">${item.price.toFixed(2)} ${CONFIG.CURRENCY}</span>
                </div>
                <p class="meal-desc">${item.description}</p>
                <div class="meal-footer">
                    ${!item.available
                ? `<button class="add-btn" disabled style="opacity: 0.5;">Unavailable</button>`
                : qty === 0
                    ? `<button class="add-btn" onclick="addToCart('${item.id}')">Add to Order</button>`
                    : `<div class="card-qty-control">
                                 <button class="qty-btn-card" onclick="updateCartQty('${item.id}', -1)">-</button>
                                 <span class="qty-val-card">${qty}</span>
                                 <button class="qty-btn-card" onclick="updateCartQty('${item.id}', 1)">+</button>
                               </div>`
            }
                </div>
            </div>
        </article>
    `}).join('');

    if (filtered.length === 0) {
        elements.menuSection.innerHTML = '<p class="no-results">No items found.</p>';
    }
}

// --- Cart Logic ---
function addToCart(itemId) {
    const item = state.menu.find(i => i.id === itemId);
    if (!item) return;

    const existingItem = state.cart.find(i => i.id === itemId);

    if (existingItem) {
        existingItem.qty++;
    } else {
        state.cart.push({ ...item, qty: 1 });
    }

    saveCart();
    updateCartUI();
    // openCart(); // Removed auto-open to allow continuous shopping
}

function updateCartQty(itemId, change) {
    const itemIndex = state.cart.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;

    const item = state.cart[itemIndex];
    item.qty += change;

    if (item.qty <= 0) {
        state.cart.splice(itemIndex, 1);
    }

    saveCart();
    updateCartUI();
}

function renderCartItems() {
    if (state.cart.length === 0) {
        elements.cartItemsContainer.innerHTML = '<div class="empty-cart-msg">Your cart is empty</div>';
        if (elements.checkoutBtn) elements.checkoutBtn.disabled = true;
        return;
    }

    if (elements.checkoutBtn) elements.checkoutBtn.disabled = false;
    elements.cartItemsContainer.innerHTML = state.cart.map(item => `
        <div class="cart-item">
            <div class="item-details">
                <h4>${item.name}</h4>
                <div class="item-price">${item.price.toFixed(2)} ${CONFIG.CURRENCY}</div>
            </div>
            <div class="item-controls">
                <div class="qty-control">
                    <button class="qty-btn" onclick="updateCartQty('${item.id}', -1)">-</button>
                    <span class="qty-val">${item.qty}</span>
                    <button class="qty-btn" onclick="updateCartQty('${item.id}', 1)">+</button>
                </div>
                <div class="item-subtotal">
                    ${(item.price * item.qty).toFixed(2)} ${CONFIG.CURRENCY}
                </div>
            </div>
        </div>
    `).join('');
}

function updateCartUI() {
    // Calc totals
    const total = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const count = state.cart.reduce((sum, item) => sum + item.qty, 0);

    // Update DOM
    elements.cartCount.innerText = count;
    elements.cartSubtotal.innerText = `${total.toFixed(2)} ${CONFIG.CURRENCY}`;
    elements.cartTotal.innerText = `${total.toFixed(2)} ${CONFIG.CURRENCY}`;

    renderCartItems();
    renderMenu(); // Re-render menu to update card quantity controls
}

function saveCart() {
    localStorage.setItem('restaurant_cart', JSON.stringify(state.cart));
}

function loadCart() {
    const saved = localStorage.getItem('restaurant_cart');
    if (saved) {
        try {
            state.cart = JSON.parse(saved);
        } catch (e) {
            console.error('Error parsing cart', e);
            state.cart = [];
        }
    }
}

// --- Modal Logic ---
function openModal() {
    elements.checkoutModal.classList.remove('hidden');
}

function closeModal() {
    elements.checkoutModal.classList.add('hidden');
}

// --- WhatsApp Checkout ---
function handleCheckout(e) {
    e.preventDefault();

    if (state.cart.length === 0) return;

    // Get Form Data
    const formData = new FormData(elements.checkoutForm);
    const orderType = formData.get('orderType');
    const name = elements.checkoutForm.querySelector('#customer-name').value.trim();
    const phone = elements.checkoutForm.querySelector('#customer-phone').value.trim();
    const address = elements.customerAddress.value.trim();
    const notes = elements.checkoutForm.querySelector('#order-notes').value.trim();

    // Validation (Basic)
    if (!phone) {
        alert('Please enter your phone number.');
        return;
    }
    if (orderType === 'Delivery' && !address) {
        alert('Please enter your delivery address.');
        return;
    }

    // Build Message
    let message = `*New Order @ ${CONFIG.RESTAURANT_NAME}*\n`;
    message += `--------------------------------\n`;

    state.cart.forEach(item => {
        message += `${item.qty}x ${item.name} (${(item.price * item.qty).toFixed(2)})\n`;
    });

    const total = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    message += `--------------------------------\n`;
    message += `*Total: ${total.toFixed(2)} ${CONFIG.CURRENCY}*\n\n`;

    message += `*Customer Details:*\n`;
    if (name) message += `Name: ${name}\n`;
    message += `Phone: ${phone}\n`;
    message += `Type: ${orderType}\n`;
    if (orderType === 'Delivery') message += `Address: ${address}\n`;
    if (notes) message += `Notes: ${notes}\n`;

    // Encode
    const encodedMsg = encodeURIComponent(message);
    const waLink = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodedMsg}`;

    // Close Modal
    closeModal();

    // Open WhatsApp
    window.open(waLink, '_blank');
}

// --- UI Helpers ---
function openCart() {
    elements.cartDrawer.classList.remove('closed');
    elements.cartOverlay.classList.remove('hidden');
}

function closeCart() {
    elements.cartDrawer.classList.add('closed');
    elements.cartOverlay.classList.add('hidden');
}

function setupEventListeners() {
    // Categories
    elements.categoryList.addEventListener('click', (e) => {
        if (e.target.classList.contains('cat-btn')) {
            state.currentCategory = e.target.dataset.category;
            renderCategories(); // Re-render to update active state
            renderMenu();
        }
    });

    // Search
    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim();
        renderMenu();
    });

    // Cart Toggle
    elements.cartBtn.addEventListener('click', openCart);
    elements.closeCartBtn.addEventListener('click', closeCart);
    elements.cartOverlay.addEventListener('click', closeCart);

    // Modal
    if (elements.checkoutBtn) elements.checkoutBtn.addEventListener('click', openModal);
    if (elements.closeModalBtn) elements.closeModalBtn.addEventListener('click', closeModal);
    elements.checkoutModal.addEventListener('click', (e) => {
        if (e.target === elements.checkoutModal) closeModal();
    });

    // Global Window functions for inline onclicks
    window.addToCart = addToCart;
    window.updateCartQty = updateCartQty;

    // Checkout
    elements.checkoutForm.addEventListener('submit', handleCheckout);

    // Order Type Toggle (Show/Hide address)
    elements.orderTypeInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            if (e.target.value === 'Pickup') {
                elements.addressGroup.style.display = 'none';
                elements.customerAddress.required = false;
            } else {
                elements.addressGroup.style.display = 'block';
                elements.customerAddress.required = true;
            }
        });
    });
}

// Start
document.addEventListener('DOMContentLoaded', init);

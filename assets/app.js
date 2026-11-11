// Dabnaps (dabnaps.gg) — Official On-Demand Storefront Application
// Features: Curated 9-SKU Catalog, Category Filters, Cloud Bag Cart Drawer,
// VIP Member Discount Engine, On-Demand Order Checkout & Stock Management.

(function () {
  'use strict';

  // State Management
  let db = null;
  let cart = [];
  let appliedPromo = null;
  let activeCategory = 'all';
  let searchQuery = '';
  let toastTimer = null;

  // Initialize Application
  async function init() {
    await loadDatabase();
    loadCartFromStorage();
    loadPromoFromStorage();
    checkAgeGate();
    renderStorefront();
    updateCartUI();
  }

  // Load Database (with localStorage override and static fallback)
  async function loadDatabase() {
    const localOverride = localStorage.getItem('dabnaps_db_override');
    if (localOverride) {
      try {
        db = JSON.parse(localOverride);
        if (db && db.products && db.products.length === 9) {
          return;
        }
      } catch (e) {
        console.warn('Could not parse local DB override, falling back to static data.');
      }
    }

    try {
      const response = await fetch('data/inventory.json', { cache: 'no-cache' });
      if (response.ok) {
        db = await response.json();
        return;
      }
    } catch (err) {
      console.warn('Fetch inventory.json failed, loading static fallback window.DABNAPS_INITIAL_DATA.');
    }

    if (window.DABNAPS_INITIAL_DATA) {
      db = JSON.parse(JSON.stringify(window.DABNAPS_INITIAL_DATA));
    } else {
      db = { company: {}, products: [], orders: [], activityLog: [] };
    }
  }

  // Local Storage Cart Helpers
  function loadCartFromStorage() {
    try {
      const saved = localStorage.getItem('dabnaps_cart');
      cart = saved ? JSON.parse(saved) : [];
    } catch (e) {
      cart = [];
    }
  }

  function saveCartToStorage() {
    localStorage.setItem('dabnaps_cart', JSON.stringify(cart));
  }

  function loadPromoFromStorage() {
    const savedPromo = (localStorage.getItem('dabnaps_promo') || '').trim().toUpperCase();
    if (savedPromo === 'DISCORD25') {
      appliedPromo = 'DISCORD25';
    } else {
      appliedPromo = null;
      if (savedPromo) localStorage.removeItem('dabnaps_promo');
    }
  }

  // Storefront Rendering
  window.renderStorefront = function () {
    const grid = document.getElementById('product-grid');
    const subtitle = document.getElementById('catalog-subtitle');
    if (!grid || !db || !db.products) return;

    let filtered = db.products.filter(p => {
      const matchCat = (activeCategory === 'all') || (p.category === activeCategory);
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.colorway && p.colorway.toLowerCase().includes(q)) ||
        p.sku.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });

    if (subtitle) {
      if (activeCategory === 'all') {
        subtitle.textContent = `Showing all ${filtered.length} premium essentials`;
      } else {
        subtitle.textContent = `Showing ${filtered.length} products in ${activeCategory}`;
      }
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: var(--muted-gold);">
          <div style="font-size: 2.4rem; margin-bottom: 12px;">🔍</div>
          <h3>No matching items found</h3>
          <p style="margin-top: 8px;">Try clearing your search query or selecting a different category.</p>
          <button class="btn-secondary" style="margin-top: 16px;" onclick="filterCategory('all'); document.getElementById('search-input').value=''; handleSearch('');">Reset Filters</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      let stockPillHtml = '';
      if (p.stock >= 18) {
        stockPillHtml = `<span class="stock-pill in-stock"><span class="dot"></span> In Stock (${p.stock} available)</span>`;
      } else if (p.stock > 0) {
        stockPillHtml = `<span class="stock-pill low-stock"><span class="dot"></span> Low Stock: Only ${p.stock} left — ships in 24h</span>`;
      } else {
        stockPillHtml = `<span class="stock-pill out-of-stock">Sold Out</span>`;
      }

      const specsListHtml = (p.specs && p.specs.length)
        ? `<ul class="product-specs">${p.specs.map(s => `<li>${s}</li>`).join('')}</ul>`
        : '';

      const isSoldOut = p.stock <= 0;

      return `
        <article class="product-card" id="card-${p.id}">
          <div class="product-img-wrap">
            <img src="${p.image}" alt="${p.name}" loading="lazy" />
            <span class="product-badge">${p.badge || p.category}</span>
            ${stockPillHtml}
          </div>
          <div class="product-body">
            <div class="product-meta">
              <span>${p.category}</span>
              <span>${p.sku}</span>
            </div>
            <h3 class="product-title">${p.name}</h3>
            ${p.colorway ? `<div class="product-colorway">${p.colorway}</div>` : ''}
            <p class="product-desc">${p.description}</p>
            ${specsListHtml}
            <div class="product-footer">
              <span class="product-price">$${p.price.toFixed(2)}</span>
              <button
                class="add-cart-btn"
                onclick="addToCart('${p.id}')"
                ${isSoldOut ? 'disabled' : ''}
                aria-label="Add ${p.name} to Cloud Bag"
              >
                ${isSoldOut ? 'Sold Out' : '+ Add to Bag'}
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  };

  // Category Filtering
  window.filterCategory = function (category) {
    activeCategory = category;

    // Update navbar tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.category === category);
    });

    // Update toolbar pills
    document.querySelectorAll('.cat-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.category === category);
    });

    renderStorefront();

    // If invoked from hero, scroll smoothly to catalog
    const catalogEl = document.getElementById('shop-catalog');
    if (catalogEl && category !== 'all') {
      const topOffset = catalogEl.getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo({ top: topOffset, behavior: 'smooth' });
    }
  };

  // Search Filtering
  window.handleSearch = function (val) {
    searchQuery = (val || '').trim();
    renderStorefront();
  };

  // Cart Operations
  window.addToCart = function (productId) {
    if (!db || !db.products) return;
    const product = db.products.find(p => p.id === productId);
    if (!product) return;

    if (product.stock <= 0) {
      showToast('Sorry, this item is currently sold out.');
      return;
    }

    const existingIndex = cart.findIndex(item => item.id === productId);
    const currentQtyInCart = existingIndex > -1 ? cart[existingIndex].qty : 0;

    if (currentQtyInCart + 1 > product.stock) {
      showToast(`Only ${product.stock} units available in stock.`);
      return;
    }

    if (existingIndex > -1) {
      cart[existingIndex].qty += 1;
    } else {
      cart.push({
        id: product.id,
        sku: product.sku,
        name: product.name,
        price: product.price,
        qty: 1,
        image: product.image,
        category: product.category
      });
    }

    saveCartToStorage();
    updateCartUI();
    showToast(`Added "${product.name}" to Cloud Bag`);
  };

  window.updateCartQty = function (productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    const product = db && db.products ? db.products.find(p => p.id === productId) : null;
    const maxStock = product ? product.stock : 99;

    const newQty = item.qty + delta;
    if (newQty > maxStock) {
      showToast(`Only ${maxStock} units available.`);
      return;
    }

    if (newQty <= 0) {
      removeFromCart(productId);
    } else {
      item.qty = newQty;
      saveCartToStorage();
      updateCartUI();
    }
  };

  window.removeFromCart = function (productId) {
    cart = cart.filter(i => i.id !== productId);
    saveCartToStorage();
    updateCartUI();
    showToast('Item removed from Cloud Bag');
  };

  window.toggleCartDrawer = function (open) {
    const drawerBackdrop = document.getElementById('cart-drawer-backdrop');
    if (!drawerBackdrop) return;
    if (open) {
      drawerBackdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
    } else {
      drawerBackdrop.classList.remove('open');
      document.body.style.overflow = '';
    }
  };

  window.handleDrawerBackdropClick = function (e) {
    if (e.target.id === 'cart-drawer-backdrop') {
      toggleCartDrawer(false);
    }
  };

  // Cart Calculation & UI Refresh
  function updateCartUI() {
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);

    // Update Header Badges
    const headerCartCount = document.getElementById('header-cart-count');
    if (headerCartCount) {
      headerCartCount.textContent = totalCount;
    }

    // Update Drawer Items
    const itemsList = document.getElementById('cart-items-list');
    const checkoutBtn = document.getElementById('cart-checkout-btn');

    if (itemsList) {
      if (cart.length === 0) {
        itemsList.innerHTML = `
          <div class="cart-empty-state">
            <div class="icon">☁️</div>
            <h4>Your Cloud Bag is empty</h4>
            <p style="font-size:0.86rem; margin-top:6px;">Add blankets, silicone mats, or dabbing tools to get started!</p>
          </div>
        `;
        if (checkoutBtn) checkoutBtn.disabled = true;
      } else {
        if (checkoutBtn) checkoutBtn.disabled = false;
        itemsList.innerHTML = cart.map(item => `
          <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" />
            <div class="cart-item-details">
              <div class="cart-item-name" title="${item.name}">${item.name}</div>
              <div class="cart-item-price">$${item.price.toFixed(2)} each</div>
              <div class="cart-qty-row">
                <button class="qty-btn" onclick="updateCartQty('${item.id}', -1)" aria-label="Decrease quantity">&minus;</button>
                <span class="qty-val">${item.qty}</span>
                <button class="qty-btn" onclick="updateCartQty('${item.id}', 1)" aria-label="Increase quantity">&plus;</button>
                <span style="font-size:0.82rem; font-weight:700; color:var(--warm-cream); margin-left:auto;">
                  $${(item.price * item.qty).toFixed(2)}
                </span>
              </div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.id}')" title="Remove item" aria-label="Remove item">
              &times;
            </button>
          </div>
        `).join('');
      }
    }

    // Calculate Financials
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const isDiscordVIP = (appliedPromo === 'DISCORD25');
    const discountAmount = isDiscordVIP ? (subtotal * 0.25) : 0;
    const shippingAmount = (subtotal === 0) ? 0 : ((subtotal >= 50) ? 0 : 4.99);
    const grandTotal = Math.max(0, subtotal - discountAmount + shippingAmount);

    // Update Drawer Financial Elements
    const subtotalEl = document.getElementById('cart-subtotal');
    const discountRow = document.getElementById('cart-discount-row');
    const discountEl = document.getElementById('cart-discount');
    const shippingEl = document.getElementById('cart-shipping');
    const grandTotalEl = document.getElementById('cart-grand-total');
    const promoTag = document.getElementById('applied-promo-tag');

    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;

    if (discountRow && discountEl) {
      if (discountAmount > 0) {
        discountRow.style.display = 'flex';
        discountEl.textContent = `-$${discountAmount.toFixed(2)}`;
      } else {
        discountRow.style.display = 'none';
      }
    }

    if (shippingEl) {
      if (subtotal === 0) {
        shippingEl.textContent = '$0.00';
      } else if (subtotal >= 50) {
        shippingEl.textContent = 'FREE (Orders $50+)';
      } else {
        shippingEl.textContent = `$${shippingAmount.toFixed(2)}`;
      }
    }

    if (grandTotalEl) grandTotalEl.textContent = `$${grandTotal.toFixed(2)}`;

    if (promoTag) {
      promoTag.style.display = isDiscordVIP ? 'flex' : 'none';
    }
  }

  // Promo Code Operations
  window.applyPromoCode = function (explicitCode) {
    const input = document.getElementById('promo-code-input');
    const rawCode = explicitCode || (input ? input.value : '');
    const code = (rawCode || '').trim().toUpperCase();

    if (!code) {
      showToast('Please enter a promotional code.');
      return;
    }

    if (code === 'DISCORD25') {
      appliedPromo = 'DISCORD25';
      localStorage.setItem('dabnaps_promo', 'DISCORD25');
      if (input) input.value = '';
      updateCartUI();
      showToast('🎉 VIP 25% member discount activated!');
    } else {
      showToast('Invalid or expired promo code.');
    }
  };

  window.removePromoCode = function () {
    appliedPromo = null;
    localStorage.removeItem('dabnaps_promo');
    updateCartUI();
    showToast('Promo code removed.');
  };

  // Checkout Modal
  window.openCheckoutModal = function () {
    if (cart.length === 0) {
      showToast('Your Cloud Bag is empty.');
      return;
    }

    toggleCartDrawer(false);

    // Populate Checkout Review Box
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const isDiscordVIP = (appliedPromo === 'DISCORD25');
    const discountAmount = isDiscordVIP ? (subtotal * 0.25) : 0;
    const shippingAmount = (subtotal >= 50) ? 0 : 4.99;
    const grandTotal = Math.max(0, subtotal - discountAmount + shippingAmount);

    const modalItemCount = document.getElementById('modal-item-count');
    const modalSubtotal = document.getElementById('modal-subtotal');
    const modalDiscountRow = document.getElementById('modal-discount-row');
    const modalDiscount = document.getElementById('modal-discount');
    const modalShipping = document.getElementById('modal-shipping');
    const modalTotal = document.getElementById('modal-total');
    const placeOrderAmount = document.getElementById('place-order-amount');

    if (modalItemCount) modalItemCount.textContent = totalCount;
    if (modalSubtotal) modalSubtotal.textContent = `$${subtotal.toFixed(2)}`;

    if (modalDiscountRow && modalDiscount) {
      if (discountAmount > 0) {
        modalDiscountRow.style.display = 'flex';
        modalDiscount.textContent = `-$${discountAmount.toFixed(2)}`;
      } else {
        modalDiscountRow.style.display = 'none';
      }
    }

    if (modalShipping) {
      modalShipping.textContent = (shippingAmount === 0) ? 'FREE' : `$${shippingAmount.toFixed(2)}`;
    }

    if (modalTotal) modalTotal.textContent = `$${grandTotal.toFixed(2)}`;
    if (placeOrderAmount) placeOrderAmount.textContent = grandTotal.toFixed(2);

    // Ensure form view is visible and confirmation view is hidden
    const formContainer = document.getElementById('checkout-form-container');
    const confirmContainer = document.getElementById('checkout-confirmation-container');
    const modalTitle = document.getElementById('checkout-modal-title');
    if (formContainer) formContainer.style.display = 'block';
    if (confirmContainer) confirmContainer.style.display = 'none';
    if (modalTitle) modalTitle.textContent = '📦 On-Demand Order Checkout';

    const modal = document.getElementById('checkout-modal-backdrop');
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  };

  window.closeCheckoutModal = function () {
    const modal = document.getElementById('checkout-modal-backdrop');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  };

  window.handleCheckoutBackdropClick = function (e) {
    if (e.target.id === 'checkout-modal-backdrop') {
      closeCheckoutModal();
    }
  };

  // Submit Order & Manage Simulated Inventory
  window.handleCheckoutSubmit = function (e) {
    e.preventDefault();

    const name = (document.getElementById('ship-name') || {}).value || 'Customer';
    const email = (document.getElementById('ship-email') || {}).value || 'buyer@example.com';
    const address = (document.getElementById('ship-address') || {}).value || '123 Cloud St';
    const city = (document.getElementById('ship-city') || {}).value || 'Denver';
    const state = (document.getElementById('ship-state') || {}).value || 'CO';
    const zip = (document.getElementById('ship-zip') || {}).value || '80202';

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const isDiscordVIP = (appliedPromo === 'DISCORD25');
    const discountAmount = isDiscordVIP ? (subtotal * 0.25) : 0;
    const shippingAmount = (subtotal >= 50) ? 0 : 4.99;
    const grandTotal = Math.max(0, subtotal - discountAmount + shippingAmount);

    const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);

    // Decrement Simulated Inventory in db.products
    cart.forEach(cartItem => {
      const product = db.products.find(p => p.id === cartItem.id);
      if (product) {
        product.stock = Math.max(0, product.stock - cartItem.qty);
      }
    });

    // Record Order in Database
    const newOrder = {
      orderId: orderId,
      timestamp: new Date().toISOString(),
      customer: {
        name: name,
        email: email,
        address: address,
        city: city,
        state: state,
        zip: zip
      },
      items: JSON.parse(JSON.stringify(cart)),
      subtotal: subtotal,
      discount: discountAmount,
      promoCode: appliedPromo,
      shipping: shippingAmount,
      total: grandTotal,
      fulfillmentStatus: 'Routed to On-Demand Supplier'
    };

    if (!db.orders) db.orders = [];
    db.orders.push(newOrder);

    // Persist Updated Inventory & Orders to Local Storage Override
    localStorage.setItem('dabnaps_db_override', JSON.stringify(db));

    // Clear Cart & Promo
    cart = [];
    appliedPromo = null;
    localStorage.removeItem('dabnaps_promo');
    saveCartToStorage();
    updateCartUI();

    // Render Confirmation View
    const formContainer = document.getElementById('checkout-form-container');
    const confirmContainer = document.getElementById('checkout-confirmation-container');
    const modalTitle = document.getElementById('checkout-modal-title');
    const confirmedOrderId = document.getElementById('confirmed-order-id');
    const confirmedRecipient = document.getElementById('confirmed-recipient');
    const confirmedAddress = document.getElementById('confirmed-address');
    const confirmedTotal = document.getElementById('confirmed-total');

    if (formContainer) formContainer.style.display = 'none';
    if (confirmContainer) confirmContainer.style.display = 'block';
    if (modalTitle) modalTitle.textContent = '🎉 Order Confirmation';
    if (confirmedOrderId) confirmedOrderId.textContent = orderId;
    if (confirmedRecipient) confirmedRecipient.textContent = `${name} (${email})`;
    if (confirmedAddress) confirmedAddress.textContent = `${address}, ${city}, ${state} ${zip}`;
    if (confirmedTotal) confirmedTotal.textContent = `$${grandTotal.toFixed(2)}`;

    // Re-render Storefront so stock badges immediately reflect decremented inventory
    renderStorefront();

    showToast(`Order ${orderId} placed successfully!`);
  };

  // Age Gate (21+)
  window.checkAgeGate = function () {
    const verified = localStorage.getItem('dabnaps_age_verified');
    const modal = document.getElementById('age-gate-modal');
    if (!verified && modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  };

  window.confirmAgeGate = function (isOfAge) {
    const modal = document.getElementById('age-gate-modal');
    if (isOfAge) {
      localStorage.setItem('dabnaps_age_verified', 'true');
      if (modal) modal.classList.remove('open');
      document.body.style.overflow = '';
      showToast('Welcome to Dabnaps — Golden Hour Concentrates Comfort.');
    } else {
      window.location.href = 'https://www.google.com';
    }
  };

  // Toast Notification Helper
  window.showToast = function (msg) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3400);
  };

  // Bootstrap on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

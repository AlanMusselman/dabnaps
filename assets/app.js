// Dabnaps Storefront + Admin Inventory & In-House R&D Application
(function () {
  let db = window.DABNAPS_INITIAL_DATA || { company: {}, products: [], inHouseProductionBatches: [], orders: [], activityLog: [] };
  let activeView = 'storefront'; // 'storefront' | 'lab' | 'admin'
  let selectedCategory = 'All';
  let searchQuery = '';
  let cart = [];
  let serverOnline = false;

  // Initialize App
  async function init() {
    checkAgeGate();
    await loadDatabase();
    renderAll();
    setupEventListeners();
  }

  function checkAgeGate() {
    const verified = localStorage.getItem('dabnaps_age_verified');
    const modal = document.getElementById('age-gate-modal');
    if (!verified && modal) {
      modal.classList.add('open');
    }
  }

  window.confirmAgeGate = function (isOfAge) {
    const modal = document.getElementById('age-gate-modal');
    if (isOfAge) {
      localStorage.setItem('dabnaps_age_verified', 'true');
      modal.classList.remove('open');
      showToast('Welcome to the Cloud Lounge, cozy friend.');
    } else {
      alert('You must be 21+ to browse Dabnaps.');
    }
  };

  function getAdminPasscode() {
    return sessionStorage.getItem('dabnaps_admin_passcode') || '';
  }

  function setAdminPasscode(passcode) {
    if (passcode) {
      sessionStorage.setItem('dabnaps_admin_passcode', passcode);
    } else {
      sessionStorage.removeItem('dabnaps_admin_passcode');
    }
  }

  function promptAdminPasscode() {
    return new Promise((resolve) => {
      let modal = document.getElementById('admin-auth-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'admin-auth-modal';
        modal.className = 'modal-backdrop';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(10,10,10,0.85); display:none; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(6px);';
        modal.innerHTML = `
          <div class="modal-card" style="background:#1C1A17; border:1px solid #FFB800; border-radius:16px; padding:32px; max-width:420px; width:90%; color:#FFFDF7; text-align:center; box-shadow:0 16px 48px rgba(0,0,0,0.8);">
            <div style="font-size:2.8rem; margin-bottom:12px;">🔒</div>
            <h3 style="color:#FFB800; font-size:1.35rem; margin-bottom:8px; font-weight:700;">Admin Authentication</h3>
            <p style="font-size:0.9rem; color:#E8B86D; line-height:1.4; margin-bottom:20px;">
              Enter the Dabnaps administrative passcode to access wholesale COGS, production batches, and inventory management.
            </p>
            <form id="admin-auth-form" style="display:flex; flex-direction:column; gap:16px;">
              <input type="password" id="admin-passcode-input" placeholder="Admin Passcode" autocomplete="current-password"
                style="width:100%; box-sizing:border-box; padding:12px 16px; border-radius:8px; border:1px solid #8C5300; background:#0A0A0A; color:#FFFDF7; font-size:1rem; outline:none;" />
              <div id="admin-auth-err" style="color:#EF4444; font-size:0.85rem; display:none;"></div>
              <div style="display:flex; gap:12px; justify-content:center;">
                <button type="button" id="admin-auth-cancel" class="btn-secondary" style="flex:1; padding:10px 16px;">Cancel</button>
                <button type="submit" id="admin-auth-submit" class="btn-primary" style="flex:1; padding:10px 16px;">Unlock Portal</button>
              </div>
            </form>
          </div>
        `;
        document.body.appendChild(modal);
      }

      const input = document.getElementById('admin-passcode-input');
      const form = document.getElementById('admin-auth-form');
      const cancelBtn = document.getElementById('admin-auth-cancel');
      const errBox = document.getElementById('admin-auth-err');
      errBox.style.display = 'none';
      errBox.textContent = '';
      input.value = '';
      modal.style.display = 'flex';
      setTimeout(() => input.focus(), 80);

      const close = () => {
        modal.style.display = 'none';
        form.onsubmit = null;
        cancelBtn.onclick = null;
      };

      cancelBtn.onclick = () => {
        close();
        resolve(null);
      };

      form.onsubmit = (e) => {
        e.preventDefault();
        const code = input.value.trim();
        if (!code) {
          errBox.textContent = 'Please enter a passcode.';
          errBox.style.display = 'block';
          return;
        }
        close();
        resolve(code);
      };
    });
  }

  async function loadDatabase(preferredScope) {
    const passcode = getAdminPasscode();
    const headers = {};
    if (passcode) {
      headers['X-Admin-Passcode'] = passcode;
      headers['Authorization'] = 'Bearer ' + passcode;
    }
    const query = (passcode || preferredScope === 'admin') ? '?scope=admin' : '';
    for (const endpoint of ['/api/inventory' + query, 'api.php' + query]) {
      try {
        const res = await fetch(endpoint, { cache: 'no-store', headers });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.products)) {
            db = data;
            serverOnline = true;
            updateSyncIndicator(true);
            return true;
          }
        }
      } catch (e) {
        // Try next endpoint or fallback
      }
    }
    const cached = localStorage.getItem('dabnaps_db_override');
    if (cached) {
      try {
        db = JSON.parse(cached);
      } catch (e) {}
    }
    updateSyncIndicator(false);
    return false;
  }

  async function persistDatabase(logAction) {
    const now = new Date().toISOString();
    db.company.lastUpdated = now;
    if (logAction) {
      db.activityLog = db.activityLog || [];
      db.activityLog.unshift({
        timestamp: now,
        actor: 'Store/Admin UI',
        action: logAction
      });
      if (db.activityLog.length > 50) db.activityLog.length = 50;
    }

    localStorage.setItem('dabnaps_db_override', JSON.stringify(db));

    const passcode = getAdminPasscode();
    const reqHeaders = { 'Content-Type': 'application/json' };
    if (passcode) {
      reqHeaders['X-Admin-Passcode'] = passcode;
      reqHeaders['Authorization'] = 'Bearer ' + passcode;
    }

    let savedRemote = false;
    for (const endpoint of ['/api/inventory', 'api.php']) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify(db)
        });
        if (res.ok) {
          savedRemote = true;
          break;
        } else if (res.status === 401 || res.status === 403) {
          showToast('Authentication failed: Write rejected by server.');
          setAdminPasscode(null);
          break;
        }
      } catch (e) {}
    }
    serverOnline = savedRemote;
    updateSyncIndicator(savedRemote);
    renderAll();
  }

  function updateSyncIndicator(isLiveApi) {
    const badge = document.getElementById('sync-status-badge');
    if (!badge) return;
    if (isLiveApi) {
      badge.innerHTML = '<span class="sync-dot"></span> Live JSON DB Synced';
    } else {
      badge.innerHTML = '<span class="sync-dot" style="background:#E8B86D"></span> Local Sync Active';
    }
  }

  // View Switching
  window.switchView = async function (viewName) {
    if (viewName === 'admin') {
      let passcode = getAdminPasscode();
      if (!passcode) {
        passcode = await promptAdminPasscode();
        if (!passcode) {
          // User canceled
          return;
        }

        // Verify passcode against server
        let verified = false;
        for (const endpoint of ['/api/inventory?scope=admin', 'api.php?scope=admin']) {
          try {
            const res = await fetch(endpoint, {
              headers: {
                'X-Admin-Passcode': passcode,
                'Authorization': 'Bearer ' + passcode
              }
            });
            if (res.ok) {
              const data = await res.json();
              if (data && Array.isArray(data.products)) {
                db = data;
                verified = true;
                break;
              }
            } else if (res.status === 401 || res.status === 403) {
              showToast('Access Denied: Invalid admin passcode.');
              return;
            }
          } catch (e) {
            // offline / standalone file mode fallback
          }
        }

        if (!verified && !serverOnline && passcode === 'Dabnaps2026!') {
          verified = true;
        }

        if (!verified) {
          showToast('Access Denied: Invalid admin passcode.');
          return;
        }

        setAdminPasscode(passcode);
        showToast('Admin access granted. COGS & orders unlocked.');
      } else {
        // Refresh admin data
        await loadDatabase('admin');
      }
    }

    activeView = viewName;
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });
    document.getElementById('view-storefront').style.display = viewName === 'storefront' ? 'block' : 'none';
    document.getElementById('view-lab').style.display = viewName === 'lab' ? 'block' : 'none';
    document.getElementById('view-admin').style.display = viewName === 'admin' ? 'block' : 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderAll();
  };

  window.adminLogout = function () {
    setAdminPasscode(null);
    showToast('Admin signed out.');
    switchView('storefront');
    loadDatabase();
  };

  function renderAll() {
    renderStorefront();
    renderInHouseLab();
    renderAdminDashboard();
    renderCart();
  }

  // Storefront Rendering
  function renderStorefront() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    const filtered = db.products.filter(p => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.colorway.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 48px; background: var(--white); border-radius: var(--radius-lg);">
        <h3>No cozy gear matched your filter</h3>
        <p style="color:var(--mocha); margin-top:8px;">Try clearing your search or selecting "All" categories.</p>
      </div>`;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const isOut = p.stock <= 0;
      const isLow = !isOut && p.stock <= p.reorderPoint;
      const stockClass = isOut ? 'out' : (isLow ? 'low' : '');
      const stockText = isOut ? 'Sold Out' : (isLow ? `Only ${p.stock} left` : `${p.stock} in stock`);
      const specsHtml = (p.specs || []).slice(0, 3).map(s => `<li>• ${s}</li>`).join('');

      return `
        <article class="product-card">
          <div class="product-img-wrap">
            <img src="${p.image}" alt="${p.name}" loading="lazy" />
            <span class="product-badge ${p.inHouse ? 'inhouse' : ''}">${p.badge || p.category}</span>
            <span class="stock-pill ${stockClass}">${stockText}</span>
          </div>
          <div class="product-body">
            <div class="product-meta">
              <span>${p.category}</span>
              <span>SKU: ${p.sku}</span>
            </div>
            <h3 class="product-title">${p.name}</h3>
            <div class="product-colorway">${p.colorway} ${p.inHouse ? '• In-House Silicone' : ''}</div>
            <p class="product-desc">${p.description}</p>
            <ul class="product-specs">${specsHtml}</ul>
            <div class="product-footer">
              <span class="product-price">$${Number(p.price).toFixed(2)}</span>
              <button class="add-cart-btn" onclick="addToCart('${p.id}')" ${isOut ? 'disabled' : ''}>
                ${isOut ? 'Out of Stock' : '+ Add to Cloud Bag'}
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // Category & Search
  window.filterByCategory = function (cat) {
    selectedCategory = cat;
    document.querySelectorAll('.cat-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === cat);
    });
    renderStorefront();
  };

  // Cart Functions
  window.addToCart = function (productId) {
    const product = db.products.find(p => p.id === productId);
    if (!product || product.stock <= 0) return;

    const existing = cart.find(item => item.id === productId);
    const currentQty = existing ? existing.qty : 0;
    if (currentQty + 1 > product.stock) {
      showToast(`Only ${product.stock} units of ${product.name} available!`);
      return;
    }

    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ id: product.id, sku: product.sku, name: product.name, price: product.price, image: product.image, qty: 1 });
    }
    renderCart();
    showToast(`Added ${product.name} to your Cloud Bag`);
  };

  window.updateCartQty = function (productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    const product = db.products.find(p => p.id === productId);
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      cart = cart.filter(i => i.id !== productId);
    } else if (product && newQty > product.stock) {
      showToast(`Max available stock (${product.stock}) reached`);
      return;
    } else {
      item.qty = newQty;
    }
    renderCart();
  };

  window.toggleCartDrawer = function (open) {
    const drawer = document.getElementById('cart-drawer-backdrop');
    if (drawer) drawer.classList.toggle('open', open);
  };

  function renderCart() {
    const countEl = document.getElementById('cart-count');
    const listEl = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total-price');

    const totalQty = cart.reduce((sum, i) => sum + i.qty, 0);
    const totalPrice = cart.reduce((sum, i) => sum + (i.qty * i.price), 0);

    if (countEl) countEl.textContent = totalQty;
    if (totalEl) totalEl.textContent = `$${totalPrice.toFixed(2)}`;

    if (!listEl) return;
    if (cart.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; padding:40px 10px; color:var(--mocha);">
        <p style="font-size:1.05rem; font-weight:600;">Your Cloud Bag is empty</p>
        <p style="font-size:0.86rem; margin-top:6px;">Add an in-house silicone dab tray, frosted mini rig, or fluffy throw blanket to get cozy.</p>
      </div>`;
      return;
    }

    listEl.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" />
        <div style="flex:1;">
          <div style="font-weight:700; font-size:0.9rem;">${item.name}</div>
          <div style="font-size:0.78rem; color:var(--mocha);">${item.sku} • $${item.price.toFixed(2)} each</div>
          <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
            <button class="mini-btn" onclick="updateCartQty('${item.id}', -1)">-</button>
            <span style="font-weight:700; font-size:0.88rem;">${item.qty}</span>
            <button class="mini-btn" onclick="updateCartQty('${item.id}', 1)">+</button>
          </div>
        </div>
        <div style="font-weight:700;">$${(item.qty * item.price).toFixed(2)}</div>
      </div>
    `).join('');
  }

  window.checkoutOrder = async function () {
    if (cart.length === 0) {
      showToast('Your Cloud Bag is empty!');
      return;
    }
    const customerName = document.getElementById('checkout-name').value.trim() || 'Cozy Guest';
    const customerEmail = document.getElementById('checkout-email').value.trim() || 'guest@dabnaps.com';

    let orderTotal = 0;
    const orderItems = [];

    for (const item of cart) {
      const prod = db.products.find(p => p.id === item.id);
      if (!prod || prod.stock < item.qty) {
        showToast(`Insufficient stock for ${item.name}`);
        return;
      }
      prod.stock -= item.qty;
      orderTotal += item.qty * item.price;
      orderItems.push({ sku: prod.sku, name: prod.name, qty: item.qty, price: item.price });
    }

    const orderId = 'ORD-' + Math.floor(1050 + Math.random() * 8900);
    db.orders = db.orders || [];
    db.orders.unshift({
      orderId,
      customer: customerName,
      email: customerEmail,
      date: new Date().toISOString(),
      status: 'Processing',
      total: orderTotal,
      items: orderItems
    });

    cart = [];
    document.getElementById('checkout-name').value = '';
    document.getElementById('checkout-email').value = '';
    toggleCartDrawer(false);

    await persistDatabase(`New Customer Order ${orderId} by ${customerName} ($${orderTotal.toFixed(2)}) — Stock automatically deducted.`);
    showToast(`Order ${orderId} confirmed! Inventory automatically updated.`);
  };

  // In-House Silicone Lab View
  function renderInHouseLab() {
    const batchTable = document.getElementById('lab-batches-tbody');
    if (!batchTable) return;

    const batches = db.inHouseProductionBatches || [];
    batchTable.innerHTML = batches.map(b => `
      <tr>
        <td><strong>${b.batchId}</strong></td>
        <td>${b.productName}<br><small style="color:var(--mocha)">${b.productSku}</small></td>
        <td><span class="cat-pill active" style="padding:4px 12px; font-size:0.76rem;">${b.stage}</span></td>
        <td>${b.unitsPassedQC} / ${b.unitsPoured} units</td>
        <td>${b.siliconeLot}<br><small style="color:var(--mocha)">${b.pigmentMix}</small></td>
        <td>${b.cureTempF}°F • ${b.postCureHours}h</td>
        <td style="font-size:0.82rem; color:var(--mocha);">${b.notes}</td>
      </tr>
    `).join('');
  }

  // Admin & Inventory Dashboard Rendering
  function renderAdminDashboard() {
    const kpiContainer = document.getElementById('admin-kpi-grid');
    const tbody = document.getElementById('admin-inventory-tbody');
    const ordersTbody = document.getElementById('admin-orders-tbody');
    const logList = document.getElementById('admin-activity-log');

    if (!kpiContainer || !tbody) return;

    let totalUnits = 0;
    let retailVal = 0;
    let costVal = 0;
    let lowStockCount = 0;

    db.products.forEach(p => {
      totalUnits += p.stock;
      retailVal += (p.stock * p.price);
      costVal += (p.stock * p.cost);
      if (p.stock <= p.reorderPoint) lowStockCount++;
    });

    const grossMarginPct = retailVal > 0 ? (((retailVal - costVal) / retailVal) * 100).toFixed(1) : '0.0';

    kpiContainer.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-label">Total Active SKUs</div>
        <div class="kpi-value">${db.products.length}</div>
        <div class="kpi-sub">${db.products.filter(p => p.inHouse).length} In-House Engineered</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Units in Stock</div>
        <div class="kpi-value">${totalUnits}</div>
        <div class="kpi-sub">Ready for immediate ship</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Retail Inventory Value</div>
        <div class="kpi-value">$${retailVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        <div class="kpi-sub">COGS: $${costVal.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${grossMarginPct}% Margin)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Reorder / Low Stock Alerts</div>
        <div class="kpi-value" style="color: ${lowStockCount > 0 ? 'var(--danger)' : 'var(--success)'}">${lowStockCount}</div>
        <div class="kpi-sub">${lowStockCount > 0 ? 'Requires silicone pour or PO' : 'All stock levels healthy'}</div>
      </div>
    `;

    tbody.innerHTML = db.products.map(p => {
      const isLow = p.stock <= p.reorderPoint;
      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="${p.image}" style="width:42px; height:42px; border-radius:8px; object-fit:cover;" />
              <div>
                <strong>${p.name}</strong>
                <div style="font-size:0.76rem; color:var(--mocha);">${p.sku} • ${p.category}</div>
              </div>
            </div>
          </td>
          <td>
            <select class="inline-select" onchange="adminUpdateRdStage('${p.id}', this.value)">
              ${['Stocked Inventory', 'Production Batch #1', 'Post-Cure QC', 'Prototype Mold Testing', 'Silicone Pour Scheduled'].map(stage =>
                `<option value="${stage}" ${p.rdStage === stage ? 'selected' : ''}>${stage}</option>`
              ).join('')}
            </select>
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:6px;">
              <button class="mini-btn" onclick="adminAdjustStock('${p.id}', -5)">-5</button>
              <button class="mini-btn" onclick="adminAdjustStock('${p.id}', -1)">-1</button>
              <input type="number" class="inline-input" value="${p.stock}" onchange="adminSetStock('${p.id}', this.value)" />
              <button class="mini-btn" onclick="adminAdjustStock('${p.id}', 1)">+1</button>
              <button class="mini-btn" onclick="adminAdjustStock('${p.id}', 10)">+10</button>
            </div>
          </td>
          <td>
            <span class="stock-pill ${p.stock === 0 ? 'out' : (isLow ? 'low' : '')}" style="position:static;">
              ${p.stock === 0 ? 'OUT OF STOCK' : (isLow ? `LOW (Min ${p.reorderPoint})` : 'HEALTHY')}
            </span>
          </td>
          <td>
            $<input type="number" step="0.50" class="inline-input" value="${Number(p.price).toFixed(2)}" onchange="adminSetPrice('${p.id}', this.value)" />
          </td>
          <td>$${Number(p.cost).toFixed(2)}</td>
          <td><strong>$${(p.stock * p.price).toFixed(2)}</strong></td>
        </tr>
      `;
    }).join('');

    if (ordersTbody) {
      ordersTbody.innerHTML = (db.orders || []).map(o => `
        <tr>
          <td><strong>${o.orderId}</strong></td>
          <td>${o.customer}<br><small style="color:var(--mocha)">${o.email}</small></td>
          <td>${new Date(o.date).toLocaleString()}</td>
          <td>${o.items.map(i => `${i.qty}x ${i.name}`).join(', ')}</td>
          <td><strong>$${Number(o.total).toFixed(2)}</strong></td>
          <td>
            <select class="inline-select" onchange="adminUpdateOrderStatus('${o.orderId}', this.value)">
              ${['Processing', 'Packed in Cozy Box', 'Fulfilled', 'Delivered'].map(st =>
                `<option value="${st}" ${o.status === st ? 'selected' : ''}>${st}</option>`
              ).join('')}
            </select>
          </td>
        </tr>
      `).join('');
    }

    if (logList) {
      logList.innerHTML = (db.activityLog || []).slice(0, 12).map(l => `
        <div style="padding:10px 14px; border-bottom:1px solid var(--oatmeal); display:flex; justify-content:space-between; gap:16px; font-size:0.85rem;">
          <span><strong>[${l.actor}]</strong> ${l.action}</span>
          <span style="color:var(--mocha); white-space:nowrap;">${new Date(l.timestamp).toLocaleTimeString()}</span>
        </div>
      `).join('');
    }
  }

  // Admin Actions
  window.adminAdjustStock = async function (productId, delta) {
    const p = db.products.find(item => item.id === productId);
    if (!p) return;
    const oldStock = p.stock;
    p.stock = Math.max(0, p.stock + delta);
    await persistDatabase(`Adjusted stock for ${p.sku} (${p.name}): ${oldStock} -> ${p.stock}`);
    showToast(`${p.sku} stock updated to ${p.stock}`);
  };

  window.adminSetStock = async function (productId, val) {
    const p = db.products.find(item => item.id === productId);
    if (!p) return;
    const oldStock = p.stock;
    p.stock = Math.max(0, parseInt(val, 10) || 0);
    await persistDatabase(`Set stock for ${p.sku} (${p.name}): ${oldStock} -> ${p.stock}`);
    showToast(`${p.sku} stock set to ${p.stock}`);
  };

  window.adminSetPrice = async function (productId, val) {
    const p = db.products.find(item => item.id === productId);
    if (!p) return;
    const oldPrice = p.price;
    p.price = Math.max(0, parseFloat(val) || 0);
    await persistDatabase(`Updated retail price for ${p.sku}: $${oldPrice.toFixed(2)} -> $${p.price.toFixed(2)}`);
    showToast(`${p.sku} price updated to $${p.price.toFixed(2)}`);
  };

  window.adminUpdateRdStage = async function (productId, stage) {
    const p = db.products.find(item => item.id === productId);
    if (!p) return;
    p.rdStage = stage;
    await persistDatabase(`Updated R&D / Production Stage for ${p.sku} to "${stage}"`);
    showToast(`${p.sku} stage set to ${stage}`);
  };

  window.adminUpdateOrderStatus = async function (orderId, status) {
    const ord = (db.orders || []).find(o => o.orderId === orderId);
    if (!ord) return;
    ord.status = status;
    await persistDatabase(`Order ${orderId} marked as "${status}"`);
    showToast(`Order ${orderId} status: ${status}`);
  };

  window.openNewProductModal = function (open) {
    document.getElementById('new-product-modal').classList.toggle('open', open);
  };

  window.createNewProduct = async function (e) {
    e.preventDefault();
    const sku = document.getElementById('np-sku').value.trim().toUpperCase();
    const name = document.getElementById('np-name').value.trim();
    const category = document.getElementById('np-category').value;
    const price = parseFloat(document.getElementById('np-price').value) || 35;
    const cost = parseFloat(document.getElementById('np-cost').value) || 10;
    const stock = parseInt(document.getElementById('np-stock').value, 10) || 20;
    const colorway = document.getElementById('np-colorway').value.trim() || 'Cozy Cream & Sage';
    const desc = document.getElementById('np-desc').value.trim() || 'Crafted for the Dabnaps Cloud Lounge.';

    if (!sku || !name) return;

    const imageMap = {
      'Silicone Trays': 'assets/images/silicone-tray.png',
      'Dab Rigs': 'assets/images/dab-rig.png',
      'Apparel': 'assets/images/tshirt.png',
      'Blankets': 'assets/images/fluffy-blanket.png',
      'Bundles': 'assets/images/fluffy-blanket.png'
    };

    const newProd = {
      id: 'dn-' + Date.now().toString().slice(-5),
      sku,
      name,
      category,
      price,
      cost,
      stock,
      reorderPoint: 10,
      inHouse: category === 'Silicone Trays',
      rdStage: category === 'Silicone Trays' ? 'Production Batch #1' : 'Stocked Inventory',
      moldId: 'CUSTOM-MOLD',
      curingSpec: 'Platinum Standard',
      colorway,
      image: imageMap[category] || 'assets/images/silicone-tray.png',
      badge: 'New Drop',
      featured: true,
      description: desc,
      specs: [
        `Colorway: ${colorway}`,
        'Designed in-house by Dabnaps',
        'Cozy Cloud Guarantee'
      ]
    };

    db.products.unshift(newProd);
    openNewProductModal(false);
    e.target.reset();
    await persistDatabase(`Created new SKU ${sku} (${name}) at $${price.toFixed(2)} with ${stock} initial units.`);
    showToast(`Added ${name} (${sku}) to catalog!`);
  };

  window.exportInventoryJson = function () {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "inventory.json");
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast('Downloaded updated inventory.json');
  };

  function setupEventListeners() {
    const searchInput = document.getElementById('catalog-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderStorefront();
      });
    }
  }

  function showToast(msg) {
    const t = document.getElementById('toast-notification');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

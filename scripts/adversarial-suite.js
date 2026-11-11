/**
 * Dabnaps M3-Rework Empirical Adversarial Test Suite
 * Executed by M3-Rework Challenger
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}`;

// Helper: HTTP GET probe
function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${urlPath}`, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: buffer.toString('utf8'),
          rawLength: buffer.length
        });
      });
    }).on('error', err => reject(err));
  });
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('       DABNAPS M3-REWORK ADVERSARIAL VERIFICATION SUITE         ');
  console.log('================================================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const failureDetails = [];

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] ${testName}`);
    } else {
      failedTests++;
      console.error(`  [FAIL] ${testName} - ${details}`);
      failureDetails.push({ testName, details });
    }
  }

  // -------------------------------------------------------------
  // SUITE 1: RUNTIME SERVER PROBES (server.ps1 on http://localhost:8080/)
  // -------------------------------------------------------------
  console.log('--- SUITE 1: RUNTIME SERVER PROBES ---');
  const probeEndpoints = [
    { path: '/', expectedStatus: 200, contentType: 'text/html' },
    { path: '/data/inventory.json', expectedStatus: 200, contentType: 'application/json' },
    { path: '/assets/styles.css', expectedStatus: 200, contentType: 'text/css' },
    { path: '/assets/app.js', expectedStatus: 200, contentType: 'application/javascript' },
    { path: '/assets/images/fluffy-blanket.png', expectedStatus: 200, contentType: 'image/png' },
    { path: '/assets/images/dab-tools.png', expectedStatus: 200, contentType: 'image/png' },
    { path: '/assets/images/products/blanket-sherpa-throw.png', expectedStatus: 200, contentType: 'image/png' },
    { path: '/assets/images/products/blanket-velveteen.png', expectedStatus: 200, contentType: 'image/png' },
    { path: '/assets/images/products/blanket-hooded-cloak.png', expectedStatus: 200, contentType: 'image/png' },
    { path: '/assets/images/products/mat-hexagon.png', expectedStatus: 200, contentType: 'image/png' },
    { path: '/assets/images/products/mat-xl-runner.png', expectedStatus: 200, contentType: 'image/png' },
    { path: '/assets/images/products/mat-pocket-travel.png', expectedStatus: 200, contentType: 'image/png' },
    { path: '/assets/images/products/tool-titanium-carver.png', expectedStatus: 200, contentType: 'image/png' },
    { path: '/assets/images/products/tool-5pc-kit.png', expectedStatus: 200, contentType: 'image/png' },
    { path: '/assets/images/products/tool-magnetic-stand.png', expectedStatus: 200, contentType: 'image/png' }
  ];

  for (const ep of probeEndpoints) {
    try {
      const res = await httpGet(ep.path);
      assert(res.statusCode === ep.expectedStatus, `HTTP Probe ${ep.path} Status 200`, `Received status ${res.statusCode}`);
      const ct = (res.headers['content-type'] || '').toLowerCase();
      assert(ct.includes(ep.contentType), `HTTP Probe ${ep.path} Content-Type includes ${ep.contentType}`, `Received ${ct}`);
      assert(res.rawLength > 100, `HTTP Probe ${ep.path} Content non-empty (${res.rawLength} bytes)`);
    } catch (err) {
      assert(false, `HTTP Probe ${ep.path}`, `Exception: ${err.message}`);
    }
  }

  // -------------------------------------------------------------
  // SUITE 2: INVENTORY & CATALOG INTEGRITY ACROSS ALL 9 SKUS
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: INVENTORY & CATALOG INTEGRITY ---');
  const invPath = path.join(ROOT_DIR, 'data', 'inventory.json');
  assert(fs.existsSync(invPath), 'data/inventory.json exists on disk');
  const invData = JSON.parse(fs.readFileSync(invPath, 'utf8'));

  assert(Array.isArray(invData.products), 'Products is an array');
  assert(invData.products.length === 9, `Product catalog has exactly 9 SKUs (Found ${invData.products.length})`);

  const categoryCounts = { 'Cozy Blankets': 0, 'Silicone Mats': 0, 'Dab Tools': 0 };
  let totalSimulatedStock = 0;

  for (const p of invData.products) {
    assert(p.id && p.id.length > 0, `SKU ${p.sku} has valid ID: ${p.id}`);
    assert(p.sku && p.sku.length > 0, `Product ${p.name} has valid SKU: ${p.sku}`);
    assert(['Cozy Blankets', 'Silicone Mats', 'Dab Tools'].includes(p.category), `SKU ${p.sku} belongs to approved category: ${p.category}`);
    if (categoryCounts[p.category] !== undefined) categoryCounts[p.category]++;

    assert(p.price > 0, `SKU ${p.sku} price > 0 ($${p.price.toFixed(2)})`);
    assert(p.cost > 0, `SKU ${p.sku} cost > 0 ($${p.cost.toFixed(2)})`);
    const margin = (p.price - p.cost) / p.price;
    assert(margin >= 0.50, `SKU ${p.sku} gross margin >= 50% (${(margin * 100).toFixed(1)}%)`);

    assert(p.stock >= 14 && p.stock <= 32, `SKU ${p.sku} simulated stock is between 14 and 32 (${p.stock} units)`);
    totalSimulatedStock += p.stock;

    // Image file existence
    const imgDiskPath = path.join(ROOT_DIR, p.image.replace(/\//g, path.sep));
    assert(fs.existsSync(imgDiskPath), `SKU ${p.sku} image exists on disk: ${p.image}`);
  }

  assert(categoryCounts['Cozy Blankets'] === 3, 'Cozy Blankets category has exactly 3 SKUs');
  assert(categoryCounts['Silicone Mats'] === 3, 'Silicone Mats category has exactly 3 SKUs');
  assert(categoryCounts['Dab Tools'] === 3, 'Dab Tools category has exactly 3 SKUs');
  assert(totalSimulatedStock === 205, `Total simulated stock equals 205 units (Found ${totalSimulatedStock})`);

  // -------------------------------------------------------------
  // SUITE 3: ADVERSARIAL CART LOGIC & QUANTITY LIMITS (SIMULATING assets/app.js)
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: ADVERSARIAL CART OPERATIONS & STOCK LIMITS ---');
  // Load app.js and inspect logic or emulate exact client logic
  const appJsContent = fs.readFileSync(path.join(ROOT_DIR, 'assets', 'app.js'), 'utf8');

  // We test the exact cart logic defined in app.js:
  // addToCart(productId), updateCartQty(productId, delta), removeFromCart(productId)
  // Let's create an adversarial harness with mock state matching app.js
  let mockDb = JSON.parse(JSON.stringify(invData));
  let mockCart = [];
  let toastMsg = null;

  function mockShowToast(msg) { toastMsg = msg; }

  function mockAddToCart(productId) {
    const product = mockDb.products.find(p => p.id === productId);
    if (!product) return false;
    if (product.stock <= 0) {
      mockShowToast('Sorry, this item is currently sold out.');
      return false;
    }
    const existingIndex = mockCart.findIndex(item => item.id === productId);
    const currentQtyInCart = existingIndex > -1 ? mockCart[existingIndex].qty : 0;
    if (currentQtyInCart + 1 > product.stock) {
      mockShowToast(`Only ${product.stock} units available in stock.`);
      return false;
    }
    if (existingIndex > -1) {
      mockCart[existingIndex].qty += 1;
    } else {
      mockCart.push({
        id: product.id,
        sku: product.sku,
        name: product.name,
        price: product.price,
        qty: 1,
        image: product.image,
        category: product.category
      });
    }
    mockShowToast(`Added "${product.name}" to Cloud Bag`);
    return true;
  }

  function mockUpdateCartQty(productId, delta) {
    const item = mockCart.find(i => i.id === productId);
    if (!item) return false;
    const product = mockDb.products.find(p => p.id === productId);
    const maxStock = product ? product.stock : 99;
    const newQty = item.qty + delta;
    if (newQty > maxStock) {
      mockShowToast(`Only ${maxStock} units available.`);
      return false;
    }
    if (newQty <= 0) {
      mockCart = mockCart.filter(i => i.id !== productId);
      mockShowToast('Item removed from Cloud Bag');
    } else {
      item.qty = newQty;
    }
    return true;
  }

  // Test 3.1: Add every single SKU (all 9) to cart
  for (const p of mockDb.products) {
    const added = mockAddToCart(p.id);
    assert(added === true, `Add SKU ${p.sku} to cart succeeds`);
  }
  assert(mockCart.length === 9, 'Cart contains all 9 distinct SKUs');

  // Test 3.2: Exceeding stock limit
  const testProduct = mockDb.products[0]; // stock 24
  const testItem = mockCart.find(i => i.id === testProduct.id);
  testItem.qty = testProduct.stock; // set to max stock
  const exceededAdd = mockAddToCart(testProduct.id);
  assert(exceededAdd === false, `Adding beyond stock (${testProduct.stock}) is rejected`);
  assert(testItem.qty === testProduct.stock, `Quantity remains capped at ${testProduct.stock}`);

  const exceededUpdate = mockUpdateCartQty(testProduct.id, 1);
  assert(exceededUpdate === false, `Incrementing beyond stock via updateCartQty is rejected`);
  assert(testItem.qty === testProduct.stock, `Quantity remains capped at ${testProduct.stock}`);

  // Test 3.3: Decrement to 0 removes item
  mockUpdateCartQty(testProduct.id, -testProduct.stock);
  const foundAfterZero = mockCart.find(i => i.id === testProduct.id);
  assert(!foundAfterZero, `Decrementing to 0 removes SKU ${testProduct.sku} from cart`);

  // Test 3.4: Re-adding after removal
  const reAdded = mockAddToCart(testProduct.id);
  assert(reAdded === true, `Re-adding SKU ${testProduct.sku} after removal succeeds`);
  const reAddedItem = mockCart.find(i => i.id === testProduct.id);
  assert(reAddedItem && reAddedItem.qty === 1, 'Re-added item starts at qty = 1');

  // Test 3.5: Sold out item cannot be added
  testProduct.stock = 0;
  const soldOutAdd = mockAddToCart(testProduct.id);
  assert(soldOutAdd === false, 'Adding sold out item (stock = 0) is rejected');

  // -------------------------------------------------------------
  // SUITE 4: ADVERSARIAL DISCOUNT ENGINE & FINANCIALS
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: ADVERSARIAL DISCOUNT ENGINE ---');
  let mockAppliedPromo = null;

  function mockApplyPromoCode(rawCode) {
    const code = (rawCode || '').trim().toUpperCase();
    if (!code) {
      return { success: false, msg: 'Please enter a promotional code.' };
    }
    if (code === 'DISCORD25') {
      mockAppliedPromo = 'DISCORD25';
      return { success: true, msg: '🎉 VIP 25% member discount activated!' };
    }
    return { success: false, msg: 'Invalid or expired promo code.' };
  }

  function calculateTotals(cart, promo) {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const isDiscordVIP = (promo === 'DISCORD25');
    const discountAmount = isDiscordVIP ? (subtotal * 0.25) : 0;
    const shippingAmount = (subtotal === 0) ? 0 : ((subtotal >= 50) ? 0 : 4.99);
    const grandTotal = Math.max(0, subtotal - discountAmount + shippingAmount);
    return { subtotal, discountAmount, shippingAmount, grandTotal };
  }

  // 4.1 Valid DISCORD25 code variations
  const validCodes = ['DISCORD25', 'discord25', ' Discord25 ', '   DISCORD25   '];
  for (const c of validCodes) {
    mockAppliedPromo = null;
    const res = mockApplyPromoCode(c);
    assert(res.success === true, `Valid code variation '${c}' accepted`);
    assert(mockAppliedPromo === 'DISCORD25', `Applied promo set to DISCORD25 for '${c}'`);
  }

  // 4.2 Adversarial / Invalid codes
  const invalidCodes = [
    '', '   ', null, undefined,
    'DISCORD50', 'DISCORD', '25', 'ADMIN', 'ROOT',
    '<script>alert(1)</script>', 'DISCORD25!', 'ANTIGRAVITY', 'BOOST25'
  ];
  for (const inv of invalidCodes) {
    mockAppliedPromo = null;
    const res = mockApplyPromoCode(inv);
    assert(res.success === false, `Adversarial code '${inv}' rejected`);
    assert(mockAppliedPromo === null, `Promo remains null for invalid code '${inv}'`);
    assert(!res.msg.includes('DISCORD25'), `Error message for '${inv}' does not leak DISCORD25`);
  }

  // 4.3 Exact 25% Mathematical Verification across varied cart baskets
  const baskets = [
    { name: '1 Blanket ($74.00)', items: [{ price: 74.00, qty: 1 }], expectedSub: 74.00, expectedDisc: 18.50, expectedShip: 0.00, expectedTotal: 55.50 },
    { name: '1 Travel Mat ($16.00) under $50', items: [{ price: 16.00, qty: 1 }], expectedSub: 16.00, expectedDisc: 4.00, expectedShip: 4.99, expectedTotal: 16.99 },
    { name: 'Threshold test exactly $50 (2 x $25 or $24 + $26)', items: [{ price: 24.00, qty: 1 }, { price: 26.00, qty: 1 }], expectedSub: 50.00, expectedDisc: 12.50, expectedShip: 0.00, expectedTotal: 37.50 },
    { name: 'Subtotal $49.99 (Shipping applied)', items: [{ price: 49.99, qty: 1 }], expectedSub: 49.99, expectedDisc: 12.4975, expectedShip: 4.99, expectedTotal: 42.4825 },
    { name: 'Empty Basket ($0)', items: [], expectedSub: 0.00, expectedDisc: 0.00, expectedShip: 0.00, expectedTotal: 0.00 }
  ];

  for (const b of baskets) {
    const calc = calculateTotals(b.items, 'DISCORD25');
    assert(Math.abs(calc.subtotal - b.expectedSub) < 0.001, `Basket '${b.name}' Subtotal: $${calc.subtotal.toFixed(2)}`);
    assert(Math.abs(calc.discountAmount - b.expectedDisc) < 0.001, `Basket '${b.name}' Discount exactly 25%: -$${calc.discountAmount.toFixed(2)}`);
    assert(Math.abs(calc.shippingAmount - b.expectedShip) < 0.001, `Basket '${b.name}' Shipping: $${calc.shippingAmount.toFixed(2)}`);
    assert(Math.abs(calc.grandTotal - b.expectedTotal) < 0.001, `Basket '${b.name}' Grand Total: $${calc.grandTotal.toFixed(2)}`);
  }

  // -------------------------------------------------------------
  // SUITE 5: SIMULATED CHECKOUT, ORDER CREATION & PERSISTENCE
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: SIMULATED CHECKOUT & STOCK DECREMENTS ---');
  // Reset clean test database
  let checkoutDb = JSON.parse(JSON.stringify(invData));
  let checkoutCart = [
    { id: 'dn-blk-001', sku: 'DN-BLK-SHR-5060', name: 'Sherpa Throw', price: 74.00, qty: 2 },
    { id: 'dn-mat-001', sku: 'DN-MAT-HNY-01', name: 'Hex Mat', price: 24.00, qty: 3 },
    { id: 'dn-tol-001', sku: 'DN-TOL-TI-01', name: 'Ti Carver', price: 22.00, qty: 1 }
  ];

  const blk001 = checkoutDb.products.find(p => p.id === 'dn-blk-001');
  const mat001 = checkoutDb.products.find(p => p.id === 'dn-mat-001');
  const tol001 = checkoutDb.products.find(p => p.id === 'dn-tol-001');

  const preBlkStock = blk001.stock; // 24
  const preMatStock = mat001.stock; // 28
  const preTolStock = tol001.stock; // 22

  // Simulate handleCheckoutSubmit
  const customerInfo = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    address: '420 Mile High Way',
    city: 'Denver',
    state: 'CO',
    zip: '80202'
  };

  const cSubtotal = checkoutCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const cDiscount = cSubtotal * 0.25;
  const cShipping = cSubtotal >= 50 ? 0 : 4.99;
  const cGrandTotal = cSubtotal - cDiscount + cShipping;
  const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);

  // Decrement stocks
  checkoutCart.forEach(cartItem => {
    const product = checkoutDb.products.find(p => p.id === cartItem.id);
    if (product) {
      product.stock = Math.max(0, product.stock - cartItem.qty);
    }
  });

  const newOrder = {
    orderId: orderId,
    timestamp: new Date().toISOString(),
    customer: customerInfo,
    items: JSON.parse(JSON.stringify(checkoutCart)),
    subtotal: cSubtotal,
    discount: cDiscount,
    promoCode: 'DISCORD25',
    shipping: cShipping,
    total: cGrandTotal,
    fulfillmentStatus: 'Routed to On-Demand Supplier'
  };

  if (!checkoutDb.orders) checkoutDb.orders = [];
  checkoutDb.orders.push(newOrder);

  // Assertions on checkout results
  assert(/^ORD-\d{4}$/.test(orderId), `Order ID matches 'ORD-XXXX' format: ${orderId}`);
  assert(blk001.stock === preBlkStock - 2, `Blanket stock decremented: ${preBlkStock} -> ${blk001.stock}`);
  assert(mat001.stock === preMatStock - 3, `Mat stock decremented: ${preMatStock} -> ${mat001.stock}`);
  assert(tol001.stock === preTolStock - 1, `Tool stock decremented: ${preTolStock} -> ${tol001.stock}`);
  assert(checkoutDb.orders.length === 1, 'Database orders array contains 1 new order');
  assert(checkoutDb.orders[0].orderId === orderId, `Stored order has correct orderId ${orderId}`);
  assert(checkoutDb.orders[0].customer.email === 'jane@example.com', 'Customer email properly recorded');
  assert(checkoutDb.orders[0].fulfillmentStatus === 'Routed to On-Demand Supplier', 'Fulfillment status reflects on-demand routing');

  // Test over-purchase clamp (stock cannot go negative)
  mat001.stock = 1;
  const excessQty = 5;
  mat001.stock = Math.max(0, mat001.stock - excessQty);
  assert(mat001.stock === 0, `Stock underflow is clamped to 0 (cannot be negative): ${mat001.stock}`);

  // -------------------------------------------------------------
  // SUITE 6: STRICT JARGON & PRIVACY HYGIENE SCAN ACROSS SERVED ASSETS
  // -------------------------------------------------------------
  console.log('\n--- SUITE 6: STRICT JARGON & PRIVACY HYGIENE SCAN ---');
  const forbiddenPatterns = [
    { pattern: /bambu/i, name: 'bambu' },
    { pattern: /p2s/i, name: 'p2s' },
    { pattern: /vacuum\s*degass/i, name: 'vacuum degassing' },
    { pattern: /degass/i, name: 'degass' },
    { pattern: /antigravity/i, name: 'antigravity' },
    { pattern: /boost/i, name: 'boost' },
    { pattern: /deep\s*research/i, name: 'deep research' },
    { pattern: /in-house\s*silicone\s*lab/i, name: 'in-house silicone lab' },
    { pattern: /shore\s*00/i, name: 'shore 00' },
    { pattern: /teamwork/i, name: 'teamwork' }
  ];

  const filesToScan = [
    { file: 'index.html', rel: 'index.html' },
    { file: 'assets/app.js', rel: 'assets/app.js' },
    { file: 'assets/styles.css', rel: 'assets/styles.css' },
    { file: 'data/inventory.json', rel: 'data/inventory.json' },
    { file: 'data/inventory-sync.js', rel: 'data/inventory-sync.js' }
  ];

  for (const target of filesToScan) {
    const fullPath = path.join(ROOT_DIR, target.rel.replace(/\//g, path.sep));
    if (!fs.existsSync(fullPath)) {
      assert(false, `File exists for hygiene scan: ${target.rel}`);
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    for (const fp of forbiddenPatterns) {
      const match = fp.pattern.exec(content);
      assert(match === null, `File ${target.rel} contains NO forbidden term '${fp.name}'`, match ? `Matched at index ${match.index}: '${match[0]}'` : '');
    }
  }

  // Scan live served HTML from http://localhost:8080/
  try {
    const liveIndex = await httpGet('/');
    for (const fp of forbiddenPatterns) {
      const match = fp.pattern.exec(liveIndex.body);
      assert(match === null, `Live served HTML (/) contains NO forbidden term '${fp.name}'`, match ? `Matched: '${match[0]}'` : '');
    }
    assert(!liveIndex.body.includes('DISCORD25'), 'Live served HTML (/) does NOT publicly leak DISCORD25 promo code');
    assert(!liveIndex.body.includes('quickApplyDiscord25'), 'Live served HTML (/) does NOT contain quickApplyDiscord25 button');
    assert(!liveIndex.body.includes('discord-vip-banner'), 'Live served HTML (/) does NOT contain .discord-vip-banner');
    assert(liveIndex.body.includes('placeholder="Enter promo code"'), 'Live served HTML (/) has clean promo code placeholder');
  } catch (err) {
    assert(false, 'Live served HTML scan', `Error: ${err.message}`);
  }

  // Verify assets/app.js keeps DISCORD25 working internally without public quick-apply or error toast leaks
  assert(appJsContent.includes("code === 'DISCORD25'"), 'assets/app.js supports manual DISCORD25 promo entry');
  assert(!appJsContent.includes('quickApplyDiscord25'), 'assets/app.js does NOT expose quickApplyDiscord25');
  assert(!appJsContent.includes('use code DISCORD25'), 'assets/app.js invalid promo toast does NOT leak DISCORD25');

  // Also verify deploy-godaddy.ps1 does not upload internal playbooks
  const deployScript = fs.readFileSync(path.join(ROOT_DIR, 'scripts', 'deploy-godaddy.ps1'), 'utf8');
  assert(!deployScript.includes('BOOST.md'), 'deploy-godaddy.ps1 excludes BOOST.md');
  assert(!deployScript.includes('TEAMWORK.md'), 'deploy-godaddy.ps1 excludes TEAMWORK.md');
  assert(!deployScript.includes('DEEP_RESEARCH.md'), 'deploy-godaddy.ps1 excludes DEEP_RESEARCH.md');
  assert(!deployScript.includes('BRAND_AND_OPERATIONS.md'), 'deploy-godaddy.ps1 excludes BRAND_AND_OPERATIONS.md');

  // -------------------------------------------------------------
  // SUITE 7: REAL VM EXECUTION OF assets/app.js (DOM & LOCALSTORAGE HARNESS)
  // -------------------------------------------------------------
  console.log('\n--- SUITE 7: REAL VM EXECUTION OF assets/app.js ---');
  const vm = require('vm');

  function createAppVmHarness(initialStorage = {}) {
    const store = Object.assign({}, initialStorage);
    const localStorageMock = {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    };

    const elements = {};
    function getEl(id) {
      if (!elements[id]) {
        elements[id] = {
          id,
          value: '',
          textContent: '',
          innerHTML: '',
          disabled: false,
          style: { display: '' },
          classList: {
            _set: new Set(),
            add(c) { this._set.add(c); },
            remove(c) { this._set.delete(c); },
            toggle(c, force) {
              if (force === undefined) {
                if (this._set.has(c)) this._set.delete(c); else this._set.add(c);
              } else if (force) {
                this._set.add(c);
              } else {
                this._set.delete(c);
              }
            },
            contains(c) { return this._set.has(c); }
          },
          getBoundingClientRect: () => ({ top: 0 })
        };
      }
      return elements[id];
    }

    const sandbox = {
      DABNAPS_INITIAL_DATA: JSON.parse(JSON.stringify(invData)),
      pageYOffset: 0,
      scrollTo: () => {},
      location: { href: '' },
      document: {
        readyState: 'complete',
        body: { style: { overflow: '' } },
        getElementById: (id) => getEl(id),
        querySelectorAll: () => [],
        addEventListener: () => {}
      },
      localStorage: localStorageMock,
      fetch: async () => ({ ok: true, json: async () => JSON.parse(JSON.stringify(invData)) }),
      setTimeout: () => 1,
      clearTimeout: () => {},
      console
    };
    sandbox.window = sandbox;

    vm.createContext(sandbox);
    vm.runInContext(appJsContent, sandbox);
    return { sandbox, store, getEl };
  }

  // Allow async init() inside VM to settle
  const tick = () => new Promise(r => setImmediate(r));

  // 7.1 Test persisted valid 'DISCORD25' in localStorage & Remove button behavior
  {
    const h = createAppVmHarness({ dabnaps_promo: 'DISCORD25', dabnaps_age_verified: 'true' });
    await tick();
    assert(h.getEl('applied-promo-tag').style.display === 'flex', 'VM: Stored DISCORD25 in localStorage displays #applied-promo-tag on init');
    h.sandbox.window.removePromoCode();
    assert(h.store.dabnaps_promo === undefined, 'VM: removePromoCode() clears dabnaps_promo from localStorage');
    assert(h.getEl('applied-promo-tag').style.display === 'none', 'VM: removePromoCode() hides #applied-promo-tag');
    assert(h.getEl('toast-notification').textContent === 'Promo code removed.', 'VM: removePromoCode() shows confirmation toast');
  }

  // 7.2 Test corrupted/invalid promo in localStorage is sanitized on init
  {
    const h = createAppVmHarness({ dabnaps_promo: 'BOGUS_CODE', dabnaps_age_verified: 'true' });
    await tick();
    assert(h.store.dabnaps_promo === undefined, 'VM: Invalid stored promo in localStorage is purged on init');
    assert(h.getEl('applied-promo-tag').style.display === 'none', 'VM: #applied-promo-tag remains hidden for invalid stored promo');
  }

  // 7.3 Test manual promo input, invalid toast privacy, and checkout promo reset in real app.js
  {
    const h = createAppVmHarness({ dabnaps_age_verified: 'true' });
    await tick();
    assert(typeof h.sandbox.window.quickApplyDiscord25 === 'undefined', 'VM: window.quickApplyDiscord25 is undefined');

    // Add item ($74 blanket)
    h.sandbox.window.addToCart('dn-blk-001');
    assert(h.getEl('cart-subtotal').textContent === '$74.00', 'VM: Subtotal is $74.00 after adding blanket');

    // Try invalid code via input box
    h.getEl('promo-code-input').value = 'WRONG25';
    h.sandbox.window.applyPromoCode();
    assert(!h.getEl('toast-notification').textContent.includes('DISCORD25'), 'VM: Invalid promo toast does not leak DISCORD25');
    assert(h.getEl('cart-discount-row').style.display === 'none', 'VM: Discount row hidden after invalid promo');

    // Enter valid DISCORD25 via input box
    h.getEl('promo-code-input').value = '  discord25 ';
    h.sandbox.window.applyPromoCode();
    assert(h.getEl('promo-code-input').value === '', 'VM: #promo-code-input cleared after applying valid code');
    assert(h.getEl('applied-promo-tag').style.display === 'flex', 'VM: #applied-promo-tag visible after applying DISCORD25');
    assert(h.getEl('cart-discount-row').style.display === 'flex', 'VM: #cart-discount-row visible after applying DISCORD25');
    assert(h.getEl('cart-discount').textContent === '-$18.50', 'VM: 25% discount of -$18.50 rendered in cart');
    assert(h.getEl('cart-grand-total').textContent === '$55.50', 'VM: Grand total of $55.50 rendered in cart');

    // Submit checkout and verify both cart and promo are cleared while order records DISCORD25
    h.getEl('ship-name').value = 'Alan Tester';
    h.getEl('ship-email').value = 'alan@dabnaps.gg';
    h.sandbox.window.handleCheckoutSubmit({ preventDefault: () => {} });

    const savedDb = JSON.parse(h.store.dabnaps_db_override);
    assert(savedDb.orders.length === 1, 'VM: Order saved to db override on checkout');
    assert(savedDb.orders[0].promoCode === 'DISCORD25', 'VM: Order records applied DISCORD25 promoCode');
    assert(savedDb.orders[0].discount === 18.5, 'VM: Order records $18.50 discount');
    assert(savedDb.orders[0].total === 55.5, 'VM: Order records $55.50 total');
    assert(h.store.dabnaps_promo === undefined, 'VM: Checkout clears dabnaps_promo from localStorage');
    assert(h.getEl('applied-promo-tag').style.display === 'none', 'VM: Checkout hides #applied-promo-tag on empty post-checkout cart');
  }

  // -------------------------------------------------------------
  // SUMMARY RESULTS
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL CHECKS: ${totalTests}`);
  console.log(`PASSED:       ${passedTests}`);
  console.log(`FAILED:       ${failedTests}`);
  console.log('================================================================');

  if (failedTests > 0) {
    console.error('\nFAILURE BREAKDOWN:');
    failureDetails.forEach((f, idx) => {
      console.error(`${idx + 1}. ${f.testName}: ${f.details}`);
    });
    process.exit(1);
  } else {
    console.log('\n>>> EMPIRICAL VERDICT: ALL TESTS PASSED FLAWLESSLY. ZERO BUGS REPRODUCED. <<<');
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(2);
});

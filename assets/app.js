// Dabnaps.gg Official Website & 100% In-House Self-Made Studio Application (Zero Retail Storefront)
(function () {
  let db = window.DABNAPS_INITIAL_DATA || { company: {}, products: [], inHouseProductionBatches: [], orders: [], activityLog: [] };
  let activeView = 'studio'; // 'studio' | 'lab' | 'research'

  function init() {
    // Clear any stale cached e-commerce overrides from previous versions
    localStorage.removeItem('dabnaps_db_override');
    checkAgeGate();
    renderInHouseLab();
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
      if (modal) modal.classList.remove('open');
      showToast('Welcome to dabnaps.gg — 100% In-House Self-Made Studio.');
    } else {
      alert('You must be 21+ to browse dabnaps.gg.');
    }
  };

  window.switchView = function (viewName) {
    activeView = viewName;
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });
    const studioEl = document.getElementById('view-studio');
    const labEl = document.getElementById('view-lab');
    const researchEl = document.getElementById('view-research');
    if (studioEl) studioEl.style.display = viewName === 'studio' ? 'block' : 'none';
    if (labEl) labEl.style.display = viewName === 'lab' ? 'block' : 'none';
    if (researchEl) researchEl.style.display = viewName === 'research' ? 'block' : 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderInHouseLab();
  };

  function renderInHouseLab() {
    const batchTable = document.getElementById('lab-batches-tbody');
    if (!batchTable) return;

    const batches = db.inHouseProductionBatches || [];
    batchTable.innerHTML = batches.map(b => `
      <tr>
        <td><strong>${b.batchId}</strong></td>
        <td><strong>${b.processName || b.productName || ''}</strong></td>
        <td><span class="cat-pill active" style="padding:4px 12px; font-size:0.76rem;">${b.stage}</span></td>
        <td style="font-size:0.84rem;">${b.equipment || ''}</td>
        <td style="font-size:0.84rem;">${b.materialSpec || b.siliconeLot || ''}</td>
        <td style="font-size:0.84rem; color:var(--muted-gold);">${b.colorwaySpec || b.pigmentMix || ''}</td>
        <td style="font-size:0.82rem; color:var(--mocha);">${b.notes}</td>
      </tr>
    `).join('');
  }

  let toastTimer = null;
  function showToast(msg) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

# 🤝 DABNAPS (`dabnaps.gg`) — `/teamwork` Multi-Agent Execution Plan

**Domain:** [`https://dabnaps.gg`](https://dabnaps.gg)  
**Companion Master File:** [`DABNAPS_BOOST_TEAMWORK_DEEP_RESEARCH.md`](./DABNAPS_BOOST_TEAMWORK_DEEP_RESEARCH.md)

---

## 1. Autonomous Team Structure

| Agent Role | Scope & Files Owned | Primary Objective |
| :--- | :--- | :--- |
| **1. Brand & Web UI Lead** | `index.html`, `assets/styles.css`, `assets/app.js`, `assets/images/logos/` | Present the official `dabnaps.gg` website with **zero products for sale**—focusing 100% on the Golden Hour `.gg` aesthetic, our self-made philosophy, interactive R&D lab views, and brand assets. |
| **2. In-House Fabrication & CAD Lead** | `BRAND_AND_OPERATIONS.md`, `data/inventory.json`, `data/inventory-sync.js` | Enforce the **100% In-House Self-Made Rule**: document only what we fabricate ourselves using our **Platinum Silicone Casting Lab** and **2× Bambu Lab P2S Combo** farm (`PETG-CF`, `PAHT-CF`, `PLA+`, `TPU 95A HF`, `TPU 68D`). |
| **3. Deep Research & Strategy Lead** | `DABNAPS_BOOST_TEAMWORK_DEEP_RESEARCH.md`, `DEEP_RESEARCH.md`, `BOOST.md`, `GEMINI.md`, `README.md` | Author and maintain the strategic research on `.gg` gaming/lounge culture, hybrid 3D-printed mold + silicone casting workflows, and zero-inventory brand architecture. |
| **4. GitHub Pages & Domain Ops Lead** | `CNAME`, `.gitignore`, `scripts/deploy-godaddy.ps1` | Maintain automated Git commits to `AlanMusselman/dabnaps`, verify public GitHub Pages deployment on `main` (`/`), and bind `dabnaps.gg`. |

---

## 2. Teamwork Coordination Protocol
1. **Strict Gatekeeping Against Retail/Outsourced Creep**:
   - Before any UI section, image, or markdown document is committed, the **In-House Fabrication Lead** verifies that zero third-party/outsourced items (blankets, glass rigs, imported tools, apparel) and zero retail checkout elements appear.
2. **Synchronized Static & Data State**:
   - Any update to R&D lab fabrication logs in `data/inventory.json` is immediately mirrored to `data/inventory-sync.js` so `index.html` works seamlessly both on static GitHub Pages (`https://dabnaps.gg`) and locally (`file://`).
3. **Continuous Live Verification**:
   - Every commit pushed to `origin/main` on `AlanMusselman/dabnaps` is verified via `gh api repos/AlanMusselman/dabnaps/pages` to confirm a clean live build.

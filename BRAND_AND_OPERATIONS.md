# 🍯 DABNAPS — Brand Book, In-House Silicone SOP & AI Store Playbook

**Tagline:** *Where Concentrates Culture Meets Cloud-Nine Comfort.*  
**Aesthetic:** Radiant Dab Honey Gold, Deep Caramel Leaf Bronze & Sleek Obsidian Black

---

## 1. Brand Identity & Color System (From Reference Medallion)

Dabnaps pairs the rich, unmistakable glow of golden honey concentrates and botanical leaf heritage with ultra-plush lounge comfort.

| Swatch Name | Hex Code | Usage |
| :--- | :--- | :--- |
| **Radiant Dab Gold** | `#FFD23F` | Highlights, logo medallion rim glow, active badges, pricing |
| **Honey Wax Amber** | `#FFB800` | Primary brand color, buttons, silicone tray primary pigment |
| **Caramel Leaf Bronze** | `#8C5300` | Botanical leaf emblem silhouette, announcement bar, warm shading |
| **Roasted Amber Dark** | `#5C3500` | Deep gradient accents, recessed tray borders |
| **Obsidian Black** | `#0A0A0A` | Primary storefront background, 300 GSM heavyweight tee base |
| **Charcoal Lounge** | `#1C1A17` | Product cards, admin panels, modal surfaces |
| **Warm Cream Highlight** | `#FFFDF7` | High-contrast body typography |

### Typography
- **Display / Headings:** *Fraunces* (Warm, organic serif that echoes golden honey drops and soft clouds)
- **Body / UI / Specs:** *Plus Jakarta Sans* (Crisp legibility against dark obsidian surfaces)

### Official Multi-Size Logo Asset Suite (`assets/images/logos/`)
All logo variants are generated from the single master Golden Leaf & Sleeping Cloud Medallion to ensure 100% geometric and color consistency across UI badges, favicons, print, and social cards:

| Logo Variant | File Path(s) | Resolutions / Sizes | Usage |
| :--- | :--- | :--- | :--- |
| **Medallion Icon (Transparent 1:1)** | `assets/images/logo-icon.png`<br>`assets/images/logos/dabnaps-icon-{size}.png` | `1024×1024`, `512×512`, `256×256`, `192×192`, `180×180`, `128×128`, `96×96`, `64×64`, `48×48`, `32×32`, `16×16` | Navbar circular badge, Age Gate emblem, Footer badge, PWA & Apple Touch icons |
| **Multi-Resolution Favicon** | `favicon.ico`<br>`assets/images/logos/favicon.ico` | Embedded `16×16`, `32×32`, `48×48`, `64×64` | Browser tab & bookmark icon |
| **Full Vertical Lockup (Transparent)** | `assets/images/logos/dabnaps-logo-full-transparent-{size}.png` | `1024×1024`, `512×512`, `256×256`, `128×128`, `64×64` | Merch mockups, dark/textured overlays, packaging |
| **Full Vertical Lockup (Obsidian Dark)** | `assets/images/logo.png`<br>`assets/images/logos/dabnaps-logo-full-dark-{size}.png` | `1024×1024`, `512×512`, `256×256`, `128×128`, `64×64` | Master square brand mark on `#0A0A0A` Obsidian background |
| **Horizontal Header Lockup** | `assets/images/logos/dabnaps-logo-horizontal-{size}.png`<br>`assets/images/logos/dabnaps-logo-horizontal-dark-{size}.png` | `1200×360`, `600×180`, `300×90` | Wide headers, email signatures, invoices, packing slips |
| **Wordmark Only (Transparent)** | `assets/images/logos/dabnaps-wordmark-{size}.png` | `800×160`, `400×80` | Standalone golden `DABNAPS` typography |
| **Social / OpenGraph Banner** | `assets/images/logos/dabnaps-social-og-1200x630.png` | `1200×630` | Link previews (iMessage, Discord, X, Facebook) |

---

## 2. In-House Silicone Dab Tray Manufacturing SOP

Developing our silicone dab trays in-house gives Dabnaps full control over our signature **Honey Gold, Caramel Bronze & Obsidian** swirl, heat resistance, durometer softness, and unit margins (~78% gross margin).

### Material Specification
- **Base Polymer:** Two-Part (1:1 Mix Ratio) **Platinum-Cured Liquid Silicone Rubber (LSR)** — Shore 45A to 60A.
- **Compliance:** FDA 21 CFR 177.2600 Food/Medical Grade, BPA/BPS-free, zero peroxide by-products, odorless.
- **Thermal Rating:** Continuous service up to **500°F (260°C)** — safe for warm quartz bangers, terp pearls, and directional carb caps.
- **Chemical Resistance:** 100% resistant to **99% Isopropyl Alcohol** cleaning soaks without swelling or pigment bleed.

### 5-Step In-House Production Workflow
1. **CNC Mold Prep (`MOLD-AL6061`):** Clean bead-blasted 6061 aluminum molds (with our embossed botanical leaf & cloud center mat) using isopropyl alcohol; pre-warm mold to 120°F.
2. **Batch Weighing & Golden Pigment Swirl:** Weigh Part A & Part B (1:1 by weight). Mix base shade (**3% Honey Gold `#FFB800`**), and fold in **1.5% Caramel Bronze `#8C5300`** and **Obsidian Carbon Black** for the signature Dabnaps golden concentrate swirl.
3. **Vacuum Degassing:** Place mixed silicone in vacuum chamber at **29 inHg for 6–8 minutes** until air bubbles completely collapse.
4. **Pour & Primary Cure:** Pour steadily from a single corner to vent air. Cure in heated press/oven at **175°F for 45 minutes**.
5. **Post-Cure & QC Serialization:** Demold, trim any flash, and bake in a **Post-Cure Convection Oven at 392°F (200°C) for 4 hours** to lock in Shore 50A hardness and 500°F thermal stability. Log batch into `data/inventory.json`.

---

## 3. Product Lineup & SKU Architecture

All SKUs follow the format `DN-[CATEGORY]-[MODEL]-[COLOR/SIZE]`:

1. **In-House Silicone Trays (`DN-SIL-...`)**
   - `DN-SIL-CL9-GLD`: *Cloud Nine In-House Silicone Dab Tray (Honey Gold, Caramel & Obsidian Swirl)* ($44 Retail / $9.50 COGS)
   - `DN-SIL-MINI-AMB`: *Naptime Pocket Silicone Mat & Tool Rest (Radiant Dab Gold & Caramel Leaf)* ($24 Retail / $4.20 COGS)
   - `DN-SIL-STN-OBS`: *Slumber Station XL Modular Silicone Organizer (Obsidian Black & 24K Honey Gold)* ($68 Retail / $14.80 COGS)
2. **Artisan Dab Rigs (`DN-GLS-...`)**
   - `DN-GLS-DMW-GLD`: *The Dreamweaver Golden Amber Mini Rig* ($135 Retail / $42.00 COGS)
   - `DN-GLS-NIM-02`: *Nimbus Honey-Vortex Recycler Rig* ($185 Retail / $64.00 COGS)
3. **Cozy Apparel (`DN-TEE-...`)**
   - `DN-TEE-GLD-BLK-L`: *Dabnaps Heavyweight Golden Emblem Tee (300 GSM Jet Black & Gold)* ($38 Retail / $11.20 COGS)
4. **Cloud Lounge Blankets (`DN-BLK-...`)**
   - `DN-BLK-FLF-GLD`: *Dabnaps Ultra-Fluffy Golden Cloud Throw Blanket (650 GSM Sherpa)* ($78 Retail / $22.50 COGS)
5. **Bundles (`DN-BUN-...`)**
   - `DN-BUN-GOLD-01`: *The Ultimate Dab & Nap Golden Edition Bundle* ($245 Retail / $78.00 COGS)

---

## 4. How to Maintain the Store & Inventory with Antigravity

Your store is backed by `data/inventory.json` and automatically synced to `data/inventory-sync.js`.

### Option A: Ask Antigravity in Chat
Whenever you pour a new batch of golden silicone trays, receive a shipment of blankets, or want to change prices, just tell me in chat:
- *"Check our current inventory status and low-stock alerts."*
- *"We just finished curing 30 units of the Naptime Pocket Silicone Mat (`DN-SIL-MINI-AMB`), add them to stock."*
- *"Change the price of the Fluffy Blanket to $82."*

### Option B: Run the CLI Directly
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\manage-inventory.ps1 -Action status
powershell -ExecutionPolicy Bypass -File .\scripts\manage-inventory.ps1 -Action low-stock
powershell -ExecutionPolicy Bypass -File .\scripts\manage-inventory.ps1 -Action restock -Sku "DN-SIL-CL9-GLD" -Delta 25 -Note "Batch #2 cured"
```

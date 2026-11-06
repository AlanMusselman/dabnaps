# Workspace Rules: Dabnaps LLC (`dabnaps.gg` — Brand Website & 100% In-House Maker Studio)

You are acting as **Principal Brand Technologist, In-House Additive/Silicone Manufacturing Engineer, and Full-Stack Web Architect** for **Alan Musselman** (**Dabnaps LLC**, official domain: **`dabnaps.gg`**).

## 1. Core Mandate & Non-Negotiable Rules
1. **Website Only — Zero Products Listed for Sale**:
   - **NEVER** put retail products, price tags, shopping carts ("Cloud Bag"), or checkout forms up on `dabnaps.gg` ("don't put any products up there on DabNaps, just put up the website").
   - Keep `products: []` and `orders: []` empty in `data/inventory.json` and `data/inventory-sync.js`.
2. **100% In-House Self-Made Creations Only**:
   - Only showcase or prototype items that Alan can make **100% in-house** using our own equipment:
     - **In-House Platinum Silicone Casting Lab**: Shore 45A–60A Platinum-Cured Liquid Silicone Rubber (`29 inHg` vacuum degassed, `500°F` thermal rating) poured into our own 3D-printed or milled molds.
     - **In-House 2× Bambu Lab P2S Combo Farm**: `Bambu PETG-CF` (Slot 1), `Bambu PAHT-CF` (Slot 2), `eSUN PLA+ / Bambu PLA Tough` (Slot 3), `Bambu TPU for AMS 68D` (Slot 4), and `Bambu TPU 95A HF` (P2S #2 External Dryer Port).
     - **In-House CAD & Web Engineering**: Custom SVG blueprints, interactive web tools, and digital brand experiences.
   - **Never re-introduce outsourced/third-party products** (no cut-and-sew blankets, no glass dab rigs, no imported USB-C hot-knives or titanium tool kits, no t-shirts/apparel).
3. **Official Palette & Typography**:
   - Radiant Dab Gold (`#FFD23F`), Honey Wax Amber (`#FFB800`), Caramel Leaf Bronze (`#8C5300`), and Obsidian Black (`#0A0A0A`) with *Fraunces* and *Plus Jakarta Sans* fonts.

## 2. Security & Deployment Rules
- **GitHub Pages & GoDaddy Parity**: Keep `CNAME` (`dabnaps.gg`) in the repository root and deploy cleanly to `https://github.com/AlanMusselman/dabnaps` (`main` branch `/`).
- **Credential Safety**: Never commit `.godaddy-ftp.json` or private keys to version control.

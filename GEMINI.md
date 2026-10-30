# Workspace Rules: Dabnaps LLC (E-Commerce Storefront, Silicone Lab & Inventory)

You are acting as **Full-Stack E-Commerce Architect, Brand Technologist, and Manufacturing Operations Engineer** for **Alan Musselman** (**Dabnaps LLC**).

## 1. Brand & Product Standards
- **Official Palette**: Radiant Dab Gold (`#FFD23F`), Honey Wax Amber (`#FFB800`), Caramel Leaf Bronze (`#8C5300`), and Obsidian Black (`#0A0A0A`). Do not re-introduce legacy "sage/terracotta/oatmeal" copy or retired SKU codes (`DN-SIL-MINI-TER`).
- **Core SKUs (`data/inventory.json`)**: In-house platinum-cured liquid silicone rubber (LSR) dab mats/trays (`DN-SIL-CL9-GLD`, `DN-SIL-MINI-AMB`, `DN-SIL-STN-OBS`), artisan borosilicate rigs, heavyweight apparel, and bundles.

## 2. Security, Checkout & Deployment Rules
- **Admin & API Security**: Never expose unauthenticated full-file write endpoints in `api.php` or un-gated wholesale COGS/margin controls to public storefront visitors. Always protect admin inventory mutations behind authentication and server-side validation.
- **Credential Safety**: Never commit `.godaddy-ftp.json` or live payment API keys to version control. Keep `data/inventory.json` and `data/inventory-sync.js` synchronized via `scripts/manage-inventory.ps1`.

/**
 * Seed script — creates a test account with 2 years of realistic sales data.
 *
 * Usage:  node apps/api/src/scripts/seed.js
 *
 * Creates:
 *   - 1 user  (test@metrik.app / password123)
 *   - 1 business (Metrik Demo Pvt Ltd)
 *   - 26 default CoA accounts (auto-seeded)
 *   - 5 item groups
 *   - 20 items (finished goods, raw materials, packaging)
 *   - 4 material centres
 *   - 10 parties (6 customers, 4 vendors)
 *   - ~700 sales invoices spread over 2 FYs
 *   - ~250 purchase invoices
 *   - ~120 receipts  (payments from customers)
 *   - ~80  payments  (payments to vendors)
 */

import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { register } from '../modules/auth/auth.service.js';
import { createBusiness } from '../modules/business/business.service.js';
import { createParty } from '../modules/party/party.service.js';
import { createMC } from '../modules/material-centre/materialCentre.service.js';
import { createItemGroup } from '../modules/item/item.service.js';
import { createItem } from '../modules/item/item.service.js';
import { registerAllHandlers } from '../modules/voucher/handlers/index.js';
import { create as createVoucher } from '../engines/voucher.engine.js';
import Account from '../modules/account/account.model.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function progressBar(current, total, label) {
  const pct = Math.round((current / total) * 100);
  const filled = Math.round(pct / 5);
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
  process.stdout.write(`\r  ${bar} ${pct}% ${label} (${current}/${total})`);
  if (current === total) process.stdout.write('\n');
}

// ── data definitions ─────────────────────────────────────────────────────────

const ITEM_GROUPS = [
  { name: 'Finished Goods', code: 'FG', type: 'finished_good' },
  { name: 'Raw Materials', code: 'RM', type: 'raw_material' },
  { name: 'Packaging', code: 'PKG', type: 'packaging' },
  { name: 'Semi Finished', code: 'SF', type: 'semi_finished' },
  { name: 'Consumables', code: 'CON', type: 'consumable' },
];

const FINISHED_GOODS = [
  { name: 'Premium Basmati Rice 5kg', sku: 'FG-001', unit: 'pcs', gstRate: 5, salesPrice: 450 },
  { name: 'Premium Basmati Rice 10kg', sku: 'FG-002', unit: 'pcs', gstRate: 5, salesPrice: 850 },
  { name: 'Classic Basmati Rice 5kg', sku: 'FG-003', unit: 'pcs', gstRate: 5, salesPrice: 320 },
  { name: 'Classic Basmati Rice 10kg', sku: 'FG-004', unit: 'pcs', gstRate: 5, salesPrice: 600 },
  { name: 'Brown Rice 1kg', sku: 'FG-005', unit: 'pcs', gstRate: 5, salesPrice: 180 },
  { name: 'Sona Masoori Rice 5kg', sku: 'FG-006', unit: 'pcs', gstRate: 5, salesPrice: 280 },
  { name: 'Kolam Rice 5kg', sku: 'FG-007', unit: 'pcs', gstRate: 5, salesPrice: 240 },
  { name: 'Puffed Rice 500g', sku: 'FG-008', unit: 'pcs', gstRate: 12, salesPrice: 60 },
];

const RAW_MATERIALS = [
  { name: 'Paddy Basmati Grade A', sku: 'RM-001', unit: 'kg', gstRate: 0, salesPrice: 0 },
  { name: 'Paddy Basmati Grade B', sku: 'RM-002', unit: 'kg', gstRate: 0, salesPrice: 0 },
  { name: 'Paddy Sona Masoori', sku: 'RM-003', unit: 'kg', gstRate: 0, salesPrice: 0 },
  { name: 'Paddy Kolam', sku: 'RM-004', unit: 'kg', gstRate: 0, salesPrice: 0 },
  { name: 'Paddy Brown Rice', sku: 'RM-005', unit: 'kg', gstRate: 0, salesPrice: 0 },
  { name: 'Rice Bran Oil (processing)', sku: 'RM-006', unit: 'ltr', gstRate: 5, salesPrice: 0 },
];

const PACKAGING = [
  { name: '5kg PP Bag - Premium', sku: 'PKG-001', unit: 'pcs', gstRate: 18, salesPrice: 0 },
  { name: '10kg PP Bag - Premium', sku: 'PKG-002', unit: 'pcs', gstRate: 18, salesPrice: 0 },
  { name: '5kg PP Bag - Classic', sku: 'PKG-003', unit: 'pcs', gstRate: 18, salesPrice: 0 },
  { name: '1kg Pouch', sku: 'PKG-004', unit: 'pcs', gstRate: 18, salesPrice: 0 },
  { name: 'Corrugated Box (20 units)', sku: 'PKG-005', unit: 'pcs', gstRate: 18, salesPrice: 0 },
  { name: '500g Pouch', sku: 'PKG-006', unit: 'pcs', gstRate: 18, salesPrice: 0 },
];

const MATERIAL_CENTRES = [
  { name: 'Main Factory', code: 'MF', type: 'factory', isDefault: true },
  { name: 'City Godown', code: 'CG', type: 'godown' },
  { name: 'Retail Shop', code: 'RS', type: 'shop' },
  { name: 'Cold Storage', code: 'CS', type: 'godown' },
];

const CUSTOMERS = [
  { name: 'Reliance Fresh', phone: '9876543210', gstin: '27AABCR1234A1Z5', city: 'Mumbai' },
  { name: 'DMart Ready', phone: '9876543211', gstin: '27AABCD5678B2Z3', city: 'Pune' },
  { name: 'BigBasket', phone: '9876543212', gstin: '29AABCB9012C3Z1', city: 'Bangalore' },
  { name: 'Star Bazaar', phone: '9876543213', gstin: '27AABCS3456D4Z9', city: 'Mumbai' },
  { name: 'Spencers', phone: '9876543214', gstin: '33AABCS7890E5Z7', city: 'Chennai' },
  { name: 'More Supermarket', phone: '9876543215', gstin: '27AABCM2345F6Z5', city: 'Nagpur' },
];

const VENDORS = [
  { name: 'Punjab Paddy Traders', phone: '9812345670', gstin: '03AABCP1234G1Z3', city: 'Amritsar' },
  { name: 'AP Rice Mills', phone: '9812345671', gstin: '37AABCA5678H2Z1', city: 'Guntur' },
  { name: 'Haryana Agro Supplies', phone: '9812345672', gstin: '06AABCH9012I3Z9', city: 'Karnal' },
  { name: 'Surat Packaging Co.', phone: '9812345673', gstin: '24AABCS3456J4Z7', city: 'Surat' },
];

// ── main ─────────────────────────────────────────────────────────────────────

async function seed() {
  await connectDB();
  registerAllHandlers();

  console.log('\n🌱 Seeding Metrik Demo Data\n');

  // ── 1. User ────────────────────────────────────────────────────────────────
  console.log('  Creating user...');
  let user;
  try {
    const result = await register({
      name: 'Demo User',
      email: 'test@metrik.app',
      password: 'password123',
      phone: '9999999999',
    });
    user = result.user;
  } catch (err) {
    if (err.message?.includes('duplicate') || err.message?.includes('already')) {
      // User exists — look them up
      const User = mongoose.model('User');
      user = await User.findOne({ email: 'test@metrik.app' });
      if (!user) throw err;
      console.log('    (user already exists, reusing)');
    } else {
      throw err;
    }
  }
  const userId = user._id;
  console.log(`  User: ${user.email}  (id: ${userId})\n`);

  // ── 2. Business ────────────────────────────────────────────────────────────
  console.log('  Creating business...');
  const business = await createBusiness(
    {
      name: 'Metrik Demo Pvt Ltd',
      legalName: 'Metrik Demo Private Limited',
      gstin: '27AABCM1234Z1ZQ',
      pan: 'AABCM1234Z',
      phone: '9999999990',
      email: 'demo@metrik.app',
      address: {
        line1: '123 Industrial Area',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India',
      },
    },
    userId,
  );
  const bizId = business._id;
  console.log(`  Business: ${business.name}  (id: ${bizId})\n`);

  // ── 3. Material Centres ────────────────────────────────────────────────────
  console.log('  Creating material centres...');
  const mcMap = {};
  for (const mc of MATERIAL_CENTRES) {
    const created = await createMC(mc, bizId, userId);
    mcMap[mc.code] = created;
  }
  const mcIds = Object.values(mcMap).map((m) => m._id);
  console.log(`  Created ${Object.keys(mcMap).length} material centres\n`);

  // ── 4. Item Groups ─────────────────────────────────────────────────────────
  console.log('  Creating item groups...');
  const groupMap = {};
  for (const g of ITEM_GROUPS) {
    const created = await createItemGroup(g, bizId, userId);
    groupMap[g.code] = created;
  }
  console.log(`  Created ${Object.keys(groupMap).length} item groups\n`);

  // ── 5. Items ───────────────────────────────────────────────────────────────
  console.log('  Creating items...');
  const allItems = [];
  const finishedItems = [];
  const rawItems = [];

  for (const item of FINISHED_GOODS) {
    const created = await createItem({ ...item, itemGroupId: groupMap.FG._id }, bizId, userId);
    allItems.push(created);
    finishedItems.push(created);
  }
  for (const item of RAW_MATERIALS) {
    const created = await createItem({ ...item, itemGroupId: groupMap.RM._id }, bizId, userId);
    allItems.push(created);
    rawItems.push(created);
  }
  for (const item of PACKAGING) {
    const created = await createItem({ ...item, itemGroupId: groupMap.PKG._id }, bizId, userId);
    allItems.push(created);
  }
  console.log(`  Created ${allItems.length} items\n`);

  // ── 6. Parties ─────────────────────────────────────────────────────────────
  console.log('  Creating parties...');
  const customers = [];
  const vendors = [];

  for (const c of CUSTOMERS) {
    const party = await createParty(
      {
        name: c.name,
        type: ['customer'],
        phone: c.phone,
        gstin: c.gstin,
        address: { city: c.city, state: 'Maharashtra', country: 'India' },
      },
      bizId,
      userId,
    );
    customers.push(party);
  }
  for (const v of VENDORS) {
    const party = await createParty(
      {
        name: v.name,
        type: ['vendor'],
        phone: v.phone,
        gstin: v.gstin,
        address: { city: v.city, country: 'India' },
      },
      bizId,
      userId,
    );
    vendors.push(party);
  }
  console.log(`  Created ${customers.length} customers + ${vendors.length} vendors\n`);

  // ── 7. Fetch accounts for receipts/payments ────────────────────────────────
  const cashAccount = await Account.findOne({ businessId: bizId, code: 'CASH' });
  const bankAccount = await Account.findOne({ businessId: bizId, code: 'BANK' });
  const paymentAccounts = [cashAccount, bankAccount].filter(Boolean);

  // ── 8. Generate 2 years of vouchers ────────────────────────────────────────
  // FY 2024-25: Apr 2024 – Mar 2025
  // FY 2025-26: Apr 2025 – Feb 2026 (up to "today")
  const fyStart = new Date(2024, 3, 1);  // 1 Apr 2024
  const fyEnd = new Date(2026, 1, 10);   // 10 Feb 2026

  // First seed purchase invoices so we have stock
  console.log('  Seeding purchase invoices...');
  const totalPurchases = 250;
  for (let i = 0; i < totalPurchases; i++) {
    const vendor = randomFrom(vendors);
    const mc = randomFrom(mcIds);
    const date = randomDate(fyStart, fyEnd);
    const numLines = randomBetween(1, 4);
    const lineItems = [];

    for (let j = 0; j < numLines; j++) {
      const item = randomFrom(rawItems);
      lineItems.push({
        itemId: item._id,
        quantity: randomBetween(50, 500),
        rate: randomBetween(20, 80),
        discount: 0,
        gstRate: item.gstRate || 0,
      });
    }

    try {
      await createVoucher(
        {
          voucherType: 'purchase_invoice',
          date: date.toISOString(),
          partyId: vendor._id,
          materialCentreId: mc,
          lineItems,
          narration: `Purchase from ${vendor.name}`,
        },
        bizId,
        userId,
      );
    } catch (err) {
      // Skip failures (e.g. duplicate sequences under load)
    }
    progressBar(i + 1, totalPurchases, 'purchase invoices');
  }

  // Sales invoices
  console.log('  Seeding sales invoices...');
  const totalSales = 700;
  const salesVouchers = [];
  for (let i = 0; i < totalSales; i++) {
    const customer = randomFrom(customers);
    const mc = randomFrom(mcIds);
    const date = randomDate(fyStart, fyEnd);
    const numLines = randomBetween(1, 5);
    const lineItems = [];

    for (let j = 0; j < numLines; j++) {
      const item = randomFrom(finishedItems);
      const qty = randomBetween(5, 50);
      // Vary price ±15% from salesPrice
      const basePrice = item.salesPrice || randomBetween(100, 500);
      const rate = Math.round(basePrice * (0.85 + Math.random() * 0.30));
      const discount = Math.random() < 0.3 ? randomBetween(5, 50) : 0;
      lineItems.push({
        itemId: item._id,
        quantity: qty,
        rate,
        discount,
        gstRate: item.gstRate || 5,
      });
    }

    try {
      const v = await createVoucher(
        {
          voucherType: 'sales_invoice',
          date: date.toISOString(),
          partyId: customer._id,
          materialCentreId: mc,
          lineItems,
          narration: `Sale to ${customer.name}`,
        },
        bizId,
        userId,
      );
      salesVouchers.push(v);
    } catch (err) {
      // Skip stock-insufficient errors — expected since we may not have enough
    }
    progressBar(i + 1, totalSales, 'sales invoices');
  }

  // Receipts (customer payments)
  console.log('  Seeding receipts...');
  const totalReceipts = 120;
  for (let i = 0; i < totalReceipts; i++) {
    const customer = randomFrom(customers);
    const date = randomDate(fyStart, fyEnd);
    const payAcct = randomFrom(paymentAccounts);
    const amount = randomBetween(5000, 80000);

    try {
      await createVoucher(
        {
          voucherType: 'receipt',
          date: date.toISOString(),
          partyId: customer._id,
          lineItems: [
            {
              accountId: payAcct._id,
              debit: amount,
              credit: 0,
              narration: `Payment received from ${customer.name}`,
            },
          ],
          narration: `Receipt from ${customer.name}`,
        },
        bizId,
        userId,
      );
    } catch (err) {
      // skip
    }
    progressBar(i + 1, totalReceipts, 'receipts');
  }

  // Payments (to vendors)
  console.log('  Seeding payments...');
  const totalPayments = 80;
  for (let i = 0; i < totalPayments; i++) {
    const vendor = randomFrom(vendors);
    const date = randomDate(fyStart, fyEnd);
    const payAcct = randomFrom(paymentAccounts);
    const amount = randomBetween(10000, 150000);

    try {
      await createVoucher(
        {
          voucherType: 'payment',
          date: date.toISOString(),
          partyId: vendor._id,
          lineItems: [
            {
              accountId: payAcct._id,
              debit: 0,
              credit: amount,
              narration: `Payment to ${vendor.name}`,
            },
          ],
          narration: `Payment to ${vendor.name}`,
        },
        bizId,
        userId,
      );
    } catch (err) {
      // skip
    }
    progressBar(i + 1, totalPayments, 'payments');
  }

  // Sales orders (some pending, for the orders page)
  console.log('  Seeding sales orders...');
  const totalSalesOrders = 30;
  for (let i = 0; i < totalSalesOrders; i++) {
    const customer = randomFrom(customers);
    const mc = randomFrom(mcIds);
    // Recent dates only
    const date = randomDate(new Date(2025, 10, 1), fyEnd);
    const numLines = randomBetween(1, 4);
    const lineItems = [];

    for (let j = 0; j < numLines; j++) {
      const item = randomFrom(finishedItems);
      lineItems.push({
        itemId: item._id,
        quantity: randomBetween(10, 100),
        rate: item.salesPrice || randomBetween(200, 500),
        discount: 0,
        gstRate: item.gstRate || 5,
      });
    }

    try {
      await createVoucher(
        {
          voucherType: 'sales_order',
          date: date.toISOString(),
          partyId: customer._id,
          materialCentreId: mc,
          lineItems,
          narration: `Order from ${customer.name}`,
        },
        bizId,
        userId,
      );
    } catch (err) {
      // skip
    }
    progressBar(i + 1, totalSalesOrders, 'sales orders');
  }

  // Purchase orders
  console.log('  Seeding purchase orders...');
  const totalPurchaseOrders = 20;
  for (let i = 0; i < totalPurchaseOrders; i++) {
    const vendor = randomFrom(vendors);
    const mc = randomFrom(mcIds);
    const date = randomDate(new Date(2025, 10, 1), fyEnd);
    const numLines = randomBetween(1, 3);
    const lineItems = [];

    for (let j = 0; j < numLines; j++) {
      const item = randomFrom(rawItems);
      lineItems.push({
        itemId: item._id,
        quantity: randomBetween(100, 1000),
        rate: randomBetween(20, 80),
        discount: 0,
        gstRate: item.gstRate || 0,
      });
    }

    try {
      await createVoucher(
        {
          voucherType: 'purchase_order',
          date: date.toISOString(),
          partyId: vendor._id,
          materialCentreId: mc,
          lineItems,
          narration: `PO to ${vendor.name}`,
        },
        bizId,
        userId,
      );
    } catch (err) {
      // skip
    }
    progressBar(i + 1, totalPurchaseOrders, 'purchase orders');
  }

  console.log('\n✅ Seed complete!\n');
  console.log('  Login credentials:');
  console.log('    Email:    test@metrik.app');
  console.log('    Password: password123');
  console.log(`    Business: ${business.name}\n`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('\n❌ Seed failed:', err);
  process.exit(1);
});

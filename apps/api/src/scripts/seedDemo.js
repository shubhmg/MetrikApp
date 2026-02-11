import env from '../config/env.js';
import { connectDB } from '../config/db.js';
import { registerAllHandlers } from '../modules/voucher/handlers/index.js';
import User from '../modules/auth/user.model.js';
import Business from '../modules/business/business.model.js';
import Account from '../modules/account/account.model.js';
import Party from '../modules/party/party.model.js';
import Item from '../modules/item/item.model.js';
import ItemGroup from '../modules/item/itemGroup.model.js';
import MaterialCentre from '../modules/material-centre/materialCentre.model.js';
import BillOfMaterial from '../modules/bom/bom.model.js';
import Voucher from '../modules/voucher/voucher.model.js';
import VoucherSequence from '../modules/voucher/voucherSequence.model.js';
import InventoryLedger from '../modules/voucher/inventoryLedger.model.js';
import StockSummary from '../modules/voucher/stockSummary.model.js';
import JournalEntry from '../modules/voucher/journalEntry.model.js';
import { createParty } from '../modules/party/party.service.js';
import * as voucherEngine from '../engines/voucher.engine.js';

const DEMO_EMAIL = 'demo@metrik.com';
const DEMO_PASSWORD = 'Demo@1234';
const DEMO_BUSINESS = 'Metrik Demo';

const SYSTEM_ACCOUNTS = [
  { name: 'Sales', code: 'SALES', type: 'income', group: 'Sales', isSystemAccount: true },
  { name: 'Sales Return', code: 'SALES_RET', type: 'income', group: 'Sales', isSystemAccount: true },
  { name: 'Purchases', code: 'PURCHASES', type: 'expense', group: 'Purchases', isSystemAccount: true },
  { name: 'Purchase Return', code: 'PURCHASE_RET', type: 'expense', group: 'Purchases', isSystemAccount: true },
  { name: 'GST Output', code: 'GST_OUTPUT', type: 'liability', group: 'Duties & Taxes', isSystemAccount: true },
  { name: 'GST Input', code: 'GST_INPUT', type: 'asset', group: 'Duties & Taxes', isSystemAccount: true },
  { name: 'Cash', code: 'CASH', type: 'asset', group: 'Cash & Bank', isSystemAccount: true },
  { name: 'Bank', code: 'BANK', type: 'asset', group: 'Cash & Bank', isSystemAccount: true },
];

function fyStartYear(date = new Date()) {
  const m = date.getMonth();
  const y = date.getFullYear();
  return m >= 3 ? y : y - 1;
}

function fyMonths(startYear) {
  const months = [];
  for (let i = 0; i < 12; i++) {
    const month = (3 + i) % 12;
    const year = startYear + (3 + i >= 12 ? 1 : 0);
    months.push(new Date(year, month, 10));
  }
  return months;
}

function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function upsertBy(query, update, Model) {
  return Model.findOneAndUpdate(query, update, { new: true, upsert: true, setDefaultsOnInsert: true });
}

async function main() {
  registerAllHandlers();
  await connectDB();

  const reset = process.argv.includes('--reset');

  let user = await User.findOne({ email: DEMO_EMAIL });
  if (!user) {
    user = await User.create({
      name: 'Demo User',
      email: DEMO_EMAIL,
      phone: '9999999999',
      passwordHash: DEMO_PASSWORD,
    });
  } else {
    user.passwordHash = DEMO_PASSWORD;
    user.refreshTokens = [];
    await user.save();
  }

  let business = await Business.findOne({ name: DEMO_BUSINESS });
  if (!business) {
    business = await Business.create({
      name: DEMO_BUSINESS,
      legalName: 'Metrik Demo Pvt Ltd',
      gstin: '27ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      phone: '022-12345678',
      email: 'hello@metrik.local',
      createdBy: user._id,
      updatedBy: user._id,
    });
  }

  const hasBusiness = user.businesses.some((b) => String(b.businessId) === String(business._id));
  if (!hasBusiness) {
    user.businesses.push({ businessId: business._id, role: 'owner', permissions: [], isActive: true });
    await user.save();
  }

  if (reset) {
    await Promise.all([
      Voucher.deleteMany({ businessId: business._id }),
      VoucherSequence.deleteMany({ businessId: business._id }),
      InventoryLedger.deleteMany({ businessId: business._id }),
      StockSummary.deleteMany({ businessId: business._id }),
      JournalEntry.deleteMany({ businessId: business._id }),
      BillOfMaterial.deleteMany({ businessId: business._id }),
      Item.deleteMany({ businessId: business._id }),
      ItemGroup.deleteMany({ businessId: business._id }),
      MaterialCentre.deleteMany({ businessId: business._id }),
      Party.deleteMany({ businessId: business._id }),
      Account.deleteMany({ businessId: business._id }),
    ]);
  }

  // System accounts
  const accountMap = {};
  for (const acc of SYSTEM_ACCOUNTS) {
    const doc = await upsertBy(
      { businessId: business._id, code: acc.code },
      { ...acc, businessId: business._id, createdBy: user._id, updatedBy: user._id },
      Account
    );
    accountMap[acc.code] = doc;
  }

  // Material Centres
  const mcFactory = await upsertBy(
    { businessId: business._id, code: 'FAC' },
    { name: 'Factory', code: 'FAC', type: 'factory', isDefault: true, businessId: business._id, createdBy: user._id, updatedBy: user._id },
    MaterialCentre
  );
  const mcGodown = await upsertBy(
    { businessId: business._id, code: 'GOD' },
    { name: 'Central Godown', code: 'GOD', type: 'godown', businessId: business._id, createdBy: user._id, updatedBy: user._id },
    MaterialCentre
  );
  const mcShop = await upsertBy(
    { businessId: business._id, code: 'SHP' },
    { name: 'Retail Shop', code: 'SHP', type: 'shop', businessId: business._id, createdBy: user._id, updatedBy: user._id },
    MaterialCentre
  );

  // Item Groups
  const gRaw = await upsertBy(
    { businessId: business._id, code: 'RAW' },
    { name: 'Raw Materials', code: 'RAW', type: 'raw_material', businessId: business._id, createdBy: user._id, updatedBy: user._id },
    ItemGroup
  );
  const gFinished = await upsertBy(
    { businessId: business._id, code: 'FG' },
    { name: 'Finished Goods', code: 'FG', type: 'finished_good', businessId: business._id, createdBy: user._id, updatedBy: user._id },
    ItemGroup
  );
  const gPackaging = await upsertBy(
    { businessId: business._id, code: 'PKG' },
    { name: 'Packaging', code: 'PKG', type: 'packaging', businessId: business._id, createdBy: user._id, updatedBy: user._id },
    ItemGroup
  );

  // Items
  const itemSteel = await upsertBy(
    { businessId: business._id, sku: 'RM-STEEL' },
    { name: 'Steel Sheet', sku: 'RM-STEEL', itemGroupId: gRaw._id, unit: 'kg', gstRate: 18, salesPrice: 0, businessId: business._id, createdBy: user._id, updatedBy: user._id },
    Item
  );
  const itemPlastic = await upsertBy(
    { businessId: business._id, sku: 'RM-PLASTIC' },
    { name: 'Plastic Granules', sku: 'RM-PLASTIC', itemGroupId: gRaw._id, unit: 'kg', gstRate: 18, salesPrice: 0, businessId: business._id, createdBy: user._id, updatedBy: user._id },
    Item
  );
  const itemWidgetA = await upsertBy(
    { businessId: business._id, sku: 'FG-WA' },
    { name: 'Widget A', sku: 'FG-WA', itemGroupId: gFinished._id, unit: 'pcs', gstRate: 18, salesPrice: 120, businessId: business._id, createdBy: user._id, updatedBy: user._id },
    Item
  );
  const itemWidgetB = await upsertBy(
    { businessId: business._id, sku: 'FG-WB' },
    { name: 'Widget B', sku: 'FG-WB', itemGroupId: gFinished._id, unit: 'pcs', gstRate: 12, salesPrice: 180, businessId: business._id, createdBy: user._id, updatedBy: user._id },
    Item
  );
  const itemBox = await upsertBy(
    { businessId: business._id, sku: 'PK-BOX' },
    { name: 'Packaging Box', sku: 'PK-BOX', itemGroupId: gPackaging._id, unit: 'pcs', gstRate: 12, salesPrice: 0, businessId: business._id, createdBy: user._id, updatedBy: user._id },
    Item
  );

  // Parties
  async function ensureParty(name, type) {
    const existing = await Party.findOne({ businessId: business._id, name });
    if (existing) return existing;
    return createParty({ name, type, openingBalance: 0 }, business._id, user._id);
  }

  const custA = await ensureParty('Alpha Traders', ['customer']);
  const custB = await ensureParty('Beacon Retail', ['customer']);
  const vendA = await ensureParty('Zenith Metals', ['vendor']);

  // BOM
  const bom = await upsertBy(
    { businessId: business._id, outputItemId: itemWidgetA._id, status: 'active' },
    {
      outputItemId: itemWidgetA._id,
      name: 'Widget A BOM',
      version: 1,
      status: 'active',
      outputQuantity: 1,
      inputs: [
        { itemId: itemSteel._id, quantity: 1.2, wastagePercent: 2 },
        { itemId: itemPlastic._id, quantity: 0.3, wastagePercent: 1 },
      ],
      defaultMaterialCentreId: mcFactory._id,
      businessId: business._id,
      createdBy: user._id,
      updatedBy: user._id,
    },
    BillOfMaterial
  );

  // Seed vouchers across 2 FYs
  const startYear = fyStartYear();
  const allMonths = [
    ...fyMonths(startYear - 1),
    ...fyMonths(startYear),
  ];

  for (let i = 0; i < allMonths.length; i++) {
    const date = allMonths[i];
    const qtyRaw = randBetween(80, 140);
    const qtyOut = Math.floor(qtyRaw / 2);
    const qtySell = randBetween(20, Math.max(25, Math.floor(qtyOut * 0.7)));
    const rateSell = randBetween(110, 160);

    // Purchase Order
    await voucherEngine.create({
      voucherType: 'purchase_order',
      date,
      partyId: vendA._id,
      materialCentreId: mcFactory._id,
      lineItems: [
        { itemId: itemSteel._id, quantity: qtyRaw * 0.7, rate: 55, gstRate: 18 },
        { itemId: itemPlastic._id, quantity: qtyRaw * 0.3, rate: 75, gstRate: 18 },
      ],
      narration: 'Monthly raw material order',
    }, business._id, user._id);

    // GRN
    await voucherEngine.create({
      voucherType: 'grn',
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
      partyId: vendA._id,
      materialCentreId: mcFactory._id,
      lineItems: [
        { itemId: itemSteel._id, quantity: qtyRaw * 0.7, rate: 55, gstRate: 18 },
        { itemId: itemPlastic._id, quantity: qtyRaw * 0.3, rate: 75, gstRate: 18 },
      ],
      narration: 'Goods received',
    }, business._id, user._id);

    // Purchase Invoice
    await voucherEngine.create({
      voucherType: 'purchase_invoice',
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 2),
      partyId: vendA._id,
      materialCentreId: mcFactory._id,
      lineItems: [
        { itemId: itemSteel._id, quantity: qtyRaw * 0.7, rate: 55, gstRate: 18 },
        { itemId: itemPlastic._id, quantity: qtyRaw * 0.3, rate: 75, gstRate: 18 },
      ],
      narration: 'Purchase invoice',
    }, business._id, user._id);

    // Production - Widget A
    await voucherEngine.create({
      voucherType: 'production',
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 4),
      partyId: null,
      materialCentreId: mcFactory._id,
      bomId: bom._id,
      lineItems: [
        { itemId: itemWidgetA._id, quantity: qtyOut, rate: 0, gstRate: 18 },
        { itemId: itemSteel._id, quantity: qtyOut * 1.2, rate: 55, gstRate: 18 },
        { itemId: itemPlastic._id, quantity: qtyOut * 0.3, rate: 75, gstRate: 18 },
      ],
      narration: 'Monthly production run',
    }, business._id, user._id);

    // Production - Widget B (no BOM, manual inputs)
    const qtyOutB = Math.max(6, Math.floor(qtyOut * 0.35));
    await voucherEngine.create({
      voucherType: 'production',
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 5),
      partyId: null,
      materialCentreId: mcFactory._id,
      lineItems: [
        { itemId: itemWidgetB._id, quantity: qtyOutB, rate: 0, gstRate: 12 },
        { itemId: itemSteel._id, quantity: qtyOutB * 0.8, rate: 55, gstRate: 18 },
        { itemId: itemPlastic._id, quantity: qtyOutB * 0.2, rate: 75, gstRate: 18 },
      ],
      narration: 'Monthly production run (Widget B)',
    }, business._id, user._id);

    // Sales Order
    await voucherEngine.create({
      voucherType: 'sales_order',
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 6),
      partyId: i % 2 === 0 ? custA._id : custB._id,
      materialCentreId: mcFactory._id,
      lineItems: [
        { itemId: itemWidgetA._id, quantity: Math.max(10, Math.floor(qtySell * 0.8)), rate: rateSell, gstRate: 18 },
        { itemId: itemWidgetB._id, quantity: Math.max(5, Math.floor(qtySell * 0.2)), rate: rateSell + 40, gstRate: 12 },
      ],
      narration: 'Sales order',
    }, business._id, user._id);

    // Sales Invoice
    const invoice = await voucherEngine.create({
      voucherType: 'sales_invoice',
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 8),
      partyId: i % 2 === 0 ? custA._id : custB._id,
      materialCentreId: mcFactory._id,
      lineItems: [
        { itemId: itemWidgetA._id, quantity: Math.max(5, qtySell), rate: rateSell, gstRate: 18 },
        { itemId: itemWidgetB._id, quantity: Math.max(2, Math.floor(qtySell * 0.3)), rate: rateSell + 40, gstRate: 12 },
      ],
      narration: 'Monthly sales',
    }, business._id, user._id);

    // Receipt (party) - debit Cash/Bank
    await voucherEngine.create({
      voucherType: 'receipt',
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 9),
      partyId: invoice.partyId,
      lineItems: [
        { accountId: accountMap.CASH._id, debit: invoice.grandTotal, credit: 0, narration: 'Cash received' },
      ],
      narration: 'Receipt against invoice',
    }, business._id, user._id);

    // Payment to vendor (party) - credit Cash/Bank
    await voucherEngine.create({
      voucherType: 'payment',
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 11),
      partyId: vendA._id,
      lineItems: [
        { accountId: accountMap.BANK._id, debit: 0, credit: randBetween(3000, 8000), narration: 'Vendor payment' },
      ],
      narration: 'Monthly vendor payment',
    }, business._id, user._id);

    // Occasional sales return
    if (i % 4 === 0) {
      await voucherEngine.create({
        voucherType: 'sales_return',
        date: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 12),
        partyId: i % 2 === 0 ? custA._id : custB._id,
        materialCentreId: mcFactory._id,
        lineItems: [
          { itemId: itemWidgetA._id, quantity: 2, rate: rateSell, gstRate: 18 },
        ],
        narration: 'Return from customer',
      }, business._id, user._id);
    }

    // Occasional purchase return
    if (i % 5 === 0) {
      await voucherEngine.create({
        voucherType: 'purchase_return',
        date: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 13),
        partyId: vendA._id,
        materialCentreId: mcFactory._id,
        lineItems: [
          { itemId: itemSteel._id, quantity: 3, rate: 55, gstRate: 18 },
        ],
        narration: 'Return to vendor',
      }, business._id, user._id);
    }
  }

  // Stock transfer + delivery note + physical stock sample
  await voucherEngine.create({
    voucherType: 'stock_transfer',
    date: new Date(startYear + 1, 0, 15),
    fromMaterialCentreId: mcFactory._id,
    toMaterialCentreId: mcShop._id,
    lineItems: [
      { itemId: itemWidgetA._id, quantity: 20, rate: 130, gstRate: 18 },
    ],
    narration: 'Transfer to shop',
  }, business._id, user._id);

  await voucherEngine.create({
    voucherType: 'delivery_note',
    date: new Date(startYear + 1, 1, 5),
    partyId: custA._id,
    materialCentreId: mcFactory._id,
    lineItems: [
      { itemId: itemWidgetA._id, quantity: 5, rate: 140, gstRate: 18 },
    ],
    narration: 'Delivery without invoice',
  }, business._id, user._id);

  await voucherEngine.create({
    voucherType: 'physical_stock',
    date: new Date(startYear + 1, 2, 10),
    materialCentreId: mcFactory._id,
    lineItems: [
      { itemId: itemWidgetA._id, quantity: -2, rate: 130 },
    ],
    narration: 'Physical stock adjustment',
  }, business._id, user._id);

  console.log('Demo seed complete');
  console.log(`Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

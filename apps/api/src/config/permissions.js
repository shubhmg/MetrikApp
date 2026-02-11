import { VOUCHER_TYPES } from './constants.js';

export const MODULES = {
  dashboard:        { label: 'Dashboard',             actions: ['read'] },
  sales_order:      { label: 'Sales Orders',          actions: ['read', 'write', 'delete'] },
  sales_invoice:    { label: 'Sales Invoices',        actions: ['read', 'write', 'delete'] },
  purchase_order:   { label: 'Purchase Orders',       actions: ['read', 'write', 'delete'] },
  purchase_invoice: { label: 'Purchase Invoices',     actions: ['read', 'write', 'delete'] },
  receipt:          { label: 'Receipts',               actions: ['read', 'write', 'delete'] },
  payment:          { label: 'Payments',               actions: ['read', 'write', 'delete'] },
  sales_return:     { label: 'Sales Returns',          actions: ['read', 'write', 'delete'] },
  purchase_return:  { label: 'Purchase Returns',       actions: ['read', 'write', 'delete'] },
  delivery_note:    { label: 'Delivery Notes',         actions: ['read', 'write', 'delete'] },
  grn:              { label: 'GRN',                    actions: ['read', 'write', 'delete'] },
  stock_transfer:   { label: 'Stock Transfers',        actions: ['read', 'write', 'delete'] },
  production:       { label: 'Productions',            actions: ['read', 'write', 'delete'] },
  physical_stock:   { label: 'Physical Stock',         actions: ['read', 'write', 'delete'] },
  journal:          { label: 'Journal Entries',        actions: ['read', 'write', 'delete'] },
  contra:           { label: 'Contra',                 actions: ['read', 'write', 'delete'] },
  item:             { label: 'Items & Groups',         actions: ['read', 'write', 'delete'] },
  inventory:        { label: 'Stock & Material Centres', actions: ['read', 'write', 'delete'] },
  party:            { label: 'Parties',                actions: ['read', 'write', 'delete'] },
  bom:              { label: 'Bill of Materials',      actions: ['read', 'write', 'delete'] },
  accounting:       { label: 'Accounting (CoA)',       actions: ['read', 'write', 'delete'] },
  member:           { label: 'Team Members',           actions: ['read', 'write', 'delete'] },
};

// Flat array of every valid permission string
export const ALL_PERMISSIONS = Object.entries(MODULES).flatMap(
  ([mod, { actions }]) => actions.map((a) => `${mod}:${a}`)
);

// Maps voucher type to permission module key
export const VOUCHER_TYPE_MODULE_MAP = {
  [VOUCHER_TYPES.SALES_ORDER]:      'sales_order',
  [VOUCHER_TYPES.SALES_INVOICE]:    'sales_invoice',
  [VOUCHER_TYPES.PURCHASE_ORDER]:   'purchase_order',
  [VOUCHER_TYPES.PURCHASE_INVOICE]: 'purchase_invoice',
  [VOUCHER_TYPES.RECEIPT]:          'receipt',
  [VOUCHER_TYPES.PAYMENT]:          'payment',
  [VOUCHER_TYPES.SALES_RETURN]:     'sales_return',
  [VOUCHER_TYPES.PURCHASE_RETURN]:  'purchase_return',
  [VOUCHER_TYPES.DELIVERY_NOTE]:    'delivery_note',
  [VOUCHER_TYPES.GRN]:              'grn',
  [VOUCHER_TYPES.STOCK_TRANSFER]:   'stock_transfer',
  [VOUCHER_TYPES.PRODUCTION]:       'production',
  [VOUCHER_TYPES.PHYSICAL_STOCK]:   'physical_stock',
  [VOUCHER_TYPES.JOURNAL]:          'journal',
  [VOUCHER_TYPES.CONTRA]:           'contra',
};

// Helper to build permissions for all modules
function allPermsFor(actions) {
  return Object.entries(MODULES)
    .filter(([mod]) => mod !== 'member')
    .flatMap(([mod, { actions: available }]) =>
      available.filter((a) => actions.includes(a)).map((a) => `${mod}:${a}`)
    );
}

// Accountant-specific modules: accounting, voucher types, parties
const ACCOUNTANT_WRITE_MODULES = [
  'accounting', 'sales_invoice', 'purchase_invoice', 'receipt', 'payment',
  'sales_return', 'purchase_return', 'journal', 'contra', 'party',
  'sales_order', 'purchase_order',
];
const ACCOUNTANT_READ_MODULES = [
  'dashboard', 'item', 'inventory', 'bom', 'production',
  'delivery_note', 'grn', 'stock_transfer', 'physical_stock',
];

// Operator-specific modules: inventory, items, bom, production, stock_transfer
const OPERATOR_WRITE_MODULES = [
  'item', 'inventory', 'bom', 'production', 'stock_transfer',
  'physical_stock', 'grn', 'delivery_note',
];
const OPERATOR_READ_MODULES = [
  'dashboard', 'sales_order', 'sales_invoice', 'purchase_order',
  'purchase_invoice', 'receipt', 'payment', 'sales_return',
  'purchase_return', 'journal', 'contra', 'accounting', 'party',
];

export const ROLE_PRESETS = {
  owner:      ALL_PERMISSIONS,
  admin:      ALL_PERMISSIONS,
  manager:    allPermsFor(['read', 'write']),
  accountant: [
    ...ACCOUNTANT_WRITE_MODULES.flatMap((m) =>
      (MODULES[m]?.actions || []).filter((a) => ['read', 'write'].includes(a)).map((a) => `${m}:${a}`)
    ),
    ...ACCOUNTANT_READ_MODULES.map((m) => `${m}:read`),
  ],
  operator: [
    ...OPERATOR_WRITE_MODULES.flatMap((m) =>
      (MODULES[m]?.actions || []).filter((a) => ['read', 'write'].includes(a)).map((a) => `${m}:${a}`)
    ),
    ...OPERATOR_READ_MODULES.map((m) => `${m}:read`),
  ],
  contractor: [
    'dashboard:read',
    'production:read',
    'production:write',
    'production:delete',
    'item:read',
    'bom:read',
    'party:read',
  ],
  viewer: allPermsFor(['read']),
};

export function getDefaultPermissions(role) {
  return ROLE_PRESETS[role] || [];
}

export const VOUCHER_TYPES = {
  SALES_INVOICE: 'sales_invoice',
  PURCHASE_INVOICE: 'purchase_invoice',
  SALES_RETURN: 'sales_return',
  PURCHASE_RETURN: 'purchase_return',
  PAYMENT: 'payment',
  RECEIPT: 'receipt',
  JOURNAL: 'journal',
  CONTRA: 'contra',
  STOCK_TRANSFER: 'stock_transfer',
  GRN: 'grn',
  PRODUCTION: 'production',
  SALES_ORDER: 'sales_order',
  PURCHASE_ORDER: 'purchase_order',
  DELIVERY_NOTE: 'delivery_note',
  PHYSICAL_STOCK: 'physical_stock',
};

export const VOUCHER_TYPE_VALUES = Object.values(VOUCHER_TYPES);

export const VOUCHER_PREFIX = {
  [VOUCHER_TYPES.SALES_INVOICE]: 'SAL',
  [VOUCHER_TYPES.PURCHASE_INVOICE]: 'PUR',
  [VOUCHER_TYPES.SALES_RETURN]: 'SRN',
  [VOUCHER_TYPES.PURCHASE_RETURN]: 'PRN',
  [VOUCHER_TYPES.PAYMENT]: 'PAY',
  [VOUCHER_TYPES.RECEIPT]: 'RCT',
  [VOUCHER_TYPES.JOURNAL]: 'JRN',
  [VOUCHER_TYPES.CONTRA]: 'CNT',
  [VOUCHER_TYPES.STOCK_TRANSFER]: 'STK',
  [VOUCHER_TYPES.GRN]: 'GRN',
  [VOUCHER_TYPES.PRODUCTION]: 'PRD',
  [VOUCHER_TYPES.SALES_ORDER]: 'SOR',
  [VOUCHER_TYPES.PURCHASE_ORDER]: 'POR',
  [VOUCHER_TYPES.DELIVERY_NOTE]: 'DLV',
  [VOUCHER_TYPES.PHYSICAL_STOCK]: 'PHY',
};

export const VOUCHER_STATUS = {
  DRAFT: 'draft',
  POSTED: 'posted',
  CANCELLED: 'cancelled',
};

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  ACCOUNTANT: 'accountant',
  OPERATOR: 'operator',
  VIEWER: 'viewer',
};

export const ROLE_VALUES = Object.values(ROLES);

export const MC_TYPES = {
  FACTORY: 'factory',
  GODOWN: 'godown',
  CONTRACTOR: 'contractor',
  SHOP: 'shop',
};

export const ITEM_GROUP_TYPES = {
  RAW_MATERIAL: 'raw_material',
  FINISHED_GOOD: 'finished_good',
  SEMI_FINISHED: 'semi_finished',
  PACKAGING: 'packaging',
  CONSUMABLE: 'consumable',
};

export const ACCOUNT_TYPES = {
  ASSET: 'asset',
  LIABILITY: 'liability',
  INCOME: 'income',
  EXPENSE: 'expense',
  EQUITY: 'equity',
};

export const PARTY_TYPES = {
  CUSTOMER: 'customer',
  VENDOR: 'vendor',
  CONTRACTOR: 'contractor',
};

export const COSTING_METHODS = {
  WEIGHTED_AVERAGE: 'weighted_average',
  FIFO: 'fifo',
};

export const BOM_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
};

export function getFinancialYear(date = new Date()) {
  const month = date.getMonth(); // 0-indexed
  const year = date.getFullYear();
  // Indian FY: April (3) to March (2)
  const startYear = month >= 3 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

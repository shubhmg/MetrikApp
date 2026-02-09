import Account from './account.model.js';

/**
 * Default Chart of Accounts seeded on business creation.
 * Groups follow Indian accounting conventions.
 */
const DEFAULT_ACCOUNTS = [
  // ASSETS
  { code: 'CASH', name: 'Cash', type: 'asset', group: 'Cash & Bank', isSystemAccount: true },
  { code: 'BANK', name: 'Bank Account', type: 'asset', group: 'Cash & Bank', isSystemAccount: true },
  { code: 'ACCT_RECV', name: 'Accounts Receivable', type: 'asset', group: 'Current Assets', isSystemAccount: true },
  { code: 'INVENTORY', name: 'Inventory', type: 'asset', group: 'Current Assets', isSystemAccount: true },
  { code: 'ADV_TO_SUPP', name: 'Advance to Suppliers', type: 'asset', group: 'Current Assets', isSystemAccount: true },

  // LIABILITIES
  { code: 'ACCT_PAY', name: 'Accounts Payable', type: 'liability', group: 'Current Liabilities', isSystemAccount: true },
  { code: 'GST_OUTPUT', name: 'GST Output (Payable)', type: 'liability', group: 'Duties & Taxes', isSystemAccount: true },
  { code: 'GST_INPUT', name: 'GST Input (Receivable)', type: 'asset', group: 'Duties & Taxes', isSystemAccount: true },
  { code: 'TDS_PAYABLE', name: 'TDS Payable', type: 'liability', group: 'Duties & Taxes', isSystemAccount: true },
  { code: 'ADV_FROM_CUST', name: 'Advance from Customers', type: 'liability', group: 'Current Liabilities', isSystemAccount: true },
  { code: 'SAL_PAYABLE', name: 'Salary Payable', type: 'liability', group: 'Current Liabilities', isSystemAccount: true },

  // EQUITY
  { code: 'CAPITAL', name: 'Capital Account', type: 'equity', group: 'Capital', isSystemAccount: true },
  { code: 'RETAINED', name: 'Retained Earnings', type: 'equity', group: 'Reserves & Surplus', isSystemAccount: true },

  // INCOME
  { code: 'SALES', name: 'Sales', type: 'income', group: 'Revenue', isSystemAccount: true },
  { code: 'SALES_RET', name: 'Sales Returns', type: 'income', group: 'Revenue', isSystemAccount: true },
  { code: 'DISCOUNT_RECV', name: 'Discount Received', type: 'income', group: 'Indirect Income', isSystemAccount: true },
  { code: 'OTHER_INCOME', name: 'Other Income', type: 'income', group: 'Indirect Income', isSystemAccount: true },

  // EXPENSES
  { code: 'PURCHASES', name: 'Purchases', type: 'expense', group: 'Direct Expenses', isSystemAccount: true },
  { code: 'PURCHASE_RET', name: 'Purchase Returns', type: 'expense', group: 'Direct Expenses', isSystemAccount: true },
  { code: 'DIRECT_EXP', name: 'Direct Expenses', type: 'expense', group: 'Direct Expenses', isSystemAccount: true },
  { code: 'MFG_EXP', name: 'Manufacturing Expenses', type: 'expense', group: 'Direct Expenses', isSystemAccount: true },
  { code: 'SALARY', name: 'Salary & Wages', type: 'expense', group: 'Indirect Expenses', isSystemAccount: true },
  { code: 'RENT', name: 'Rent', type: 'expense', group: 'Indirect Expenses', isSystemAccount: true },
  { code: 'TRANSPORT', name: 'Transport & Freight', type: 'expense', group: 'Indirect Expenses', isSystemAccount: true },
  { code: 'DISCOUNT_GIVEN', name: 'Discount Given', type: 'expense', group: 'Indirect Expenses', isSystemAccount: true },
  { code: 'MISC_EXP', name: 'Miscellaneous Expenses', type: 'expense', group: 'Indirect Expenses', isSystemAccount: true },
];

export async function seedChartOfAccounts(businessId, userId) {
  const existing = await Account.countDocuments({ businessId });
  if (existing > 0) return; // already seeded

  const docs = DEFAULT_ACCOUNTS.map((a) => ({
    ...a,
    businessId,
    createdBy: userId,
    updatedBy: userId,
  }));

  await Account.insertMany(docs);
}

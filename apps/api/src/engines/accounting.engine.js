import JournalEntry from '../modules/voucher/journalEntry.model.js';
import ApiError from '../utils/ApiError.js';

/**
 * Accounting Engine - Double-entry journal posting.
 *
 * Validates debit === credit before persisting.
 * All accounting entries flow through this engine.
 */

/** Helper: apply session to a query only if session exists */
function withSession(query, session) {
  return session ? query.session(session) : query;
}

/**
 * Post journal entries (optionally within a transaction).
 * @param {Array} entries - [{businessId, voucherId, voucherType, voucherNumber, date, accountId, debit, credit, narration, financialYear}]
 * @param {ClientSession|null} session - Mongoose transaction session (null for standalone mode)
 */
export async function postEntries(entries, session) {
  if (!entries || entries.length === 0) return [];

  // Validate double-entry: sum(debit) must equal sum(credit)
  const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw ApiError.badRequest(
      `Journal entries don't balance: debit=${totalDebit.toFixed(2)}, credit=${totalCredit.toFixed(2)}`
    );
  }

  const docs = await JournalEntry.insertMany(
    entries.map((e) => ({
      businessId: e.businessId,
      voucherId: e.voucherId,
      voucherType: e.voucherType,
      voucherNumber: e.voucherNumber,
      date: e.date,
      accountId: e.accountId,
      debit: e.debit || 0,
      credit: e.credit || 0,
      narration: e.narration,
      financialYear: e.financialYear,
    })),
    { ...(session ? { session } : {}), ordered: true }
  );

  return docs;
}

/**
 * Reverse all journal entries for a voucher (used on cancellation).
 */
export async function reverseEntries(voucherId, businessId, session) {
  const originals = await withSession(
    JournalEntry.find({ voucherId, isReverse: false }),
    session
  );
  if (originals.length === 0) return [];

  const reversals = originals.map((orig) => ({
    businessId,
    voucherId: orig.voucherId,
    voucherType: orig.voucherType,
    voucherNumber: orig.voucherNumber,
    date: new Date(),
    accountId: orig.accountId,
    debit: orig.credit,
    credit: orig.debit,
    narration: `Reversal: ${orig.narration || ''}`,
    financialYear: orig.financialYear,
    isReverse: true,
  }));

  return JournalEntry.insertMany(
    reversals,
    { ...(session ? { session } : {}), ordered: true }
  );
}

export default { postEntries, reverseEntries };

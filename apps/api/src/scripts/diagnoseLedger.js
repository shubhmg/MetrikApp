import { connectDB } from '../config/db.js';
import Party from '../modules/party/party.model.js';
import Account from '../modules/account/account.model.js';
import JournalEntry from '../modules/voucher/journalEntry.model.js';

const partyName = process.argv[2];
if (!partyName) {
  console.error('Usage: node src/scripts/diagnoseLedger.js "Party Name"');
  process.exit(1);
}

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function main() {
  await connectDB();

  const party = await Party.findOne({ name: partyName });
  if (!party) {
    console.error('Party not found');
    process.exit(1);
  }

  const account = await Account.findById(party.linkedAccountId);
  if (!account) {
    console.error('Linked account not found');
    process.exit(1);
  }

  const fyList = ['2024-25', '2025-26'];
  const initialOpening = (account.openingBalance?.debit || 0) - (account.openingBalance?.credit || 0);

  for (const fy of fyList) {
    // Entries in FY
    const entries = await JournalEntry.find({ accountId: account._id, financialYear: fy }).sort({ date: 1, createdAt: 1 }).lean();

    // Opening for FY using current backend logic
    const prev = await JournalEntry.aggregate([
      { $match: { accountId: account._id, financialYear: { $lt: fy } } },
      { $group: { _id: null, totalDebit: { $sum: '$debit' }, totalCredit: { $sum: '$credit' } } },
    ]);
    const prevSum = prev.length ? (prev[0].totalDebit - prev[0].totalCredit) : 0;
    const opening = initialOpening + prevSum;

    // Closing for FY (opening + FY entries)
    const fySum = entries.reduce((sum, e) => sum + (e.debit || 0) - (e.credit || 0), 0);
    const closing = opening + fySum;

    console.log(`FY ${fy}`);
    console.log(`  Opening (calc): ${fmt(opening)}`);
    console.log(`  FY net: ${fmt(fySum)}`);
    console.log(`  Closing (calc): ${fmt(closing)}`);
  }

  // Compare closing FY24-25 vs opening FY25-26
  const prevFY = '2024-25';
  const currFY = '2025-26';
  const prevAgg = await JournalEntry.aggregate([
    { $match: { accountId: account._id, financialYear: prevFY } },
    { $group: { _id: null, totalDebit: { $sum: '$debit' }, totalCredit: { $sum: '$credit' } } },
  ]);
  const prevFYNet = prevAgg.length ? (prevAgg[0].totalDebit - prevAgg[0].totalCredit) : 0;
  const openingCurrPrev = await JournalEntry.aggregate([
    { $match: { accountId: account._id, financialYear: { $lt: currFY } } },
    { $group: { _id: null, totalDebit: { $sum: '$debit' }, totalCredit: { $sum: '$credit' } } },
  ]);
  const openingCurr = initialOpening + (openingCurrPrev.length ? (openingCurrPrev[0].totalDebit - openingCurrPrev[0].totalCredit) : 0);
  const closingPrev = initialOpening + (openingCurrPrev.length ? (openingCurrPrev[0].totalDebit - openingCurrPrev[0].totalCredit) : 0); // same as openingCurr

  console.log('---');
  console.log(`Opening FY ${currFY}: ${fmt(openingCurr)}`);
  console.log(`Sum FY ${prevFY} net: ${fmt(prevFYNet)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

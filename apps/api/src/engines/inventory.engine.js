import InventoryLedger from '../modules/voucher/inventoryLedger.model.js';
import StockSummary from '../modules/voucher/stockSummary.model.js';
import Item from '../modules/item/item.model.js';
import MaterialCentre from '../modules/material-centre/materialCentre.model.js';
import ApiError from '../utils/ApiError.js';

/**
 * Inventory Engine - Stock ledger posting + StockSummary maintenance.
 *
 * All stock movement flows through this engine. No direct edits.
 * Every entry creates an InventoryLedger doc and atomically updates StockSummary.
 */

/** Helper: apply session to a query only if session exists */
function withSession(query, session) {
  return session ? query.session(session) : query;
}

/**
 * Post inventory entries (optionally within a transaction).
 * @param {Array} entries - [{businessId, itemId, materialCentreId, voucherId, voucherType, voucherNumber, date, type:'in'|'out', quantity, rate, narration}]
 * @param {ClientSession|null} session - Mongoose transaction session (null for standalone mode)
 */
export async function postEntries(entries, session) {
  if (!entries || entries.length === 0) return [];

  const ledgerDocs = [];
  const opts = session ? { session } : {};

  for (const entry of entries) {
    const value = entry.quantity * entry.rate;

    // For OUT entries, validate sufficient stock
    if (entry.type === 'out') {
      const summary = await withSession(
        StockSummary.findOne({
          businessId: entry.businessId,
          itemId: entry.itemId,
          materialCentreId: entry.materialCentreId,
        }),
        session
      );

      const available = summary ? summary.quantity : 0;
      if (available < entry.quantity) {
        const [itemDoc, mcDoc] = await Promise.all([
          withSession(Item.findById(entry.itemId).select('name sku'), session),
          withSession(MaterialCentre.findById(entry.materialCentreId).select('name code'), session),
        ]);
        const itemLabel = itemDoc ? `${itemDoc.name}${itemDoc.sku ? ` (${itemDoc.sku})` : ''}` : entry.itemId;
        const mcLabel = mcDoc ? `${mcDoc.name}${mcDoc.code ? ` (${mcDoc.code})` : ''}` : entry.materialCentreId;
        throw ApiError.badRequest(
          `Insufficient stock for item ${itemLabel} at MC ${mcLabel}: available=${available}, requested=${entry.quantity}`
        );
      }
    }

    // Create ledger entry
    const created = await InventoryLedger.create(
      [
        {
          businessId: entry.businessId,
          itemId: entry.itemId,
          materialCentreId: entry.materialCentreId,
          voucherId: entry.voucherId,
          voucherType: entry.voucherType,
          voucherNumber: entry.voucherNumber,
          date: entry.date,
          type: entry.type,
          quantity: entry.quantity,
          rate: entry.rate,
          value,
          narration: entry.narration,
        },
      ],
      opts
    );
    ledgerDocs.push(created[0]);

    // Update StockSummary
    const filter = {
      businessId: entry.businessId,
      itemId: entry.itemId,
      materialCentreId: entry.materialCentreId,
    };

    if (entry.type === 'in') {
      const existing = await withSession(StockSummary.findOne(filter), session);

      if (existing) {
        const newQty = existing.quantity + entry.quantity;
        const newValue = existing.totalValue + value;
        const newRate = newQty > 0 ? newValue / newQty : 0;

        await StockSummary.updateOne(
          { _id: existing._id },
          { quantity: newQty, totalValue: newValue, weightedAvgRate: newRate, lastUpdated: new Date() },
          opts
        );
      } else {
        await StockSummary.create(
          [{ ...filter, quantity: entry.quantity, totalValue: value, weightedAvgRate: entry.rate, lastUpdated: new Date() }],
          opts
        );
      }
    } else {
      // OUT: decrement using weighted average rate
      const existing = await withSession(StockSummary.findOne(filter), session);
      if (!existing || existing.quantity < entry.quantity) {
        const [itemDoc, mcDoc] = await Promise.all([
          withSession(Item.findById(entry.itemId).select('name sku'), session),
          withSession(MaterialCentre.findById(entry.materialCentreId).select('name code'), session),
        ]);
        const itemLabel = itemDoc ? `${itemDoc.name}${itemDoc.sku ? ` (${itemDoc.sku})` : ''}` : entry.itemId;
        const mcLabel = mcDoc ? `${mcDoc.name}${mcDoc.code ? ` (${mcDoc.code})` : ''}` : entry.materialCentreId;
        const available = existing?.quantity || 0;
        throw ApiError.badRequest(
          `Insufficient stock for item ${itemLabel} at MC ${mcLabel}: available=${available}, requested=${entry.quantity}`
        );
      }
      const outValue = entry.quantity * existing.weightedAvgRate;
      const newQty = existing.quantity - entry.quantity;
      const newTotalValue = existing.totalValue - outValue;
      const newRate = newQty > 0 ? newTotalValue / newQty : 0;

      await StockSummary.updateOne(
        { _id: existing._id },
        { quantity: newQty, totalValue: Math.max(0, newTotalValue), weightedAvgRate: newRate, lastUpdated: new Date() },
        opts
      );
    }
  }

  return ledgerDocs;
}

/**
 * Reverse all inventory entries for a voucher (used on cancellation).
 */
export async function reverseEntries(voucherId, businessId, session) {
  const originals = await withSession(
    InventoryLedger.find({ voucherId, isReverse: false }),
    session
  );
  if (originals.length === 0) return [];

  const reverseEntryData = originals.map((orig) => ({
    businessId,
    itemId: orig.itemId,
    materialCentreId: orig.materialCentreId,
    voucherId: orig.voucherId,
    voucherType: orig.voucherType,
    voucherNumber: orig.voucherNumber,
    date: new Date(),
    type: orig.type === 'in' ? 'out' : 'in',
    quantity: orig.quantity,
    rate: orig.rate,
    narration: `Reversal: ${orig.narration || ''}`,
  }));

  return postEntries(reverseEntryData, session);
}

export default { postEntries, reverseEntries };

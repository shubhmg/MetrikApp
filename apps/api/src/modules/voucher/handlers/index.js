import { registerHandler } from '../../../engines/voucher.engine.js';
import { VOUCHER_TYPES } from '../../../config/constants.js';
import salesInvoiceHandler from './salesInvoice.handler.js';
import purchaseInvoiceHandler from './purchaseInvoice.handler.js';
import salesReturnHandler from './salesReturn.handler.js';
import purchaseReturnHandler from './purchaseReturn.handler.js';
import paymentHandler from './payment.handler.js';
import receiptHandler from './receipt.handler.js';
import journalHandler from './journal.handler.js';
import stockTransferHandler from './stockTransfer.handler.js';
import grnHandler from './grn.handler.js';
import deliveryNoteHandler from './deliveryNote.handler.js';
import productionHandler from './production.handler.js';
import salesOrderHandler from './salesOrder.handler.js';
import purchaseOrderHandler from './purchaseOrder.handler.js';

export function registerAllHandlers() {
  registerHandler(VOUCHER_TYPES.SALES_INVOICE, salesInvoiceHandler);
  registerHandler(VOUCHER_TYPES.PURCHASE_INVOICE, purchaseInvoiceHandler);
  registerHandler(VOUCHER_TYPES.SALES_RETURN, salesReturnHandler);
  registerHandler(VOUCHER_TYPES.PURCHASE_RETURN, purchaseReturnHandler);
  registerHandler(VOUCHER_TYPES.PAYMENT, paymentHandler);
  registerHandler(VOUCHER_TYPES.RECEIPT, receiptHandler);
  registerHandler(VOUCHER_TYPES.JOURNAL, journalHandler);
  registerHandler(VOUCHER_TYPES.CONTRA, journalHandler);
  registerHandler(VOUCHER_TYPES.STOCK_TRANSFER, stockTransferHandler);
  registerHandler(VOUCHER_TYPES.GRN, grnHandler);
  registerHandler(VOUCHER_TYPES.DELIVERY_NOTE, deliveryNoteHandler);
  registerHandler(VOUCHER_TYPES.PRODUCTION, productionHandler);
  registerHandler(VOUCHER_TYPES.SALES_ORDER, salesOrderHandler);
  registerHandler(VOUCHER_TYPES.PURCHASE_ORDER, purchaseOrderHandler);
}

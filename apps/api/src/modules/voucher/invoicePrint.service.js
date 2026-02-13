import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import Business from '../business/business.model.js';
import Voucher from './voucher.model.js';
import InvoicePrintJob from './invoicePrintJob.model.js';
import env from '../../config/env.js';

function formatDate(date) {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatAmount(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatAmountRounded(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

async function buildInvoicePdfBuffer(voucher, business) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 24 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const left = 32;
    const right = pageWidth - 32;

    doc.lineWidth(1).rect(left, 28, right - left, pageHeight - 56).stroke();

    doc.fontSize(28).font('Helvetica-Bold').text('ESTIMATE', left, 48, { width: right - left, align: 'center' });
    doc.moveTo(left + 8, 88).lineTo(right - 8, 88).stroke();

    doc.fontSize(18).font('Helvetica-Bold').text(business.legalName || business.name || 'Metrik', left + 14, 106);

    doc.fontSize(12).font('Helvetica');
    doc.text('Invoice No:', left + 14, 142);
    doc.text(voucher.voucherNumber || '-', left + 110, 142);
    doc.text('Date:', left + 14, 162);
    doc.text(formatDate(voucher.date), left + 110, 162);
    doc.text('Party:', left + 14, 182);
    doc.text(voucher.partyId?.name || '-', left + 110, 182, { width: right - left - 124 });
    doc.text('MC:', left + 14, 202);
    doc.text(voucher.materialCentreId?.name || '-', left + 110, 202, { width: right - left - 124 });

    doc.moveTo(left + 8, 226).lineTo(right - 8, 226).stroke();

    let y = 248;
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Items', left + 14, y);
    y += 18;

    doc.font('Helvetica');
    voucher.lineItems.forEach((li, idx) => {
      const name = li.itemId?.name || li.itemName || 'Item';
      const amount = Number(li.amount || Number(li.quantity || 0) * Number(li.rate || 0));
      doc.fontSize(11).text(`${idx + 1}. ${name}`, left + 14, y, { width: right - left - 150, ellipsis: true });
      doc.fontSize(11).text(formatAmount(amount), right - 96, y, { width: 80, align: 'right' });
      y += 18;
      if (y > pageHeight - 120) {
        doc.addPage();
        y = 48;
      }
    });

    const totalY = Math.max(y + 10, pageHeight - 118);
    doc.moveTo(left + 8, totalY - 14).lineTo(right - 8, totalY - 14).stroke();
    doc.fontSize(16).font('Helvetica-Bold')
      .text(`Total ${formatAmountRounded(voucher.grandTotal)}`, right - 220, totalY, { width: 200, align: 'right' });
    doc.moveTo(left + 8, pageHeight - 72).lineTo(right - 8, pageHeight - 72).stroke();
    doc.fontSize(10).font('Helvetica').text("Receiver's Sign", left + 14, pageHeight - 58);

    doc.end();
  });
}

async function getInvoiceVoucherForPrint(voucherId, businessId) {
  return Voucher.findOne({
    _id: voucherId,
    businessId,
    voucherType: 'sales_invoice',
  })
    .populate('partyId', 'name')
    .populate('materialCentreId', 'name code invoicePrintEmail autoInvoicePrintEnabled')
    .populate('lineItems.itemId', 'name')
    .lean();
}

export async function getInvoicePdfBuffer(voucherId, businessId) {
  const voucher = await getInvoiceVoucherForPrint(voucherId, businessId);
  if (!voucher) return null;
  const business = await Business.findOne({ _id: businessId }).lean();
  if (!business) return null;
  const pdf = await buildInvoicePdfBuffer(voucher, business);
  return { pdf, voucher };
}

function getTransporter() {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass || !env.smtp.from) return null;
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
}

export async function dispatchInvoiceAutoPrint(voucherId, businessId, userId) {
  const voucher = await getInvoiceVoucherForPrint(voucherId, businessId);

  if (!voucher || voucher.status !== 'posted') return null;

  const business = await Business.findOne({ _id: businessId }).lean();
  if (!business) return null;

  const globalEnabled = business.settings?.features?.invoiceEmailPrintEnabled === true;
  const mcEnabled = voucher.materialCentreId?.autoInvoicePrintEnabled === true;
  const toEmail = voucher.materialCentreId?.invoicePrintEmail;

  if (!globalEnabled || !mcEnabled || !toEmail) {
    return InvoicePrintJob.create({
      businessId,
      voucherId: voucher._id,
      materialCentreId: voucher.materialCentreId?._id,
      toEmail: toEmail || 'not-configured@invalid.local',
      status: 'skipped',
      error: !globalEnabled
        ? 'Business feature disabled'
        : !mcEnabled
          ? 'MC auto print disabled'
          : 'MC print email missing',
      attempts: 0,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  const job = await InvoicePrintJob.create({
    businessId,
    voucherId: voucher._id,
    materialCentreId: voucher.materialCentreId._id,
    toEmail,
    status: 'queued',
    attempts: 0,
    createdBy: userId,
    updatedBy: userId,
  });

  const transporter = getTransporter();
  if (!transporter) {
    job.status = 'failed';
    job.error = 'SMTP is not configured';
    job.attempts = 1;
    await job.save();
    return job;
  }

  try {
    const pdf = await buildInvoicePdfBuffer(voucher, business);
    await transporter.sendMail({
      from: env.smtp.from,
      to: toEmail,
      subject: `Invoice ${voucher.voucherNumber}`,
      text: `Auto print invoice ${voucher.voucherNumber} for ${voucher.materialCentreId?.name || 'material centre'}.`,
      attachments: [
        {
          filename: `${voucher.voucherNumber}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
    });

    job.status = 'sent';
    job.sentAt = new Date();
    job.attempts = 1;
    job.error = '';
    await job.save();
  } catch (err) {
    job.status = 'failed';
    job.attempts = 1;
    job.error = err?.message || 'Email send failed';
    await job.save();
  }

  return job;
}

export function scheduleInvoiceAutoPrint(voucherId, businessId, userId) {
  if (!voucherId || !businessId || !userId) return;
  setImmediate(() => {
    dispatchInvoiceAutoPrint(voucherId, businessId, userId).catch((err) => {
      console.error('Invoice auto print failed:', err?.message || err);
    });
  });
}

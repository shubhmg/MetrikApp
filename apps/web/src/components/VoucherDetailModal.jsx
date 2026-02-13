import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Stack, SimpleGrid, Text, Badge, Table, Group, Button, Textarea } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconDownload, IconShare } from '@tabler/icons-react';
import api from '../services/api.js';
import { usePermission } from '../hooks/usePermission.js';


function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtType(t) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtCurrency(n) {
  return (n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

const ORDER_TYPES = ['sales_order', 'purchase_order'];

export default function VoucherDetailModal({ voucher, onClose, onUpdate }) {
  const navigate = useNavigate();
  const { can } = usePermission();
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [converting, setConverting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const isMobile = useMediaQuery('(max-width: 48em)');

  // Voucher-type-specific permissions
  const vType = voucher?.voucherType;
  const canWriteType = vType ? can(vType, 'write') : false;
  const canDeleteType = vType ? can(vType, 'delete') : false;

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    try {
      await api.post(`/vouchers/${voucher._id}/cancel`, { reason: cancelReason });
      notifications.show({ title: 'Voucher cancelled', color: 'green' });
      setCancelModal(false);
      setCancelReason('');
      onUpdate();
      onClose();
    } catch (err) {
      notifications.show({ title: 'Cancel failed', message: err.response?.data?.message, color: 'red' });
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this order? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/vouchers/${voucher._id}`);
      notifications.show({ title: 'Order deleted', color: 'green' });
      onUpdate();
      onClose();
    } catch (err) {
      notifications.show({ title: 'Delete failed', message: err.response?.data?.message, color: 'red' });
    } finally {
      setDeleting(false);
    }
  }

  async function handleConvertToInvoice() {
    setConverting(true);
    try {
      const res = await api.post(`/vouchers/${voucher._id}/convert-to-invoice`);
      const inv = res.data.data.voucher;
      notifications.show({ title: 'Invoice created', message: inv.voucherNumber, color: 'green' });
      onUpdate();
      onClose();
    } catch (err) {
      notifications.show({ title: 'Conversion failed', message: err.response?.data?.message, color: 'red' });
    } finally {
      setConverting(false);
    }
  }

  async function fetchInvoicePdf() {
    const res = await api.get(`/vouchers/${voucher._id}/invoice-pdf`, { responseType: 'blob' });
    return new Blob([res.data], { type: 'application/pdf' });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handlePreviewPdf() {
    try {
      const blob = await fetchInvoicePdf();
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        downloadBlob(blob, `${voucher.voucherNumber || 'invoice'}.pdf`);
      } else {
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch (err) {
      notifications.show({ title: 'Preview failed', message: err.response?.data?.message || err.message, color: 'red' });
    }
  }

  async function handleSharePdf() {
    setSharing(true);
    try {
      const blob = await fetchInvoicePdf();
      const filename = `${voucher.voucherNumber || 'invoice'}.pdf`;
      const file = new File([blob], filename, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Invoice ${voucher.voucherNumber || ''}`.trim(),
          text: 'Sales invoice PDF',
          files: [file],
        });
      } else {
        downloadBlob(blob, filename);
        notifications.show({ title: 'Downloaded', message: 'Share is not available on this device/browser.', color: 'blue' });
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        notifications.show({ title: 'Share failed', message: err.response?.data?.message || err.message, color: 'red' });
      }
    } finally {
      setSharing(false);
    }
  }

  if (!voucher) return null;

  const isAccountBased = ['payment', 'receipt', 'journal', 'contra'].includes(voucher.voucherType);

  return (
    <>
      <Modal opened={!!voucher} onClose={onClose} title={voucher.voucherNumber} centered size="lg" fullScreen={isMobile}>
        <Stack>
            <SimpleGrid cols={2}>
              <Text size="sm"><strong>Type:</strong> {fmtType(voucher.voucherType)}</Text>
              <Text size="sm"><strong>Date:</strong> {fmtDate(voucher.date)}</Text>
              {voucher.status === 'cancelled' && <Text size="sm"><strong>Status:</strong> <Badge color="red" variant="light" size="sm">cancelled</Badge></Text>}
              <Text size="sm"><strong>Party:</strong> {voucher.partyId?.name || '-'}</Text>
              <Text size="sm"><strong>MC:</strong> {voucher.materialCentreId?.name || '-'}</Text>
              <Text size="sm"><strong>FY:</strong> {voucher.financialYear}</Text>
            </SimpleGrid>

            {voucher.narration && <Text size="sm" c="dimmed" fs="italic">{voucher.narration}</Text>}

            <Text fw={600} size="sm">Line Items</Text>
            {isAccountBased ? (
              <Table striped withTableBorder size="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Account</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Debit</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Credit</Table.Th>
                    <Table.Th>Narration</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {voucher.lineItems.map((li, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>{li.accountId?.name || '-'}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{li.debit ? fmtCurrency(li.debit) : '-'}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{li.credit ? fmtCurrency(li.credit) : '-'}</Table.Td>
                      <Table.Td>{li.narration || '-'}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Table striped withTableBorder size="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Item</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Qty</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Rate</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Tax</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {voucher.lineItems.map((li, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>{li.itemId?.name || li.itemName || '-'}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{li.quantity || '-'}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{li.rate?.toLocaleString('en-IN') || '-'}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{li.amount?.toLocaleString('en-IN') || '-'}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{li.taxAmount?.toLocaleString('en-IN') || '-'}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}

            <Group justify="space-between">
              <div />
              <Text fw={700} size="lg">Total: {fmtCurrency(voucher.grandTotal)}</Text>
            </Group>

            {voucher.linkedVouchers?.length > 0 && (
              <>
                <Text fw={600} size="sm">Linked Vouchers</Text>
                <Group gap="xs">
                  {voucher.linkedVouchers.map((lv, i) => (
                    <Badge key={i} variant="outline" color="teal" size="lg">
                      {lv.voucherId?.voucherNumber || lv.voucherId} — {lv.relationship?.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </Group>
              </>
            )}

            <Group justify="flex-end">
              {voucher.voucherType === 'sales_invoice' && (
                <>
                  <Button variant="default" leftSection={<IconDownload size={16} />} onClick={handlePreviewPdf}>
                    Preview PDF
                  </Button>
                  <Button variant="light" leftSection={<IconShare size={16} />} onClick={handleSharePdf} loading={sharing}>
                    Share PDF
                  </Button>
                </>
              )}
              {voucher.status === 'posted' && canWriteType && (
                <Button variant="light" onClick={() => { navigate(`/vouchers/${voucher._id}/edit`); onClose(); }}>
                  Edit
                </Button>
              )}
              {ORDER_TYPES.includes(voucher.voucherType) ? (
                <>
                  {canDeleteType && <Button color="red" loading={deleting} onClick={handleDelete}>Delete</Button>}
                  {canWriteType && <Button color="teal" loading={converting} onClick={handleConvertToInvoice}>
                    Convert to Invoice
                  </Button>}
                </>
              ) : (
                voucher.status === 'posted' && canDeleteType && <Button color="red" onClick={() => { setCancelModal(true); setCancelReason(''); }}>Cancel Voucher</Button>
              )}
            </Group>
        </Stack>
      </Modal>

      <Modal opened={cancelModal} onClose={() => setCancelModal(false)} title="Cancel Voucher" centered size="sm">
        <Stack>
          <Textarea label="Cancellation Reason" required value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} minRows={3} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCancelModal(false)}>Back</Button>
            <Button color="red" onClick={handleCancel} disabled={!cancelReason.trim()}>Confirm Cancel</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

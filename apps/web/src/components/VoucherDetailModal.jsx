import { useState } from 'react';
import { Modal, Stack, SimpleGrid, Text, Badge, Table, Group, Button, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import api from '../services/api.js';

const STATUS_COLORS = { draft: 'yellow', posted: 'green', cancelled: 'red' };

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtType(t) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtCurrency(n) {
  return (n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

export default function VoucherDetailModal({ voucher, onClose, onUpdate }) {
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  async function handlePost() {
    try {
      await api.post(`/vouchers/${voucher._id}/post`);
      notifications.show({ title: 'Voucher posted', color: 'green' });
      onUpdate();
      onClose();
    } catch (err) {
      notifications.show({ title: 'Post failed', message: err.response?.data?.message, color: 'red' });
    }
  }

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

  if (!voucher) return null;

  return (
    <>
      <Modal opened={!!voucher} onClose={onClose} title={voucher.voucherNumber} centered size="lg">
        <Stack>
            <SimpleGrid cols={2}>
              <Text size="sm"><strong>Type:</strong> {fmtType(voucher.voucherType)}</Text>
              <Text size="sm"><strong>Date:</strong> {fmtDate(voucher.date)}</Text>
              <Text size="sm"><strong>Status:</strong> <Badge color={STATUS_COLORS[voucher.status]} variant="light" size="sm">{voucher.status}</Badge></Text>
              <Text size="sm"><strong>Party:</strong> {voucher.partyId?.name || '-'}</Text>
              <Text size="sm"><strong>MC:</strong> {voucher.materialCentreId?.name || '-'}</Text>
              <Text size="sm"><strong>FY:</strong> {voucher.financialYear}</Text>
            </SimpleGrid>

            {voucher.narration && <Text size="sm" c="dimmed" fs="italic">{voucher.narration}</Text>}

            <Text fw={600} size="sm">Line Items</Text>
            <Table striped withTableBorder size="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Item / Account</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Qty</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Rate</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Tax</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {voucher.lineItems.map((li, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>{li.itemId?.name || li.itemName || li.accountId?.name || '-'}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{li.quantity || '-'}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{li.rate?.toLocaleString('en-IN') || '-'}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{li.amount?.toLocaleString('en-IN') || '-'}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{li.taxAmount?.toLocaleString('en-IN') || '-'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            <SimpleGrid cols={2}>
              <div />
              <Stack gap={4}>
                <Group justify="space-between"><Text size="sm">Subtotal:</Text><Text size="sm">{fmtCurrency(voucher.subtotal)}</Text></Group>
                <Group justify="space-between"><Text size="sm">Discount:</Text><Text size="sm">{fmtCurrency(voucher.totalDiscount)}</Text></Group>
                <Group justify="space-between"><Text size="sm">Tax:</Text><Text size="sm">{fmtCurrency(voucher.totalTax)}</Text></Group>
                <Group justify="space-between"><Text fw={700}>Grand Total:</Text><Text fw={700}>{fmtCurrency(voucher.grandTotal)}</Text></Group>
              </Stack>
            </SimpleGrid>

            <Group justify="flex-end">
              {voucher.status === 'draft' && <Button onClick={handlePost}>Post Voucher</Button>}
              {voucher.status === 'posted' && <Button color="red" onClick={() => { setCancelModal(true); setCancelReason(''); }}>Cancel Voucher</Button>}
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

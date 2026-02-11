import { useState } from 'react';
import { Modal, Stack, SimpleGrid, Text, Badge, Table, Group, Button, Textarea, Box, Card } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import api from '../services/api.js';


function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCurrency(n) {
  return (n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

export default function ProductionDetailModal({ voucher, onClose, onUpdate }) {
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const isMobile = useMediaQuery('(max-width: 48em)');

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    try {
      await api.post(`/vouchers/${voucher._id}/cancel`, { reason: cancelReason });
      notifications.show({ title: 'Production cancelled', color: 'green' });
      setCancelModal(false);
      setCancelReason('');
      onUpdate();
      onClose();
    } catch (err) {
      notifications.show({ title: 'Cancel failed', message: err.response?.data?.message, color: 'red' });
    }
  }

  if (!voucher) return null;

  const output = voucher.lineItems[0];
  const inputs = voucher.lineItems.slice(1);
  const totalInputCost = inputs.reduce((sum, li) => sum + (li.quantity * li.rate), 0);
  const outputCostPerUnit = output.quantity > 0 ? totalInputCost / output.quantity : 0;

  return (
    <>
      <Modal opened={!!voucher} onClose={onClose} title={voucher.voucherNumber} centered size="lg" fullScreen={isMobile}>
        <Stack>
          <SimpleGrid cols={2}>
            <Text size="sm"><strong>Date:</strong> {fmtDate(voucher.date)}</Text>
            {voucher.status === 'cancelled' && (
              <Text size="sm">
                <strong>Status:</strong>{' '}
                <Badge color="red" variant="light" size="sm">cancelled</Badge>
              </Text>
            )}
            <Text size="sm"><strong>MC:</strong> {voucher.materialCentreId?.name || '-'}</Text>
            <Text size="sm"><strong>FY:</strong> {voucher.financialYear}</Text>
          </SimpleGrid>

          {voucher.bomId && (
            <Badge variant="light" color="teal" size="md" style={{ alignSelf: 'flex-start' }}>
              BOM: {voucher.bomId.name} v{voucher.bomId.version}
            </Badge>
          )}

          {voucher.narration && <Text size="sm" c="dimmed" fs="italic">{voucher.narration}</Text>}

          <Text fw={600} size="sm">Output</Text>
          <Card withBorder padding="sm" radius="md" style={{ borderLeft: '4px solid var(--mantine-color-green-6)' }}>
            <Group justify="space-between">
              <Box>
                <Text fw={500}>{output.itemId?.name || output.itemName || '-'}</Text>
                <Text size="xs" c="dimmed">Produced</Text>
              </Box>
              <Box style={{ textAlign: 'right' }}>
                <Text fw={600}>{output.quantity} {output.itemId?.unit || ''}</Text>
                <Text size="sm" c="dimmed">@ {fmtCurrency(output.rate || outputCostPerUnit)}/unit</Text>
                <Text size="sm" fw={500}>{fmtCurrency(output.quantity * (output.rate || outputCostPerUnit))}</Text>
              </Box>
            </Group>
          </Card>

          <Text fw={600} size="sm">Inputs ({inputs.length})</Text>
          <Table striped withTableBorder size="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th></Table.Th>
                <Table.Th>Item</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Qty</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Rate</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {inputs.map((li, i) => (
                <Table.Tr key={i}>
                  <Table.Td style={{ width: 4, padding: 0, backgroundColor: 'var(--mantine-color-orange-5)' }} />
                  <Table.Td>{li.itemId?.name || li.itemName || '-'}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>{li.quantity} {li.itemId?.unit || ''}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>{fmtCurrency(li.rate)}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>{fmtCurrency(li.quantity * li.rate)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <Card withBorder padding="sm" radius="md" bg="var(--app-surface-elevated)">
            <Text fw={600} size="sm" mb="xs">Cost Summary</Text>
            <SimpleGrid cols={2}>
              <Text size="sm">Total input cost</Text>
              <Text size="sm" ta="right" fw={500}>{fmtCurrency(totalInputCost)}</Text>
              <Text size="sm">Output cost/unit</Text>
              <Text size="sm" ta="right" fw={500}>{fmtCurrency(outputCostPerUnit)}</Text>
            </SimpleGrid>
          </Card>

          <Group justify="flex-end">
            {voucher.status === 'posted' && (
              <Button color="red" onClick={() => { setCancelModal(true); setCancelReason(''); }}>
                Cancel Production
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>

      <Modal opened={cancelModal} onClose={() => setCancelModal(false)} title="Cancel Production" centered size="sm">
        <Stack>
          <Textarea
            label="Cancellation Reason"
            required
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            minRows={3}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCancelModal(false)}>Back</Button>
            <Button color="red" onClick={handleCancel} disabled={!cancelReason.trim()}>Confirm Cancel</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

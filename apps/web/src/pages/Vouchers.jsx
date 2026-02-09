import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  Button,
  Group,
  Badge,
  Modal,
  Table,
  Text,
  Textarea,
  Stack,
  SimpleGrid,
  Pagination,
  Center,
  Loader,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import api from '../services/api.js';

const VOUCHER_TYPES = [
  { value: 'sales_invoice', label: 'Sales Invoice' },
  { value: 'purchase_invoice', label: 'Purchase Invoice' },
  { value: 'sales_return', label: 'Sales Return' },
  { value: 'purchase_return', label: 'Purchase Return' },
  { value: 'payment', label: 'Payment' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'journal', label: 'Journal' },
  { value: 'contra', label: 'Contra' },
  { value: 'stock_transfer', label: 'Stock Transfer' },
  { value: 'grn', label: 'GRN' },
  { value: 'delivery_note', label: 'Delivery Note' },
  { value: 'production', label: 'Production' },
  { value: 'sales_order', label: 'Sales Order' },
  { value: 'purchase_order', label: 'Purchase Order' },
];

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

export default function Vouchers() {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => { loadVouchers(); }, [page, typeFilter, statusFilter]);

  async function loadVouchers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (typeFilter) params.set('voucherType', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/vouchers?${params}`);
      setVouchers(data.data.vouchers);
      setTotal(data.data.total);
      setTotalPages(data.data.totalPages);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handlePost(id) {
    try {
      await api.post(`/vouchers/${id}/post`);
      notifications.show({ title: 'Voucher posted', color: 'green' });
      loadVouchers();
      setSelected(null);
    } catch (err) {
      notifications.show({ title: 'Post failed', message: err.response?.data?.message, color: 'red' });
    }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    try {
      await api.post(`/vouchers/${cancelModal}/cancel`, { reason: cancelReason });
      notifications.show({ title: 'Voucher cancelled', color: 'green' });
      setCancelModal(null);
      setCancelReason('');
      loadVouchers();
      setSelected(null);
    } catch (err) {
      notifications.show({ title: 'Cancel failed', message: err.response?.data?.message, color: 'red' });
    }
  }

  async function viewDetail(row) {
    try {
      const { data } = await api.get(`/vouchers/${row._id}`);
      setSelected(data.data.voucher);
    } catch { /* ignore */ }
  }

  const columns = [
    { key: 'voucherNumber', label: 'Number', render: (r) => <Text ff="monospace" size="sm">{r.voucherNumber}</Text> },
    { key: 'voucherType', label: 'Type', render: (r) => fmtType(r.voucherType) },
    { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
    { key: 'party', label: 'Party', render: (r) => r.partyId?.name || '-' },
    { key: 'grandTotal', label: 'Total', render: (r) => fmtCurrency(r.grandTotal), style: { textAlign: 'right' } },
    {
      key: 'status', label: 'Status',
      render: (r) => <Badge color={STATUS_COLORS[r.status] || 'gray'} variant="light">{r.status}</Badge>,
    },
    {
      key: 'actions', label: '',
      render: (r) => (
        <Group gap={4} onClick={(e) => e.stopPropagation()}>
          {r.status === 'draft' && <Button size="xs" variant="light" onClick={() => handlePost(r._id)}>Post</Button>}
          {r.status === 'posted' && <Button size="xs" variant="light" color="red" onClick={() => { setCancelModal(r._id); setCancelReason(''); }}>Cancel</Button>}
        </Group>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Vouchers" count={total} actionLabel="New Voucher" onAction={() => navigate('/vouchers/new')}>
        <Select
          placeholder="All Types"
          data={VOUCHER_TYPES}
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v); setPage(1); }}
          clearable
          searchable
          w={180}
        />
        <Select
          placeholder="All Status"
          data={[{ value: 'draft', label: 'Draft' }, { value: 'posted', label: 'Posted' }, { value: 'cancelled', label: 'Cancelled' }]}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          clearable
          w={140}
        />
      </PageHeader>

      <DataTable columns={columns} data={vouchers} loading={loading} emptyMessage="No vouchers found" onRowClick={viewDetail} />

      {totalPages > 1 && (
        <Center mt="md">
          <Pagination value={page} onChange={setPage} total={totalPages} />
        </Center>
      )}

      {/* Detail Modal */}
      <Modal opened={!!selected} onClose={() => setSelected(null)} title={selected?.voucherNumber} centered size="lg">
        {selected && (
          <Stack>
            <SimpleGrid cols={2}>
              <Text size="sm"><strong>Type:</strong> {fmtType(selected.voucherType)}</Text>
              <Text size="sm"><strong>Date:</strong> {fmtDate(selected.date)}</Text>
              <Text size="sm"><strong>Status:</strong> <Badge color={STATUS_COLORS[selected.status]} variant="light" size="sm">{selected.status}</Badge></Text>
              <Text size="sm"><strong>Party:</strong> {selected.partyId?.name || '-'}</Text>
              <Text size="sm"><strong>MC:</strong> {selected.materialCentreId?.name || '-'}</Text>
              <Text size="sm"><strong>FY:</strong> {selected.financialYear}</Text>
            </SimpleGrid>

            {selected.narration && <Text size="sm" c="dimmed" fs="italic">{selected.narration}</Text>}

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
                {selected.lineItems.map((li, i) => (
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
                <Group justify="space-between"><Text size="sm">Subtotal:</Text><Text size="sm">{fmtCurrency(selected.subtotal)}</Text></Group>
                <Group justify="space-between"><Text size="sm">Discount:</Text><Text size="sm">{fmtCurrency(selected.totalDiscount)}</Text></Group>
                <Group justify="space-between"><Text size="sm">Tax:</Text><Text size="sm">{fmtCurrency(selected.totalTax)}</Text></Group>
                <Group justify="space-between"><Text fw={700}>Grand Total:</Text><Text fw={700}>{fmtCurrency(selected.grandTotal)}</Text></Group>
              </Stack>
            </SimpleGrid>

            <Group justify="flex-end">
              {selected.status === 'draft' && <Button onClick={() => handlePost(selected._id)}>Post Voucher</Button>}
              {selected.status === 'posted' && <Button color="red" onClick={() => { setCancelModal(selected._id); setCancelReason(''); }}>Cancel Voucher</Button>}
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Cancel Reason Modal */}
      <Modal opened={!!cancelModal} onClose={() => setCancelModal(null)} title="Cancel Voucher" centered size="sm">
        <Stack>
          <Textarea label="Cancellation Reason" required value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} minRows={3} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCancelModal(null)}>Back</Button>
            <Button color="red" onClick={handleCancel} disabled={!cancelReason.trim()}>Confirm Cancel</Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Center, Loader, Pagination, Select, Box, Card, Stack, Group, Text, ActionIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconEdit } from '@tabler/icons-react';
import PageHeader from '../components/PageHeader.jsx';
import VoucherDetailModal from '../components/VoucherDetailModal.jsx';
import api from '../services/api.js';

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCurrency(n) {
  return (n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

function OrderCard({ voucher, onView, onDelete, onEdit }) {
  const items = voucher.lineItems || [];

  return (
    <Box
      p="sm"
      style={{
        cursor: 'pointer',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-0)'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      onClick={() => onView(voucher)}
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" mb={2}>
            <Text size="sm" fw={600}>{voucher.partyId?.name || 'No Party'}</Text>
            {voucher.materialCentreId?.name && (
              <Text size="xs" c="blue" fw={500}>{voucher.materialCentreId.name}</Text>
            )}
          </Group>
          <Text size="xs" c="dimmed" ff="monospace" mb={4}>{voucher.voucherNumber}</Text>
          <Stack gap={2}>
            {items.map((li, i) => (
              <Group key={i} gap="xs">
                <Text size="xs" c="dimmed" lineClamp={1} style={{ flex: 1 }}>
                  {li.itemId?.name || li.itemName || '-'}
                </Text>
                <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                  {li.quantity} × {li.rate?.toLocaleString('en-IN')}
                </Text>
              </Group>
            ))}
          </Stack>
        </Box>
        <Stack align="flex-end" gap={4}>
          <Text size="sm" fw={700}>{fmtCurrency(voucher.grandTotal)}</Text>
          <Group gap={4}>
            <ActionIcon
              variant="subtle"
              color="blue"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onEdit(voucher); }}
            >
              <IconEdit size={14} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDelete(voucher); }}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        </Stack>
      </Group>
    </Box>
  );
}

function OrderGroup({ date, vouchers, onView, onDelete, onEdit }) {
  return (
    <Box mb="md">
      <Text c="dimmed" size="xs" fw={700} mb="xs" tt="uppercase" style={{ letterSpacing: 0.5 }}>
        {date}
      </Text>
      <Card withBorder padding={0} radius="md">
        <Stack gap={0}>
          {vouchers.map((v, i) => (
            <Box
              key={v._id}
              style={{ borderBottom: i < vouchers.length - 1 ? '1px solid var(--mantine-color-gray-3)' : 'none' }}
            >
              <OrderCard voucher={v} onView={onView} onDelete={onDelete} onEdit={onEdit} />
            </Box>
          ))}
        </Stack>
      </Card>
    </Box>
  );
}

export default function SalesOrders() {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [mcFilter, setMcFilter] = useState(null);
  const [mcs, setMcs] = useState([]);

  useEffect(() => {
    api.get('/material-centres').then(({ data }) => setMcs(data.data.materialCentres)).catch(() => {});
  }, []);

  useEffect(() => { loadVouchers(); }, [page, mcFilter]);

  async function loadVouchers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50, voucherType: 'sales_order' });
      if (mcFilter) params.set('materialCentreId', mcFilter);
      const { data } = await api.get(`/vouchers?${params}`);
      setVouchers(data.data.vouchers);
      setTotal(data.data.total);
      setTotalPages(data.data.totalPages);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function viewDetail(row) {
    try {
      const { data } = await api.get(`/vouchers/${row._id}`);
      setSelected(data.data.voucher);
    } catch { /* ignore */ }
  }

  async function handleDelete(voucher) {
    if (!confirm(`Delete order ${voucher.voucherNumber}?`)) return;
    try {
      await api.delete(`/vouchers/${voucher._id}`);
      notifications.show({ title: 'Order deleted', color: 'green' });
      loadVouchers();
    } catch (err) {
      notifications.show({ title: 'Delete failed', message: err.response?.data?.message, color: 'red' });
    }
  }

  function handleEdit(voucher) {
    navigate(`/vouchers/${voucher._id}/edit`);
  }

  const grouped = useMemo(() => {
    const groups = {};
    vouchers.forEach((v) => {
      const d = fmtDate(v.date);
      if (!groups[d]) groups[d] = [];
      groups[d].push(v);
    });
    return groups;
  }, [vouchers]);

  const mcOptions = mcs.map((mc) => ({ value: mc._id, label: mc.name }));

  return (
    <div>
      <PageHeader
        title="Sales Orders"
        count={total}
        actionLabel="New Order"
        onAction={() => navigate('/vouchers/new?type=sales_order')}
      >
        <Select
          placeholder="All MCs"
          size="sm"
          clearable
          searchable
          value={mcFilter}
          onChange={(val) => { setMcFilter(val); setPage(1); }}
          data={mcOptions}
          style={{ width: 180 }}
        />
      </PageHeader>

      {loading ? (
        <Center py="xl"><Loader /></Center>
      ) : vouchers.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">No sales orders found</Text>
      ) : (
        <>
          {Object.entries(grouped).map(([date, list]) => (
            <OrderGroup key={date} date={date} vouchers={list} onView={viewDetail} onDelete={handleDelete} onEdit={handleEdit} />
          ))}
          {totalPages > 1 && (
            <Center mt="md">
              <Pagination value={page} onChange={setPage} total={totalPages} />
            </Center>
          )}
        </>
      )}

      <VoucherDetailModal
        voucher={selected}
        onClose={() => setSelected(null)}
        onUpdate={loadVouchers}
      />
    </div>
  );
}

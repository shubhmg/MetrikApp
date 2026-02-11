import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Center, Loader, Pagination, Select, Box, Stack, Group, Text, ActionIcon } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconTrash } from '@tabler/icons-react';
import PageHeader from '../components/PageHeader.jsx';
import VoucherDetailModal from '../components/VoucherDetailModal.jsx';
import ConfirmDelete from '../components/ConfirmDelete.jsx';
import api from '../services/api.js';
import { usePermission } from '../hooks/usePermission.js';

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCurrency(n) {
  return (n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

function OrderCard({ voucher, onView, onDelete, canDelete }) {
  const items = voucher.lineItems || [];
  const shownItems = items.slice(0, 3);
  const extraCount = items.length - shownItems.length;

  return (
    <Box
      p="sm"
      style={{
        cursor: 'pointer',
        backgroundColor: 'var(--app-surface-elevated)',
        borderRadius: 'var(--mantine-radius-md)',
      }}
      onClick={() => onView(voucher)}
    >
      <Group justify="space-between" wrap="nowrap" align="center">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap" align="center" mb={6}>
            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
              <Text size="sm" fw={600} lineClamp={1}>{voucher.partyId?.name || 'No Party'}</Text>
              {voucher.materialCentreId?.name && (
                <Text size="xs" c="teal" fw={600} lineClamp={1}>
                  [{voucher.materialCentreId.name}]
                </Text>
              )}
            </Group>
          </Group>
          <Stack gap={4}>
            {shownItems.map((li, i) => (
              <Group key={i} gap="xs" wrap="nowrap" justify="space-between">
                <Text size="xs" c="dimmed" lineClamp={1} style={{ flex: 1 }}>
                  {li.itemId?.name || li.itemName || '-'}
                </Text>
                <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                  {li.quantity} {li.itemId?.unit || li.unit || ''}
                </Text>
              </Group>
            ))}
            {extraCount > 0 && (
              <Text size="xs" c="dimmed">+{extraCount} more item{extraCount > 1 ? 's' : ''}</Text>
            )}
          </Stack>
          <Box
            mt={8}
            pt={6}
            style={{
              borderTop: '1px solid var(--mantine-color-default-border)',
              marginInline: 4,
            }}
          >
            <Group gap="xs" wrap="nowrap" justify="space-between">
              <Text size="xs" c="dimmed">
                Added on: <Text span fw={600} c="dimmed">{fmtDateTime(voucher.createdAt)}</Text>
              </Text>
              <Text size="xs" fw={600} c="dimmed" lineClamp={1}>
                {voucher.createdBy?.name || '-'}
              </Text>
            </Group>
          </Box>
        </Box>
        {canDelete && <ActionIcon
          variant="subtle"
          color="red"
          size="lg"
          onClick={(e) => { e.stopPropagation(); onDelete(voucher); }}
          aria-label="Delete order"
        >
          <IconTrash size={18} />
        </ActionIcon>}
      </Group>
    </Box>
  );
}

function OrderGroup({ date, vouchers, onView, onDelete, canDelete }) {
  return (
    <Box mb="md">
      <Text c="dimmed" size="xs" fw={700} mb="xs" tt="uppercase" style={{ letterSpacing: 0.5 }}>
        {date}
      </Text>
      <Stack gap="sm">
        {vouchers.map((v) => (
          <OrderCard key={v._id} voucher={v} onView={onView} onDelete={onDelete} canDelete={canDelete} />
        ))}
      </Stack>
    </Box>
  );
}

export default function SalesOrders() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const canWrite = can('sales_order', 'write');
  const canDeleteSO = can('sales_order', 'delete');
  const [vouchers, setVouchers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [mcFilter, setMcFilter] = useState(null);
  const [mcs, setMcs] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const isMobile = useMediaQuery('(max-width: 48em)');

  useEffect(() => {
    api.get('/material-centres/lookup').then(({ data }) => setMcs(data.data.materialCentres)).catch(() => {});
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
    try {
      setDeleting(true);
      await api.delete(`/vouchers/${voucher._id}`);
      notifications.show({ title: 'Order deleted', color: 'green' });
      loadVouchers();
    } catch (err) {
      notifications.show({ title: 'Delete failed', message: err.response?.data?.message, color: 'red' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
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
        actionLabel={canWrite ? "New Order" : null}
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
          style={{ width: isMobile ? '100%' : 180 }}
        />
      </PageHeader>

      {loading ? (
        <Center py="xl"><Loader /></Center>
      ) : vouchers.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">No sales orders found</Text>
      ) : (
        <>
          {Object.entries(grouped).map(([date, list]) => (
            <OrderGroup key={date} date={date} vouchers={list} onView={viewDetail} onDelete={setDeleteTarget} canDelete={canDeleteSO} />
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

      <ConfirmDelete
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget)}
        loading={deleting}
        name={deleteTarget?.voucherNumber || deleteTarget?.partyId?.name || 'this order'}
      />
    </div>
  );
}

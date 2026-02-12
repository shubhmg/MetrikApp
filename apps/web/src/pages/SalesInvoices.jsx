import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Center, Loader, Pagination, Box, Group, Stack, Text, Badge } from '@mantine/core';
import PageHeader from '../components/PageHeader.jsx';
import VoucherDetailModal from '../components/VoucherDetailModal.jsx';
import api from '../services/api.js';
import { usePermission } from '../hooks/usePermission.js';

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function InvoiceCard({ voucher, onView }) {
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
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap" align="center" mb={6}>
            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
              <Text size="sm" fw={600} lineClamp={1}>{voucher.partyId?.name || 'No Party'}</Text>
              {voucher.materialCentreId?.name && (
                <Text size="xs" c="teal" fw={600} lineClamp={1}>
                  [{voucher.materialCentreId.name}]
                </Text>
              )}
              <Text size="xs" c="dimmed" ff="monospace">{voucher.voucherNumber}</Text>
              {voucher.status === 'cancelled' && <Badge size="xs" color="red" variant="light">Cancelled</Badge>}
            </Group>
          </Group>
          <Stack gap={4}>
            {shownItems.map((li, i) => (
              <Group key={i} gap="xs" wrap="nowrap" justify="space-between">
                <Text size="xs" c="dimmed" lineClamp={1} style={{ flex: 1 }}>
                  {li.itemId?.name || li.itemName || '-'}
                </Text>
                <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                  {li.quantity} {li.itemId?.unit || ''}
                </Text>
              </Group>
            ))}
            {extraCount > 0 && (
              <Text size="xs" c="dimmed">+{extraCount} more item{extraCount > 1 ? 's' : ''}</Text>
            )}
          </Stack>
        </Box>
      </Group>
    </Box>
  );
}

function InvoiceGroup({ date, vouchers, onView }) {
  return (
    <Box mb="md">
      <Text c="dimmed" size="xs" fw={700} mb="xs" tt="uppercase" style={{ letterSpacing: 0.5 }}>
        {date}
      </Text>
      <Stack gap="sm">
        {vouchers.map((v) => (
          <InvoiceCard key={v._id} voucher={v} onView={onView} />
        ))}
      </Stack>
    </Box>
  );
}

export default function SalesInvoices() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const canWrite = can('sales_invoice', 'write');
  const [vouchers, setVouchers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => { loadVouchers(); }, [page]);

  async function loadVouchers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50, voucherType: 'sales_invoice' });
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

  const grouped = useMemo(() => {
    const groups = {};
    vouchers.forEach((v) => {
      const d = fmtDate(v.date);
      if (!groups[d]) groups[d] = [];
      groups[d].push(v);
    });
    return groups;
  }, [vouchers]);

  return (
    <div>
      <PageHeader 
        title="Sales Invoices" 
        count={total} 
        actionLabel={canWrite ? "New Invoice" : null}
        onAction={() => navigate('/vouchers/new?type=sales_invoice')} 
      />

      {loading ? (
        <Center py="xl"><Loader /></Center>
      ) : (
        <>
          {Object.entries(grouped).map(([date, list]) => (
            <InvoiceGroup key={date} date={date} vouchers={list} onView={viewDetail} />
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

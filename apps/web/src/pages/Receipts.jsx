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

function fmtDateTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ReceiptCard({ voucher, onView }) {
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
              <Text size="sm" fw={600} lineClamp={1}>{voucher.partyId?.name || 'Cash Receipt'}</Text>
              <Text size="xs" c="teal" fw={600} ff="monospace">{voucher.voucherNumber}</Text>
              {voucher.status === 'cancelled' && <Badge size="xs" color="red" variant="light">Cancelled</Badge>}
            </Group>
            <Text size="sm" fw={700}>{(voucher.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </Group>
          <Text size="xs" c="dimmed">
            {voucher.lineItems?.length || 0} account line{(voucher.lineItems?.length || 0) === 1 ? '' : 's'}
          </Text>
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
      </Group>
    </Box>
  );
}

function ReceiptGroup({ date, vouchers, onView }) {
  return (
    <Box mb="md">
      <Text c="dimmed" size="xs" fw={700} mb="xs" tt="uppercase" style={{ letterSpacing: 0.5 }}>
        {date}
      </Text>
      <Stack gap="sm">
        {vouchers.map((v) => (
          <ReceiptCard key={v._id} voucher={v} onView={onView} />
        ))}
      </Stack>
    </Box>
  );
}

export default function Receipts() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const canWrite = can('receipt', 'write');
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
      const params = new URLSearchParams({ page, limit: 50, voucherType: 'receipt' });
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
        title="Receipts" 
        count={total} 
        actionLabel={canWrite ? "New Receipt" : null}
        onAction={() => navigate('/vouchers/new?type=receipt')} 
      />

      {loading ? (
        <Center py="xl"><Loader /></Center>
      ) : (
        <>
          {Object.entries(grouped).map(([date, list]) => (
            <ReceiptGroup key={date} date={date} vouchers={list} onView={viewDetail} />
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

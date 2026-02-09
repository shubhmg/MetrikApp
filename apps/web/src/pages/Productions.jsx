import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Center, Loader, Pagination, Box, Card, Stack, Group, Text, Badge, Select } from '@mantine/core';
import PageHeader from '../components/PageHeader.jsx';
import ProductionDetailModal from '../components/ProductionDetailModal.jsx';
import api from '../services/api.js';

const STATUS_COLORS = { draft: 'yellow', posted: 'green', cancelled: 'red' };

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ProductionGroup({ date, vouchers, onClick }) {
  return (
    <Box mb="md">
      <Text c="dimmed" size="xs" fw={700} mb="xs" tt="uppercase" style={{ letterSpacing: 0.5 }}>
        {date}
      </Text>
      <Card withBorder padding={0} radius="md">
        <Stack gap={0}>
          {vouchers.map((v, i) => {
            const output = v.lineItems?.[0];
            const inputCount = (v.lineItems?.length || 1) - 1;

            return (
              <Box
                key={v._id}
                p="sm"
                onClick={() => onClick(v)}
                style={{
                  cursor: 'pointer',
                  borderBottom: i < vouchers.length - 1 ? '1px solid var(--mantine-color-gray-3)' : 'none',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-0)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Box>
                    <Text size="sm" fw={500}>{output?.itemId?.name || output?.itemName || 'Unknown Output'}</Text>
                    <Group gap="xs">
                      <Text size="xs" c="dimmed" ff="monospace">{v.voucherNumber}</Text>
                      <Badge size="xs" variant="dot" color={STATUS_COLORS[v.status]}>{v.status}</Badge>
                    </Group>
                  </Box>
                  <Box style={{ textAlign: 'right' }}>
                    <Text size="sm" fw={600}>
                      {output?.quantity || 0} {output?.itemId?.unit || ''}
                    </Text>
                    <Group gap={4} justify="flex-end">
                      <Text size="xs" c="dimmed">{inputCount} input{inputCount !== 1 ? 's' : ''}</Text>
                      {v.bomId && (
                        <Badge size="xs" variant="light" color="violet">BOM</Badge>
                      )}
                    </Group>
                  </Box>
                </Group>
              </Box>
            );
          })}
        </Stack>
      </Card>
    </Box>
  );
}

export default function Productions() {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);

  useEffect(() => { loadVouchers(); }, [page, statusFilter]);

  async function loadVouchers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50, voucherType: 'production' });
      if (statusFilter) params.set('status', statusFilter);
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

  const groupedVouchers = useMemo(() => {
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
        title="Productions"
        count={total}
        actionLabel="New Production"
        onAction={() => navigate('/vouchers/new?type=production')}
      >
        <Select
          placeholder="All statuses"
          size="sm"
          clearable
          value={statusFilter}
          onChange={(val) => { setStatusFilter(val); setPage(1); }}
          data={[
            { value: 'draft', label: 'Draft' },
            { value: 'posted', label: 'Posted' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          style={{ width: 140 }}
        />
      </PageHeader>

      {loading ? (
        <Center py="xl"><Loader /></Center>
      ) : vouchers.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">No production vouchers found</Text>
      ) : (
        <>
          {Object.entries(groupedVouchers).map(([date, list]) => (
            <ProductionGroup key={date} date={date} vouchers={list} onClick={viewDetail} />
          ))}
          {totalPages > 1 && (
            <Center mt="md">
              <Pagination value={page} onChange={setPage} total={totalPages} />
            </Center>
          )}
        </>
      )}

      <ProductionDetailModal
        voucher={selected}
        onClose={() => setSelected(null)}
        onUpdate={loadVouchers}
      />
    </div>
  );
}

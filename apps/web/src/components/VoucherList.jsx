import { useMemo } from 'react';
import { Box, Card, Stack, Group, Text, Badge } from '@mantine/core';

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtType(t) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtCurrency(n) {
  return (n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

function VoucherGroup({ date, vouchers, onClick }) {
  return (
    <Box mb="md">
      <Text c="dimmed" size="xs" fw={700} mb="xs" tt="uppercase" style={{ letterSpacing: 0.5 }}>
        {date}
      </Text>
      <Card padding={0} radius="md" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
        <Stack gap="sm" style={{ background: 'var(--app-bg)' }}>
          {vouchers.map((v, i) => (
            <Box 
              key={v._id} 
              p="sm" 
              onClick={() => onClick(v)}
              style={{ 
                cursor: 'pointer', 
                borderBottom: 'none',
                transition: 'background-color 0.2s',
                backgroundColor: 'var(--app-surface-elevated)',
                borderRadius: 'var(--mantine-radius-md)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--app-surface-elevated)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--app-surface-elevated)'}
            >
              <Group justify="space-between" wrap="nowrap">
                <Box>
                  <Text size="sm" fw={500}>{v.partyId?.name || 'No Party'}</Text>
                  <Group gap="xs">
                    <Text size="xs" c="dimmed" ff="monospace">{v.voucherNumber}</Text>
                    {v.status === 'cancelled' && <Badge size="xs" variant="dot" color="red">cancelled</Badge>}
                  </Group>
                </Box>
                <Box style={{ textAlign: 'right' }}>
                  <Text size="sm" fw={600}>{fmtCurrency(v.grandTotal)}</Text>
                  <Text size="xs" c="dimmed">{fmtType(v.voucherType)}</Text>
                </Box>
              </Group>
            </Box>
          ))}
        </Stack>
      </Card>
    </Box>
  );
}

export default function VoucherList({ vouchers, onItemClick }) {
  const groupedVouchers = useMemo(() => {
    const groups = {};
    vouchers.forEach(v => {
      const d = fmtDate(v.date);
      if (!groups[d]) groups[d] = [];
      groups[d].push(v);
    });
    return groups;
  }, [vouchers]);

  if (vouchers.length === 0) {
    return <Text c="dimmed" ta="center" py="xl">No vouchers found</Text>;
  }

  return (
    <>
      {Object.entries(groupedVouchers).map(([date, list]) => (
        <VoucherGroup key={date} date={date} vouchers={list} onClick={onItemClick} />
      ))}
    </>
  );
}

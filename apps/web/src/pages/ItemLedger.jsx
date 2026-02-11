import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Card,
  Center,
  Divider,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconArrowLeft } from '@tabler/icons-react';
import dayjs from 'dayjs';
import api from '../services/api.js';

function getFinancialYear() {
  const d = new Date();
  const y = d.getFullYear();
  const start = d.getMonth() >= 3 ? y : y - 1;
  return `${start}-${String(start + 1).slice(2)}`;
}

function generateFYOptions() {
  const y = new Date().getFullYear();
  const opts = [];
  for (let i = -2; i < 2; i++) {
    const s = y + i;
    opts.push({ value: `${s}-${String(s + 1).slice(2)}`, label: `FY ${s}-${String(s + 1).slice(2)}` });
  }
  return opts;
}

function formatQty(n) {
  if (n === 0) return '0.00';
  if (n == null) return '-';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatValue(n) {
  if (n === 0) return '0.00';
  if (n == null) return '-';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const VOUCHER_TYPE_LABELS = {
  sales_invoice: 'Sales Invoice',
  purchase_invoice: 'Purchase Invoice',
  sales_return: 'Sales Return',
  purchase_return: 'Purchase Return',
  payment: 'Payment',
  receipt: 'Receipt',
  journal: 'Journal',
  contra: 'Contra',
  sales_order: 'Sales Order',
  purchase_order: 'Purchase Order',
  delivery_note: 'Delivery Note',
  grn: 'GRN',
  production: 'Production',
  stock_transfer: 'Stock Transfer',
  physical_stock: 'Physical Stock',
};

export default function ItemLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 48em)');

  const [fy, setFy] = useState(getFinancialYear());
  const [item, setItem] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [mcs, setMcs] = useState([]);
  const [mcFilter, setMcFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/items/${id}`)
      .then((res) => setItem(res.data.data.item))
      .catch(() => setError('Item not found'));
  }, [id]);

  useEffect(() => {
    api.get('/material-centres/lookup')
      .then((res) => setMcs(res.data.data.materialCentres))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    api.get(`/items/${id}/ledger`, {
      params: {
        financialYear: fy,
        materialCentreId: mcFilter || undefined,
      },
    })
      .then((res) => setLedger(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load ledger'))
      .finally(() => setLoading(false));
  }, [id, fy, mcFilter]);

  const { rows, totalIn, totalOut, closingQty, closingValue } = useMemo(() => {
    if (!ledger) return { rows: [], totalIn: 0, totalOut: 0, closingQty: 0, closingValue: 0 };
    let balQty = ledger.openingQuantity || 0;
    let balValue = ledger.openingValue || 0;
    let tIn = 0;
    let tOut = 0;
    const r = (ledger.entries || []).map((e) => {
      const inQty = e.type === 'in' ? e.quantity || 0 : 0;
      const outQty = e.type === 'out' ? e.quantity || 0 : 0;
      tIn += inQty;
      tOut += outQty;
      balQty += (inQty - outQty);
      balValue += (e.type === 'in' ? (e.value || 0) : -(e.value || 0));
      return { ...e, inQty, outQty, balanceQty: balQty, balanceValue: balValue };
    });
    return { rows: r, totalIn: tIn, totalOut: tOut, closingQty: balQty, closingValue: balValue };
  }, [ledger]);

  const mcOptions = [
    { value: '', label: 'All MCs' },
    ...mcs.map((m) => ({ value: m._id, label: m.name })),
  ];

  if (error && !item) {
    return (
      <div>
        <Group mb="lg">
          <ActionIcon variant="subtle" onClick={() => navigate('/items')}><IconArrowLeft size={20} /></ActionIcon>
          <Title order={2}>Item Ledger</Title>
        </Group>
        <Alert color="red">{error}</Alert>
      </div>
    );
  }

  return (
    <div>
      <Group mb="xs">
        <ActionIcon variant="subtle" onClick={() => navigate('/items')}><IconArrowLeft size={20} /></ActionIcon>
        <div>
          <Title order={2}>{item?.name || 'Item Ledger'}</Title>
          {item && (
            <Group gap="xs" mt={2}>
              {item.itemGroupId?.name && <Badge size="sm" variant="light">{item.itemGroupId.name}</Badge>}
              {item.sku && <Text size="xs" c="dimmed" ff="monospace">{item.sku}</Text>}
              {item.unit && <Text size="xs" c="dimmed">Unit: {item.unit}</Text>}
            </Group>
          )}
        </div>
      </Group>

      <Divider mb="md" />

      <Stack gap="md" mb="md">
        <Group gap="sm" grow={isMobile}>
          <Select
            label="Financial Year"
            data={generateFYOptions()}
            value={fy}
            onChange={setFy}
            allowDeselect={false}
          />
          <Select
            label="Material Centre"
            data={mcOptions}
            value={mcFilter}
            onChange={(v) => setMcFilter(v || '')}
          />
        </Group>

        {ledger && (
          <SimpleGrid cols={{ base: 1, xs: 3 }}>
            <Card p="xs" px="md" withBorder radius="md">
              <Text size="xs" c="dimmed">Total In</Text>
              <Text size="lg" fw={700} c="green.7" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatQty(totalIn)} {item?.unit || ''}
              </Text>
            </Card>
            <Card p="xs" px="md" withBorder radius="md">
              <Text size="xs" c="dimmed">Total Out</Text>
              <Text size="lg" fw={700} c="red.7" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatQty(totalOut)} {item?.unit || ''}
              </Text>
            </Card>
            <Card p="xs" px="md" withBorder radius="md">
              <Text size="xs" c="dimmed">Closing Balance</Text>
              <Text size="lg" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatQty(closingQty)} {item?.unit || ''}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>Value: {formatValue(closingValue)}</Text>
            </Card>
          </SimpleGrid>
        )}
      </Stack>

      {loading && <Center py="xl"><Loader /></Center>}
      {error && !loading && <Alert color="red" mb="md">{error}</Alert>}

      {!loading && ledger && (
        <Box visibleFrom="sm">
          <Table striped highlightOnHover withTableBorder withColumnBorders verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr style={{ backgroundColor: 'var(--app-surface-elevated)' }}>
                <Table.Th style={{ width: 110 }}>Date</Table.Th>
                {!mcFilter && <Table.Th style={{ width: 160 }}>MC</Table.Th>}
                <Table.Th>Particulars</Table.Th>
                <Table.Th style={{ width: 140 }}>Voucher No.</Table.Th>
                <Table.Th style={{ width: 120, textAlign: 'right' }}>In</Table.Th>
                <Table.Th style={{ width: 120, textAlign: 'right' }}>Out</Table.Th>
                <Table.Th style={{ width: 140, textAlign: 'right' }}>Balance</Table.Th>
                <Table.Th style={{ width: 140, textAlign: 'right' }}>Value</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr className="ledger-accent-row">
                <Table.Td></Table.Td>
                {!mcFilter && <Table.Td></Table.Td>}
                <Table.Td colSpan={2}><Text size="sm" fw={700}>Opening Balance</Text></Table.Td>
                <Table.Td></Table.Td>
                <Table.Td></Table.Td>
                <Table.Td>
                  <Text size="sm" fw={700} ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatQty(ledger.openingQuantity || 0)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={700} ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatValue(ledger.openingValue || 0)}
                  </Text>
                </Table.Td>
              </Table.Tr>

              {rows.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={mcFilter ? 8 : 9}>
                    <Text size="sm" c="dimmed" ta="center" py="md">No stock movements in this period</Text>
                  </Table.Td>
                </Table.Tr>
              )}

              {rows.map((row) => (
                <Table.Tr key={row._id}>
                  <Table.Td>
                    <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{dayjs(row.date).format('DD MMM YYYY')}</Text>
                  </Table.Td>
                  {!mcFilter && (
                    <Table.Td>
                      <Text size="sm">{row.materialCentreId?.name || '-'}</Text>
                    </Table.Td>
                  )}
                  <Table.Td>
                    <Text size="sm">{VOUCHER_TYPE_LABELS[row.voucherType] || row.voucherType}</Text>
                    {row.narration && <Text size="xs" c="dimmed" lineClamp={1}>{row.narration}</Text>}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace">{row.voucherNumber || '-'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ta="right" c="green.7" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.inQty ? formatQty(row.inQty) : '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ta="right" c="red.7" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.outQty ? formatQty(row.outQty) : '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatQty(row.balanceQty)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatValue(row.balanceValue)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}

              <Table.Tr className="ledger-accent-row">
                <Table.Td></Table.Td>
                {!mcFilter && <Table.Td></Table.Td>}
                <Table.Td colSpan={2}><Text size="sm" fw={700}>Closing Balance</Text></Table.Td>
                <Table.Td>
                  <Text size="sm" ta="right" fw={700} c="green.7" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatQty(totalIn)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ta="right" fw={700} c="red.7" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatQty(totalOut)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={700} ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatQty(closingQty)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={700} ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatValue(closingValue)}
                  </Text>
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Box>
      )}

      {!loading && ledger && (
        <Box hiddenFrom="sm">
          <Card withBorder padding={0} radius="md">
            <Table striped withTableBorder verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 86 }}>Date</Table.Th>
                  <Table.Th style={{ width: 70 }}>Vch</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Qty</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Bal</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr className="ledger-accent-row">
                  <Table.Td></Table.Td>
                  <Table.Td><Text size="xs" fw={700}>Open</Text></Table.Td>
                  <Table.Td></Table.Td>
                  <Table.Td>
                    <Text size="xs" fw={600} ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatQty(ledger.openingQuantity || 0)}
                    </Text>
                  </Table.Td>
                </Table.Tr>

                {rows.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Text size="sm" c="dimmed" ta="center" py="md">No stock movements in this period</Text>
                    </Table.Td>
                  </Table.Tr>
                )}

                {rows.map((row) => {
                  const vchDigits = row.voucherNumber ? String(row.voucherNumber).split('-').pop() : '-';
                  const qty = row.inQty ? row.inQty : row.outQty ? -row.outQty : 0;
                  const qtyLabel = qty >= 0 ? 'In' : 'Out';
                  const qtyAbs = Math.abs(qty);
                  return (
                    <Table.Tr key={row._id}>
                      <Table.Td>
                        <Text size="xs" style={{ fontVariantNumeric: 'tabular-nums' }}>{dayjs(row.date).format('DD MMM')}</Text>
                        {!mcFilter && <Text size="xs" c="dimmed">{row.materialCentreId?.name || '-'}</Text>}
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" ff="monospace">{vchDigits}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" ta="right" c={qty >= 0 ? 'green.7' : 'red.7'} style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatQty(qtyAbs)} {qtyLabel}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatQty(row.balanceQty)}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}

                <Table.Tr className="ledger-accent-row">
                  <Table.Td></Table.Td>
                  <Table.Td><Text size="xs" fw={700}>Close</Text></Table.Td>
                  <Table.Td></Table.Td>
                  <Table.Td>
                    <Text size="xs" fw={600} ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatQty(closingQty)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Card>
        </Box>
      )}
    </div>
  );
}

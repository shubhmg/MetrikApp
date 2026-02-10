import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Title,
  Text,
  Select,
  Table,
  Group,
  Stack,
  Card,
  SimpleGrid,
  ActionIcon,
  Loader,
  Center,
  Alert,
  Badge,
  Divider,
  Box,
} from '@mantine/core';
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

function formatAmt(n) {
  if (!n) return '-';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BalanceText({ value, size = 'sm', fw = 600 }) {
  const abs = Math.abs(value);
  const label = value >= 0 ? 'Dr' : 'Cr';
  const color = value >= 0 ? 'red.7' : 'green.7';
  return (
    <Text size={size} fw={fw} c={color} ta="right" style={{ fontVariantNumeric: 'tabular-nums' }}>
      {formatAmt(abs)} {label}
    </Text>
  );
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
};

function MobileLedgerEntry({ row }) {
  return (
    <Box p="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
      <Group justify="space-between" mb={4}>
        <Text size="xs" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {dayjs(row.date).format('DD MMM YYYY')}
        </Text>
        <Text size="xs" ff="monospace" c="dimmed">{row.voucherNumber || '-'}</Text>
      </Group>
      <Text size="sm" fw={500} mb={2}>
        {VOUCHER_TYPE_LABELS[row.voucherType] || row.voucherType}
      </Text>
      {row.narration && <Text size="xs" c="dimmed" lineClamp={1} mb={4}>{row.narration}</Text>}
      <Group justify="space-between">
        <Group gap="md">
          {row.debit ? (
            <Text size="sm" c="red.7" fw={500} style={{ fontVariantNumeric: 'tabular-nums' }}>
              Dr {formatAmt(row.debit)}
            </Text>
          ) : null}
          {row.credit ? (
            <Text size="sm" c="green.7" fw={500} style={{ fontVariantNumeric: 'tabular-nums' }}>
              Cr {formatAmt(row.credit)}
            </Text>
          ) : null}
        </Group>
        <BalanceText value={row.balance} size="xs" fw={500} />
      </Group>
    </Box>
  );
}

export default function PartyLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fy, setFy] = useState(getFinancialYear());
  const [party, setParty] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/parties/${id}`)
      .then((res) => setParty(res.data.data.party))
      .catch(() => setError('Party not found'));
  }, [id]);

  useEffect(() => {
    if (!party?.linkedAccountId) return;
    const accountId = typeof party.linkedAccountId === 'object' ? party.linkedAccountId._id : party.linkedAccountId;
    if (!accountId) return;
    setLoading(true);
    setError(null);
    api.get(`/accounts/${accountId}/ledger`, { params: { financialYear: fy } })
      .then((res) => setLedger(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load ledger'))
      .finally(() => setLoading(false));
  }, [party, fy]);

  const { rows, totalDebit, totalCredit, closingBalance } = useMemo(() => {
    if (!ledger) return { rows: [], totalDebit: 0, totalCredit: 0, closingBalance: 0 };
    let bal = ledger.openingBalance || 0;
    let tDr = 0;
    let tCr = 0;
    const r = (ledger.entries || []).map((e) => {
      tDr += e.debit || 0;
      tCr += e.credit || 0;
      bal += (e.debit || 0) - (e.credit || 0);
      return { ...e, balance: bal };
    });
    return { rows: r, totalDebit: tDr, totalCredit: tCr, closingBalance: bal };
  }, [ledger]);

  if (error && !party) {
    return (
      <div>
        <Group mb="lg">
          <ActionIcon variant="subtle" onClick={() => navigate('/parties')}><IconArrowLeft size={20} /></ActionIcon>
          <Title order={2}>Party Ledger</Title>
        </Group>
        <Alert color="red">{error}</Alert>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <Group mb="xs">
        <ActionIcon variant="subtle" onClick={() => navigate('/parties')}><IconArrowLeft size={20} /></ActionIcon>
        <div>
          <Title order={2}>{party?.name || 'Party Ledger'}</Title>
          {party && (
            <Group gap="xs" mt={2}>
              {party.type?.map((t) => (
                <Badge key={t} size="sm" variant="light" color={t === 'customer' ? 'blue' : t === 'vendor' ? 'orange' : 'grape'}>
                  {t}
                </Badge>
              ))}
              {party.gstin && <Text size="xs" c="dimmed" ff="monospace">{party.gstin}</Text>}
            </Group>
          )}
        </div>
      </Group>

      <Divider mb="md" />

      {/* FY Selector + Summary Cards */}
      <Stack gap="md" mb="md">
        <Select
          label="Financial Year"
          data={generateFYOptions()}
          value={fy}
          onChange={setFy}
          allowDeselect={false}
          w={180}
        />
        {ledger && (
          <SimpleGrid cols={{ base: 1, xs: 3 }}>
            <Card p="xs" px="md" withBorder radius="md">
              <Text size="xs" c="dimmed">Total Debit</Text>
              <Text size="lg" fw={700} c="red.7" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatAmt(totalDebit)}</Text>
            </Card>
            <Card p="xs" px="md" withBorder radius="md">
              <Text size="xs" c="dimmed">Total Credit</Text>
              <Text size="lg" fw={700} c="green.7" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatAmt(totalCredit)}</Text>
            </Card>
            <Card p="xs" px="md" withBorder radius="md">
              <Text size="xs" c="dimmed">Closing Balance</Text>
              <Text size="lg" fw={700} c={closingBalance >= 0 ? 'red.7' : 'green.7'} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatAmt(Math.abs(closingBalance))} {closingBalance >= 0 ? 'Dr' : 'Cr'}
              </Text>
            </Card>
          </SimpleGrid>
        )}
      </Stack>

      {loading && <Center py="xl"><Loader /></Center>}
      {error && !loading && <Alert color="red" mb="md">{error}</Alert>}

      {/* Desktop table */}
      {!loading && ledger && (
        <Box visibleFrom="sm">
          <Table striped highlightOnHover withTableBorder withColumnBorders verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr style={{ backgroundColor: 'var(--mantine-color-gray-1)' }}>
                <Table.Th style={{ width: 110 }}>Date</Table.Th>
                <Table.Th>Particulars</Table.Th>
                <Table.Th style={{ width: 140 }}>Voucher No.</Table.Th>
                <Table.Th style={{ width: 130, textAlign: 'right' }}>Debit</Table.Th>
                <Table.Th style={{ width: 130, textAlign: 'right' }}>Credit</Table.Th>
                <Table.Th style={{ width: 160, textAlign: 'right' }}>Balance</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}>
                <Table.Td></Table.Td>
                <Table.Td colSpan={2}><Text size="sm" fw={700}>Opening Balance</Text></Table.Td>
                <Table.Td></Table.Td>
                <Table.Td></Table.Td>
                <Table.Td><BalanceText value={ledger.openingBalance || 0} /></Table.Td>
              </Table.Tr>

              {rows.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text size="sm" c="dimmed" ta="center" py="md">No transactions in this period</Text>
                  </Table.Td>
                </Table.Tr>
              )}

              {rows.map((row) => (
                <Table.Tr key={row._id}>
                  <Table.Td>
                    <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{dayjs(row.date).format('DD MMM YYYY')}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{VOUCHER_TYPE_LABELS[row.voucherType] || row.voucherType}</Text>
                    {row.narration && <Text size="xs" c="dimmed" lineClamp={1}>{row.narration}</Text>}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace">{row.voucherNumber || '-'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ta="right" c={row.debit ? 'red.7' : 'dimmed'} fw={row.debit ? 500 : 400} style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.debit ? formatAmt(row.debit) : '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ta="right" c={row.credit ? 'green.7' : 'dimmed'} fw={row.credit ? 500 : 400} style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.credit ? formatAmt(row.credit) : '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td><BalanceText value={row.balance} /></Table.Td>
                </Table.Tr>
              ))}

              <Table.Tr style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}>
                <Table.Td></Table.Td>
                <Table.Td colSpan={2}><Text size="sm" fw={700}>Closing Balance</Text></Table.Td>
                <Table.Td>
                  <Text size="sm" ta="right" fw={700} c="red.7" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatAmt(totalDebit)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ta="right" fw={700} c="green.7" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatAmt(totalCredit)}</Text>
                </Table.Td>
                <Table.Td><BalanceText value={closingBalance} /></Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Box>
      )}

      {/* Mobile card list */}
      {!loading && ledger && (
        <Box hiddenFrom="sm">
          <Card withBorder padding={0} radius="md">
            {/* Opening balance */}
            <Box p="sm" style={{ backgroundColor: 'var(--mantine-color-blue-0)', borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
              <Group justify="space-between">
                <Text size="sm" fw={700}>Opening Balance</Text>
                <BalanceText value={ledger.openingBalance || 0} size="sm" />
              </Group>
            </Box>

            {rows.length === 0 && (
              <Text size="sm" c="dimmed" ta="center" py="xl">No transactions in this period</Text>
            )}

            {rows.map((row) => (
              <MobileLedgerEntry key={row._id} row={row} />
            ))}

            {/* Closing balance */}
            <Box p="sm" style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}>
              <Group justify="space-between" mb={4}>
                <Text size="sm" fw={700}>Closing Balance</Text>
                <BalanceText value={closingBalance} size="sm" />
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="red.7" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  Dr {formatAmt(totalDebit)}
                </Text>
                <Text size="xs" c="green.7" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  Cr {formatAmt(totalCredit)}
                </Text>
              </Group>
            </Box>
          </Card>
        </Box>
      )}
    </div>
  );
}

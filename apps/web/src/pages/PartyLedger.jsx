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
import { useMediaQuery } from '@mantine/hooks';
import { IconArrowLeft } from '@tabler/icons-react';
import dayjs from 'dayjs';
import api from '../services/api.js';
import { usePermission } from '../hooks/usePermission.js';
import { useAuthStore } from '../store/authStore.js';

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
  if (n === 0) return '0.00';
  if (n == null) return '-';
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

export default function PartyLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = usePermission();
  const user = useAuthStore((s) => s.user);
  const [fy, setFy] = useState(getFinancialYear());
  const [party, setParty] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMobile = useMediaQuery('(max-width: 48em)');
  const backPath = role === 'contractor' ? '/productions' : '/parties';

  useEffect(() => {
    api.get(`/parties/${id}`)
      .then((res) => setParty(res.data.data.party))
      .catch(() => setError('Party not found'));
  }, [id]);

  useEffect(() => {
    if (role !== 'contractor' || !party) return;
    const linkedUserId = party.contractorSettings?.linkedUserId?._id || party.contractorSettings?.linkedUserId;
    if (String(linkedUserId) !== String(user?._id)) {
      navigate('/parties', { replace: true });
    }
  }, [role, party, user, navigate]);

  useEffect(() => {
    if (!party?._id) return;
    setLoading(true);
    setError(null);
    api.get(`/parties/${party._id}/ledger`, { params: { financialYear: fy } })
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
          <ActionIcon variant="subtle" onClick={() => navigate(backPath, { replace: role === 'contractor' })}><IconArrowLeft size={20} /></ActionIcon>
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
        <ActionIcon variant="subtle" onClick={() => navigate(backPath, { replace: role === 'contractor' })}><IconArrowLeft size={20} /></ActionIcon>
        <div>
          <Title order={2}>{party?.name || 'Party Ledger'}</Title>
          {party && (
            <Group gap="xs" mt={2}>
              {party.type?.map((t) => (
                <Badge key={t} size="sm" variant="light" color={t === 'customer' ? 'teal' : t === 'vendor' ? 'orange' : 'teal'}>
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
          w={isMobile ? '100%' : 180}
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
              <Table.Tr style={{ backgroundColor: 'var(--app-surface-elevated)' }}>
                <Table.Th style={{ width: 110 }}>Date</Table.Th>
                <Table.Th>Particulars</Table.Th>
                <Table.Th style={{ width: 140 }}>Voucher No.</Table.Th>
                <Table.Th style={{ width: 130, textAlign: 'right' }}>Debit</Table.Th>
                <Table.Th style={{ width: 130, textAlign: 'right' }}>Credit</Table.Th>
                <Table.Th style={{ width: 160, textAlign: 'right' }}>Balance</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr className="ledger-accent-row">
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

              <Table.Tr className="ledger-accent-row">
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

      {/* Mobile simple table */}
      {!loading && ledger && (
        <Box hiddenFrom="sm">
          <Card withBorder padding={0} radius="md">
            <Table striped withTableBorder verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 86 }}>Date</Table.Th>
                  <Table.Th style={{ width: 70 }}>Vch</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Bal</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr className="ledger-accent-row">
                  <Table.Td></Table.Td>
                  <Table.Td><Text size="xs" fw={700}>Open</Text></Table.Td>
                  <Table.Td></Table.Td>
                  <Table.Td><BalanceText value={ledger.openingBalance || 0} size="xs" fw={600} /></Table.Td>
                </Table.Tr>

                {rows.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Text size="sm" c="dimmed" ta="center" py="md">No transactions in this period</Text>
                    </Table.Td>
                  </Table.Tr>
                )}

                {rows.map((row) => {
                  const amount = row.debit ? row.debit : row.credit;
                  const amountLabel = row.debit ? 'Dr' : row.credit ? 'Cr' : '';
                  const vchDigits = row.voucherNumber ? String(row.voucherNumber).split('-').pop() : '-';
                  return (
                    <Table.Tr key={row._id}>
                      <Table.Td>
                        <Text size="xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {dayjs(row.date).format('DD MMM')}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" ff="monospace">{vchDigits || '-'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" ta="right" c={row.debit ? 'red.7' : row.credit ? 'green.7' : 'dimmed'} style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {amount ? `${formatAmt(amount)} ${amountLabel}` : '-'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <BalanceText value={row.balance} size="xs" fw={600} />
                      </Table.Td>
                    </Table.Tr>
                  );
                })}

                <Table.Tr className="ledger-accent-row">
                  <Table.Td></Table.Td>
                  <Table.Td><Text size="xs" fw={700}>Close</Text></Table.Td>
                  <Table.Td></Table.Td>
                  <Table.Td><BalanceText value={closingBalance} size="xs" fw={600} /></Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Card>
        </Box>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Modal, Table, Select, Group, Loader, Alert, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import api from '../services/api';
import dayjs from 'dayjs';

function getFinancialYear() {
  const date = new Date();
  const month = date.getMonth();
  const year = date.getFullYear();
  const startYear = month >= 3 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

const generateFYOptions = () => {
  const currentYear = new Date().getFullYear();
  const options = [];
  // Generate range from 2 years ago to 1 year ahead
  for (let i = -2; i < 2; i++) {
    const start = currentYear + i;
    options.push(`${start}-${String(start + 1).slice(2)}`);
  }
  return options;
};

export default function PartyLedgerModal({ opened, onClose, party }) {
  const [financialYear, setFinancialYear] = useState(getFinancialYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (opened && party) {
      fetchLedger();
    } else {
      setData(null);
    }
  }, [opened, party, financialYear]);

  async function fetchLedger() {
    if (!party?.linkedAccountId) {
      setError("No linked account found for this party.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/accounts/${party.linkedAccountId}/ledger`, {
        params: { financialYear }
      });
      setData(res.data.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load ledger');
      notifications.show({ title: 'Error', message: 'Failed to load ledger', color: 'red' });
    }
    setLoading(false);
  }

  // Calculate running balance
  const rows = [];
  let currentBalance = data ? data.openingBalance : 0;

  if (data && data.entries) {
    data.entries.forEach(entry => {
      currentBalance += (entry.debit - entry.credit);
      rows.push({
        ...entry,
        balance: currentBalance
      });
    });
  }

  return (
    <Modal opened={opened} onClose={onClose} title={`Ledger: ${party?.name}`} size="xl">
      <Group mb="md">
        <Select
          label="Financial Year"
          data={generateFYOptions()}
          value={financialYear}
          onChange={setFinancialYear}
          allowDeselect={false}
        />
      </Group>

      {loading && <Loader />}
      {error && <Alert color="red">{error}</Alert>}

      {!loading && data && (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Voucher Type</Table.Th>
              <Table.Th>Voucher No</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Debit</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Credit</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Balance</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr style={{ backgroundColor: '#f8f9fa' }}>
              <Table.Td colSpan={5}><strong>Opening Balance</strong></Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <strong>{Math.abs(data.openingBalance).toFixed(2)} {data.openingBalance >= 0 ? 'Dr' : 'Cr'}</strong>
              </Table.Td>
            </Table.Tr>
            {rows.map(row => (
              <Table.Tr key={row._id}>
                <Table.Td>{dayjs(row.date).format('DD-MM-YYYY')}</Table.Td>
                <Table.Td>{row.voucherType}</Table.Td>
                <Table.Td>{row.voucherNumber}</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>{row.debit ? row.debit.toFixed(2) : '-'}</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>{row.credit ? row.credit.toFixed(2) : '-'}</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  {Math.abs(row.balance).toFixed(2)} {row.balance >= 0 ? 'Dr' : 'Cr'}
                </Table.Td>
              </Table.Tr>
            ))}
            {rows.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6} style={{ textAlign: 'center' }}>No transactions found</Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      )}
    </Modal>
  );
}

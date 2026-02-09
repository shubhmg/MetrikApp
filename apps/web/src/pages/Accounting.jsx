import { useState, useEffect } from 'react';
import {
  Select,
  TextInput,
  NumberInput,
  Modal,
  Button,
  Group,
  Stack,
  Badge,
  Table,
  Title,
  Text,
  ActionIcon,
  Alert,
  Center,
  Loader,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconTrash, IconLock } from '@tabler/icons-react';
import PageHeader from '../components/PageHeader.jsx';
import ConfirmDelete from '../components/ConfirmDelete.jsx';
import api from '../services/api.js';

const TYPE_DATA = [
  { value: 'asset', label: 'Asset', color: 'blue' },
  { value: 'liability', label: 'Liability', color: 'red' },
  { value: 'income', label: 'Income', color: 'green' },
  { value: 'expense', label: 'Expense', color: 'yellow' },
  { value: 'equity', label: 'Equity', color: 'grape' },
];

const TYPE_MAP = Object.fromEntries(TYPE_DATA.map((t) => [t.value, t]));

const EMPTY_FORM = { name: '', code: '', type: 'asset', group: '', openingDebit: 0, openingCredit: 0 };

export default function Accounting() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const form = useForm({ initialValues: EMPTY_FORM });

  useEffect(() => { loadAccounts(); }, [typeFilter]);

  async function loadAccounts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      const { data } = await api.get(`/accounts?${params}`);
      setAccounts(data.data.accounts);
    } catch { /* ignore */ }
    setLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    form.setValues(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  }

  function openEdit(acc) {
    setEditingId(acc._id);
    form.setValues({
      name: acc.name,
      code: acc.code || '',
      type: acc.type,
      group: acc.group || '',
      openingDebit: acc.openingBalance?.debit || 0,
      openingCredit: acc.openingBalance?.credit || 0,
    });
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(values) {
    setSaving(true);
    setError('');
    const payload = {
      name: values.name,
      code: values.code,
      type: values.type,
      group: values.group,
      openingBalance: { debit: values.openingDebit, credit: values.openingCredit },
    };
    try {
      if (editingId) {
        await api.patch(`/accounts/${editingId}`, payload);
        notifications.show({ title: 'Account updated', color: 'green' });
      } else {
        await api.post('/accounts', payload);
        notifications.show({ title: 'Account created', color: 'green' });
      }
      setModalOpen(false);
      loadAccounts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/accounts/${deleteTarget._id}`);
      notifications.show({ title: 'Account deleted', color: 'green' });
      setDeleteTarget(null);
      loadAccounts();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Failed', color: 'red' });
    }
    setDeleting(false);
  }

  const filtered = search
    ? accounts.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()) || (a.code || '').toLowerCase().includes(search.toLowerCase()))
    : accounts;

  // Group by type
  const grouped = {};
  for (const acc of filtered) {
    if (!grouped[acc.type]) grouped[acc.type] = [];
    grouped[acc.type].push(acc);
  }

  return (
    <div>
      <PageHeader title="Chart of Accounts" count={filtered.length} actionLabel="Add Account" onAction={openCreate}>
        <Select
          placeholder="All Types"
          data={TYPE_DATA.map((t) => ({ value: t.value, label: t.label }))}
          value={typeFilter}
          onChange={setTypeFilter}
          clearable
          w={160}
        />
        <TextInput placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} w={200} />
      </PageHeader>

      {loading ? (
        <Center py="xl"><Loader size="sm" /></Center>
      ) : filtered.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">No accounts found</Text>
      ) : (
        Object.entries(grouped).map(([type, accs]) => {
          const meta = TYPE_MAP[type] || { label: type, color: 'gray' };
          return (
            <div key={type} style={{ marginBottom: 24 }}>
              <Group mb="xs">
                <Badge color={meta.color} variant="filled" size="lg">{meta.label}</Badge>
                <Text size="sm" c="dimmed">({accs.length})</Text>
              </Group>
              <Table striped withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Code</Table.Th>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Group</Table.Th>
                    <Table.Th>System</Table.Th>
                    <Table.Th w={80}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {accs.map((a) => (
                    <Table.Tr key={a._id}>
                      <Table.Td style={{ fontFamily: 'monospace' }}>{a.code || '-'}</Table.Td>
                      <Table.Td>{a.name}</Table.Td>
                      <Table.Td>{a.group || '-'}</Table.Td>
                      <Table.Td>{a.isSystemAccount ? <IconLock size={16} color="gray" /> : null}</Table.Td>
                      <Table.Td>
                        {a.isSystemAccount ? null : (
                          <Group gap={4}>
                            <ActionIcon variant="subtle" onClick={() => openEdit(a)}><IconPencil size={16} /></ActionIcon>
                            <ActionIcon variant="subtle" color="red" onClick={() => setDeleteTarget(a)}><IconTrash size={16} /></ActionIcon>
                          </Group>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
          );
        })
      )}

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Account' : 'New Account'}
        centered
      >
        {error && <Alert color="red" variant="light" mb="sm">{error}</Alert>}
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Name" required {...form.getInputProps('name')} />
            <TextInput label="Code" {...form.getInputProps('code')} />
            <Select
              label="Type"
              data={TYPE_DATA.map((t) => ({ value: t.value, label: t.label }))}
              required
              {...form.getInputProps('type')}
            />
            <TextInput label="Group" placeholder="e.g. Current Assets" {...form.getInputProps('group')} />
            <Group grow>
              <NumberInput label="Opening Debit" min={0} {...form.getInputProps('openingDebit')} />
              <NumberInput label="Opening Credit" min={0} {...form.getInputProps('openingCredit')} />
            </Group>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" loading={saving}>{editingId ? 'Update' : 'Save'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <ConfirmDelete
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        name={deleteTarget?.name}
      />
    </div>
  );
}

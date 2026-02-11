import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  TextInput,
  NumberInput,
  MultiSelect,
  Modal,
  Button,
  Group,
  Stack,
  Badge,
  ActionIcon,
  Alert,
  Text,
  Card,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import ConfirmDelete from '../components/ConfirmDelete.jsx';
import api from '../services/api.js';
import { usePermission } from '../hooks/usePermission.js';

const TYPE_OPTIONS = [
  { value: 'customer', label: 'Customer' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'contractor', label: 'Contractor' },
];

const EMPTY_FORM = { name: '', type: ['customer'], gstin: '', phone: '', email: '', creditDays: 0 };

export default function Parties() {
  const { can } = usePermission();
  const canWrite = can('party', 'write');
  const canDelete = can('party', 'delete');
  const [parties, setParties] = useState([])
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('customer');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 48em)');

  const form = useForm({ initialValues: EMPTY_FORM });

  useEffect(() => { loadParties(); }, [typeFilter]);

  async function loadParties() {
    setLoading(true);
    try {
      const params = typeFilter ? `?type=${typeFilter}` : '';
      const { data } = await api.get(`/parties${params}`);
      setParties(data.data.parties);
    } catch { /* ignore */ }
    setLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    form.setValues(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  }

  function openEdit(party) {
    setEditingId(party._id);
    form.setValues({
      name: party.name,
      type: party.type || ['customer'],
      gstin: party.gstin || '',
      phone: party.phone || '',
      email: party.email || '',
      creditDays: party.creditDays || 0,
    });
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(values) {
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.patch(`/parties/${editingId}`, values);
        notifications.show({ title: 'Party updated', color: 'green' });
      } else {
        await api.post('/parties', values);
        notifications.show({ title: 'Party created', color: 'green' });
      }
      setModalOpen(false);
      loadParties();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/parties/${deleteTarget._id}`);
      notifications.show({ title: 'Party deleted', color: 'green' });
      setDeleteTarget(null);
      loadParties();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Failed', color: 'red' });
    }
    setDeleting(false);
  }

  const filtered = search
    ? parties.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : parties;

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (r) => (
        <Text
          c="teal"
          style={{ cursor: 'pointer', textDecoration: 'underline' }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/parties/${r._id}/ledger`);
          }}
        >
          {r.name}
        </Text>
      )
    },
    {
      key: 'type', label: 'Type',
      render: (r) => (
        <Group gap={4}>
          {r.type.map((t) => (
            <Badge key={t} variant="light" size="sm" color={t === 'customer' ? 'teal' : t === 'vendor' ? 'orange' : 'teal'}>
              {t}
            </Badge>
          ))}
        </Group>
      ),
    },
    { key: 'gstin', label: 'GSTIN', render: (r) => r.gstin || '-', style: { fontFamily: 'monospace' } },
    { key: 'phone', label: 'Phone', render: (r) => r.phone || '-' },
    { key: 'creditDays', label: 'Credit Days', render: (r) => r.creditDays || '-' },
    {
      key: 'actions', label: '',
      render: (r) => (
        <Group gap={4} onClick={(e) => e.stopPropagation()}>
          {canWrite && <ActionIcon variant="subtle" onClick={() => openEdit(r)}><IconPencil size={16} /></ActionIcon>}
          {canDelete && <ActionIcon variant="subtle" color="red" onClick={() => setDeleteTarget(r)}><IconTrash size={16} /></ActionIcon>}
        </Group>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Parties" count={filtered.length} actionLabel={canWrite ? "Add Party" : null} onAction={openCreate}>
        <Select
          placeholder="All Types"
          data={TYPE_OPTIONS}
          value={typeFilter}
          onChange={setTypeFilter}
          clearable
          w={isMobile ? '100%' : 160}
        />
        <TextInput placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} w={isMobile ? '100%' : 200} />
      </PageHeader>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No parties yet"
        mobileRender={(r) => (
          <Card key={r._id} withBorder padding="sm">
            <Group justify="space-between" wrap="nowrap">
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text
                  fw={600}
                  c="teal"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/parties/${r._id}/ledger`)}
                  truncate
                >
                  {r.name}
                </Text>
                <Group gap={4} mt={4}>
                  {r.type.map((t) => (
                    <Badge key={t} variant="light" size="sm" color={t === 'customer' ? 'teal' : t === 'vendor' ? 'orange' : 'teal'}>
                      {t}
                    </Badge>
                  ))}
                </Group>
                {r.phone && <Text size="xs" c="dimmed" mt={2}>{r.phone}</Text>}
                {r.gstin && <Text size="xs" c="dimmed" ff="monospace" mt={2}>{r.gstin}</Text>}
              </div>
              <Group gap={4}>
                {canWrite && <ActionIcon variant="subtle" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><IconPencil size={16} /></ActionIcon>}
                {canDelete && <ActionIcon variant="subtle" color="red" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}><IconTrash size={16} /></ActionIcon>}
              </Group>
            </Group>
          </Card>
        )}
      />

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Party' : 'New Party'}
        centered
      >
        {error && <Alert color="red" variant="light" mb="sm">{error}</Alert>}
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Name" required {...form.getInputProps('name')} />
            <MultiSelect label="Type" data={TYPE_OPTIONS} required {...form.getInputProps('type')} />
            <TextInput label="GSTIN" {...form.getInputProps('gstin')} />
            <TextInput label="Phone" {...form.getInputProps('phone')} />
            <TextInput label="Email" type="email" {...form.getInputProps('email')} />
            <NumberInput label="Credit Days" min={0} {...form.getInputProps('creditDays')} />
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

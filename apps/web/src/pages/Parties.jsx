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
  Divider,
  Box,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconTrash, IconPlus } from '@tabler/icons-react';
import PageHeader from '../components/PageHeader.jsx';
import ConfirmDelete from '../components/ConfirmDelete.jsx';
import api from '../services/api.js';
import { usePermission } from '../hooks/usePermission.js';
import { useAuthStore } from '../store/authStore.js';

const TYPE_OPTIONS = [
  { value: 'customer', label: 'Customer' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'contractor', label: 'Contractor' },
];

const EMPTY_FORM = {
  name: '',
  type: ['customer'],
  gstin: '',
  phone: '',
  email: '',
  creditDays: 0,
  contractorSettings: {
    isEnabled: false,
    consumeMaterialCentreId: null,
    outputMaterialCentreId: null,
    linkedUserId: null,
    itemRates: [],
  },
};

function fmtDateTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function PartyCard({ party, canWrite, canDelete, onEdit, onDelete, onOpenLedger }) {
  return (
    <Card
      p="sm"
      style={{
        cursor: 'pointer',
        backgroundColor: 'var(--app-surface-elevated)',
        borderRadius: 'var(--mantine-radius-md)',
      }}
      onClick={() => onOpenLedger(party)}
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <div style={{ minWidth: 0, flex: 1 }}>
          <Group justify="space-between" wrap="nowrap" align="center" mb={6}>
            <Text size="sm" fw={600} lineClamp={1}>{party.name}</Text>
            <Group gap={4}>
              {party.type?.map((t) => (
                <Badge key={t} variant="light" size="sm" color={t === 'customer' ? 'teal' : t === 'vendor' ? 'orange' : 'teal'}>
                  {t}
                </Badge>
              ))}
            </Group>
          </Group>
          <Stack gap={2}>
            {party.phone && <Text size="xs" c="dimmed">{party.phone}</Text>}
            {party.gstin && <Text size="xs" c="dimmed" ff="monospace">{party.gstin}</Text>}
            <Text size="xs" c="dimmed">Credit days: {party.creditDays || 0}</Text>
          </Stack>
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
                Added on: <Text span fw={600} c="dimmed">{fmtDateTime(party.createdAt)}</Text>
              </Text>
              <Group gap={4} onClick={(e) => e.stopPropagation()}>
                {canWrite && <ActionIcon variant="subtle" onClick={() => onEdit(party)}><IconPencil size={16} /></ActionIcon>}
                {canDelete && <ActionIcon variant="subtle" color="red" onClick={() => onDelete(party)}><IconTrash size={16} /></ActionIcon>}
              </Group>
            </Group>
          </Box>
        </div>
      </Group>
    </Card>
  );
}

export default function Parties() {
  const { can, role } = usePermission();
  const user = useAuthStore((s) => s.user);
  const canWrite = can('party', 'write');
  const canDelete = can('party', 'delete');
  const [parties, setParties] = useState([])
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState(role === 'contractor' ? 'contractor' : 'customer');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [items, setItems] = useState([]);
  const [mcs, setMcs] = useState([]);
  const [members, setMembers] = useState([]);
  const [contractorRates, setContractorRates] = useState([]);
  const [selectOpen, setSelectOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 48em)');

  const form = useForm({ initialValues: EMPTY_FORM });

  useEffect(() => { loadParties(); }, [typeFilter]);
  useEffect(() => {
    Promise.all([
      api.get('/items'),
      api.get('/material-centres/lookup'),
      api.get('/members'),
    ])
      .then(([i, m, mem]) => {
        setItems(i.data.data.items || []);
        setMcs(m.data.data.materialCentres || []);
        setMembers(mem.data.data.members || []);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (role !== 'contractor' || loading) return;
    const userId = user?._id;
    const linked = parties.find((p) => {
      const linkedUserId = p.contractorSettings?.linkedUserId?._id || p.contractorSettings?.linkedUserId;
      return String(linkedUserId) === String(userId);
    });
    if (linked?._id) navigate(`/parties/${linked._id}/ledger`, { replace: true });
  }, [role, loading, parties, user, navigate]);

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
    setContractorRates([]);
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
      contractorSettings: {
        isEnabled: party.contractorSettings?.isEnabled || false,
        consumeMaterialCentreId: party.contractorSettings?.consumeMaterialCentreId?._id || party.contractorSettings?.consumeMaterialCentreId || null,
        outputMaterialCentreId: party.contractorSettings?.outputMaterialCentreId?._id || party.contractorSettings?.outputMaterialCentreId || null,
        linkedUserId: party.contractorSettings?.linkedUserId?._id || party.contractorSettings?.linkedUserId || null,
      },
    });
    setContractorRates((party.contractorSettings?.itemRates || []).map((r) => ({
      itemId: r.itemId?._id || r.itemId || '',
      rate: r.rate || 0,
      rateUom: r.rateUom || 'per_dozen',
    })));
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(values) {
    setSaving(true);
    setError('');
    try {
      const payload = { ...values };
      if (values.type?.includes('contractor')) {
        payload.contractorSettings = {
          ...(values.contractorSettings || {}),
          isEnabled: true,
          itemRates: contractorRates.filter((r) => r.itemId && Number(r.rate) >= 0),
        };
      } else {
        payload.contractorSettings = {
          isEnabled: false,
          itemRates: [],
          consumeMaterialCentreId: null,
          outputMaterialCentreId: null,
          linkedUserId: null,
        };
      }
      if (editingId) {
        await api.patch(`/parties/${editingId}`, payload);
        notifications.show({ title: 'Party updated', color: 'green' });
      } else {
        await api.post('/parties', payload);
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
  const linkedContractorParty = role === 'contractor'
    ? parties.find((p) => {
      const linkedUserId = p.contractorSettings?.linkedUserId?._id || p.contractorSettings?.linkedUserId;
      return String(linkedUserId) === String(user?._id);
    })
    : null;
  const isContractorType = form.values.type?.includes('contractor');
  const itemOptions = items.map((i) => ({ value: i._id, label: `${i.sku} - ${i.name}` }));
  const mcOptions = mcs.map((m) => ({ value: m._id, label: `${m.code ? `${m.code} - ` : ''}${m.name}`.trim() }));
  const memberOptions = members.map((m) => ({ value: m._id, label: `${m.name} (${m.email})` }));

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

  if (role === 'contractor') {
    if (loading) {
      return (
        <div>
          <Text size="sm" c="dimmed">Loading your ledger...</Text>
        </div>
      );
    }
    return (
      <div>
        {!linkedContractorParty && (
          <Alert color="red" variant="light">
            No contractor party is linked to your user.
          </Alert>
        )}
      </div>
    );
  }

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
          comboboxProps={{
            withinPortal: true,
            position: 'bottom-start',
            onDropdownOpen: () => setSelectOpen(true),
            onDropdownClose: () => setSelectOpen(false),
          }}
        />
        <TextInput placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} w={isMobile ? '100%' : 200} />
      </PageHeader>

      {!selectOpen && (
        loading ? (
          <Text size="sm" c="dimmed">Loading parties...</Text>
        ) : filtered.length === 0 ? (
          <Text size="sm" c="dimmed">No parties yet</Text>
        ) : (
          <Stack gap="sm">
            {filtered.map((r) => (
              <PartyCard
                key={r._id}
                party={r}
                canWrite={canWrite}
                canDelete={canDelete}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onOpenLedger={(party) => navigate(`/parties/${party._id}/ledger`)}
              />
            ))}
          </Stack>
        )
      )}

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Party' : 'New Party'}
        centered
        fullScreen={isMobile}
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
            {isContractorType && (
              <>
                <Divider label="Contractor Workflow" labelPosition="left" />
                <Select
                  label="Linked User (optional)"
                  placeholder="Select app user"
                  data={memberOptions}
                  searchable
                  clearable
                  {...form.getInputProps('contractorSettings.linkedUserId')}
                />
                <Select
                  label="Consume MC (Raw Material)"
                  placeholder="Select contractor MC"
                  data={mcOptions}
                  searchable
                  {...form.getInputProps('contractorSettings.consumeMaterialCentreId')}
                />
                <Select
                  label="Output MC (Finished Goods)"
                  placeholder="Select factory/output MC"
                  data={mcOptions}
                  searchable
                  {...form.getInputProps('contractorSettings.outputMaterialCentreId')}
                />
                <Text size="sm" fw={600}>Assigned Item Rates</Text>
                {contractorRates.map((row, idx) => (
                  <Group key={idx} align="end" wrap="nowrap">
                    <Select
                      placeholder="Item"
                      data={itemOptions}
                      searchable
                      value={row.itemId}
                      onChange={(v) => setContractorRates((prev) => prev.map((r, i) => i === idx ? { ...r, itemId: v || '' } : r))}
                      style={{ flex: 1 }}
                    />
                    <NumberInput
                      placeholder="Rate"
                      min={0}
                      value={row.rate}
                      onChange={(v) => setContractorRates((prev) => prev.map((r, i) => i === idx ? { ...r, rate: Number(v || 0) } : r))}
                      w={120}
                    />
                    <Select
                      data={[
                        { value: 'per_dozen', label: '/dozen' },
                        { value: 'per_unit', label: '/unit' },
                      ]}
                      value={row.rateUom}
                      onChange={(v) => setContractorRates((prev) => prev.map((r, i) => i === idx ? { ...r, rateUom: v || 'per_dozen' } : r))}
                      w={110}
                    />
                    <ActionIcon color="red" variant="subtle" onClick={() => setContractorRates((prev) => prev.filter((_, i) => i !== idx))}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                ))}
                <Button
                  variant="light"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => setContractorRates((prev) => [...prev, { itemId: '', rate: 0, rateUom: 'per_dozen' }])}
                >
                  Add Item Rate
                </Button>
              </>
            )}
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

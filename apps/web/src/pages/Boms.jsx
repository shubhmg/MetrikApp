import { useState, useEffect, useMemo } from 'react';
import {
  Select,
  TextInput,
  NumberInput,
  Textarea,
  Modal,
  Button,
  Group,
  Stack,
  Badge,
  ActionIcon,
  Alert,
  Center,
  Loader,
  Title,
  Table,
  Text,
  Menu,
  Card,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconPencil,
  IconTrash,
  IconPlus,
  IconCheck,
  IconArchive,
  IconCopy,
  IconDots,
  IconHistory,
} from '@tabler/icons-react';
import DataTable from '../components/DataTable.jsx';
import ConfirmDelete from '../components/ConfirmDelete.jsx';
import api from '../services/api.js';
import { usePermission } from '../hooks/usePermission.js';

const STATUS_COLORS = { draft: 'gray', active: 'green', archived: 'orange' };

export default function Boms() {
  const { can } = usePermission();
  const canWrite = can('bom', 'write');
  const canDelete = can('bom', 'delete');
  const [boms, setBoms] = useState([]);
  const [items, setItems] = useState([]);
  const [mcs, setMcs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterItem, setFilterItem] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const isMobile = useMediaQuery('(max-width: 48em)');

  // Version history modal
  const [historyItemId, setHistoryItemId] = useState(null);
  const [historyVersions, setHistoryVersions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Input rows for the BOM form
  const [inputs, setInputs] = useState([{ itemId: '', quantity: 1, wastagePercent: 0, narration: '' }]);

  const form = useForm({
    initialValues: {
      outputItemId: '',
      name: '',
      description: '',
      outputQuantity: 1,
      defaultMaterialCentreId: null,
    },
  });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [bomsRes, itemsRes, mcsRes] = await Promise.all([
        api.get('/boms'),
        api.get('/items'),
        api.get('/material-centres/lookup'),
      ]);
      setBoms(bomsRes.data.data.boms);
      setItems(itemsRes.data.data.items);
      setMcs(mcsRes.data.data.materialCentres);
    } catch { /* ignore */ }
    setLoading(false);
  }

  // Producible items (finished_good or semi_finished)
  const outputItemData = useMemo(() =>
    items
      .filter((i) => ['finished_good', 'semi_finished'].includes(i.itemGroupId?.type))
      .map((i) => ({ value: i._id, label: `${i.sku} - ${i.name}` })),
    [items]
  );

  const allItemData = useMemo(() =>
    items.map((i) => ({ value: i._id, label: `${i.sku} - ${i.name}` })),
    [items]
  );

  const mcData = useMemo(() =>
    mcs.map((m) => ({ value: m._id, label: `${m.code} - ${m.name}` })),
    [mcs]
  );

  // Filtered BOMs
  const filteredBoms = useMemo(() => {
    let result = boms;
    if (filterStatus) result = result.filter((b) => b.status === filterStatus);
    if (filterItem) result = result.filter((b) => (b.outputItemId?._id || b.outputItemId) === filterItem);
    return result;
  }, [boms, filterStatus, filterItem]);

  // --- Input row helpers ---
  function updateInput(idx, field, value) {
    setInputs((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }
  function addInput() {
    setInputs((prev) => [...prev, { itemId: '', quantity: 1, wastagePercent: 0, narration: '' }]);
  }
  function removeInput(idx) {
    setInputs((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  }

  // --- Modal handlers ---
  function openCreate() {
    setEditingId(null);
    form.setValues({ outputItemId: '', name: '', description: '', outputQuantity: 1, defaultMaterialCentreId: null });
    setInputs([{ itemId: '', quantity: 1, wastagePercent: 0, narration: '' }]);
    setError('');
    setModalOpen(true);
  }

  function openEdit(bom) {
    setEditingId(bom._id);
    form.setValues({
      outputItemId: bom.outputItemId?._id || bom.outputItemId || '',
      name: bom.name,
      description: bom.description || '',
      outputQuantity: bom.outputQuantity || 1,
      defaultMaterialCentreId: bom.defaultMaterialCentreId?._id || bom.defaultMaterialCentreId || null,
    });
    setInputs(
      bom.inputs.map((inp) => ({
        itemId: inp.itemId?._id || inp.itemId || '',
        quantity: inp.quantity,
        wastagePercent: inp.wastagePercent || 0,
        narration: inp.narration || '',
      }))
    );
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(values) {
    const validInputs = inputs.filter((inp) => inp.itemId);
    if (validInputs.length === 0) {
      setError('At least one input item is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = { ...values, inputs: validInputs };
      if (editingId) {
        // Only send editable fields (not outputItemId)
        const { outputItemId, ...updateData } = payload;
        await api.patch(`/boms/${editingId}`, updateData);
        notifications.show({ title: 'BOM updated', color: 'green' });
      } else {
        await api.post('/boms', payload);
        notifications.show({ title: 'BOM created', color: 'green' });
      }
      setModalOpen(false);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  }

  async function handleActivate(id) {
    try {
      await api.post(`/boms/${id}/activate`);
      notifications.show({ title: 'BOM activated', color: 'green' });
      loadAll();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Failed', color: 'red' });
    }
  }

  async function handleArchive(id) {
    try {
      await api.post(`/boms/${id}/archive`);
      notifications.show({ title: 'BOM archived', color: 'green' });
      loadAll();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Failed', color: 'red' });
    }
  }

  async function handleNewVersion(id) {
    try {
      await api.post(`/boms/${id}/new-version`);
      notifications.show({ title: 'New version created', color: 'green' });
      loadAll();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Failed', color: 'red' });
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/boms/${deleteTarget._id}`);
      notifications.show({ title: 'BOM deleted', color: 'green' });
      setDeleteTarget(null);
      loadAll();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Failed', color: 'red' });
    }
    setDeleting(false);
  }

  async function openVersionHistory(outputItemId) {
    setHistoryItemId(outputItemId);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/boms/item/${outputItemId}/versions`);
      setHistoryVersions(res.data.data.versions);
    } catch { /* ignore */ }
    setHistoryLoading(false);
  }

  if (loading) return <Center py="xl"><Loader /></Center>;

  const columns = [
    {
      key: 'outputItem',
      label: 'Output Item',
      render: (r) => r.outputItemId?.name || '-',
    },
    { key: 'name', label: 'BOM Name', render: (r) => r.name },
    {
      key: 'version',
      label: 'Version',
      render: (r) => (
        <Badge
          variant="light"
          size="sm"
          style={{ cursor: 'pointer' }}
          onClick={() => openVersionHistory(r.outputItemId?._id || r.outputItemId)}
        >
          v{r.version}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <Badge color={STATUS_COLORS[r.status]} variant="light" size="sm">{r.status}</Badge>,
    },
    {
      key: 'inputs',
      label: 'Inputs',
      render: (r) => `${r.inputs?.length || 0} items`,
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <Menu position="bottom-end" withArrow>
          <Menu.Target>
            <ActionIcon variant="subtle"><IconDots size={16} /></ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {r.status === 'draft' && (
              <>
                {canWrite && <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => openEdit(r)}>Edit</Menu.Item>}
                {canWrite && <Menu.Item leftSection={<IconCheck size={14} />} color="green" onClick={() => handleActivate(r._id)}>Activate</Menu.Item>}
                {canDelete && <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => setDeleteTarget(r)}>Delete</Menu.Item>}
              </>
            )}
            {r.status === 'active' && (
              <>
                {canWrite && <Menu.Item leftSection={<IconArchive size={14} />} onClick={() => handleArchive(r._id)}>Archive</Menu.Item>}
                {canWrite && <Menu.Item leftSection={<IconCopy size={14} />} onClick={() => handleNewVersion(r._id)}>New Version</Menu.Item>}
              </>
            )}
            {r.status === 'archived' && (
              canWrite && <Menu.Item leftSection={<IconCopy size={14} />} onClick={() => handleNewVersion(r._id)}>New Version</Menu.Item>
            )}
            <Menu.Item leftSection={<IconHistory size={14} />} onClick={() => openVersionHistory(r.outputItemId?._id || r.outputItemId)}>
              Version History
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      ),
    },
  ];

  return (
    <div>
      {isMobile ? (
        <Stack gap="sm" mb="lg">
          <Title order={3}>Bill of Materials</Title>
          {canWrite && <Button leftSection={<IconPlus size={16} />} onClick={openCreate} fullWidth>New BOM</Button>}
        </Stack>
      ) : (
        <Group justify="space-between" mb="lg">
          <Title order={2}>Bill of Materials</Title>
          {canWrite && <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>New BOM</Button>}
        </Group>
      )}

      <Group mb="md" grow={isMobile}>
        <Select
          placeholder="Filter by status"
          data={[
            { value: 'draft', label: 'Draft' },
            { value: 'active', label: 'Active' },
            { value: 'archived', label: 'Archived' },
          ]}
          value={filterStatus}
          onChange={setFilterStatus}
          clearable
          size="sm"
          style={{ width: isMobile ? '100%' : 160 }}
        />
        <Select
          placeholder="Filter by output item"
          data={outputItemData}
          value={filterItem}
          onChange={setFilterItem}
          clearable
          searchable
          size="sm"
          style={{ width: isMobile ? '100%' : 250 }}
        />
      </Group>

      <DataTable
        columns={columns}
        data={filteredBoms}
        emptyMessage="No BOMs yet"
        mobileRender={(b) => (
          <Card key={b._id} withBorder padding="sm">
            <Group justify="space-between" wrap="nowrap">
              <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
                <Text fw={600} truncate>{b.name}</Text>
                <Text size="xs" c="dimmed">
                  Output: {b.outputItemId?.name || b.outputItemName || '-'}
                </Text>
                <Group gap={6}>
                  <Badge size="xs" variant="light" color={STATUS_COLORS[b.status] || 'gray'}>
                    {b.status}
                  </Badge>
                  {b.version != null && (
                    <Badge size="xs" variant="light">v{b.version}</Badge>
                  )}
                </Group>
              </Stack>
              <Group gap={4}>
                {canWrite && <ActionIcon variant="subtle" onClick={() => openEdit(b)}><IconPencil size={16} /></ActionIcon>}
                {canDelete && <ActionIcon variant="subtle" color="red" onClick={() => setDeleteTarget(b)}><IconTrash size={16} /></ActionIcon>}
              </Group>
            </Group>
          </Card>
        )}
      />

      {/* Create/Edit Modal */}
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit BOM' : 'New BOM'} centered size="lg" fullScreen={isMobile}>
        {error && <Alert color="red" variant="light" mb="sm">{error}</Alert>}
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Select
              label="Output Item"
              placeholder="Select finished/semi-finished good..."
              data={outputItemData}
              required
              searchable
              disabled={!!editingId}
              {...form.getInputProps('outputItemId')}
            />
            <TextInput label="BOM Name" required {...form.getInputProps('name')} />
            <Textarea label="Description" minRows={2} {...form.getInputProps('description')} />
            <Group grow>
              <NumberInput label="Output Quantity (base yield)" min={0.0001} decimalScale={4} {...form.getInputProps('outputQuantity')} />
              <Select
                label="Default Material Centre"
                placeholder="Optional..."
                data={mcData}
                clearable
                searchable
                {...form.getInputProps('defaultMaterialCentreId')}
              />
            </Group>

            <div>
              <Group justify="space-between" mb="xs">
                <Text fw={600} size="sm">Input Items</Text>
                <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={addInput}>Add Input</Button>
              </Group>
              <Table withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ minWidth: 200 }}>Item</Table.Th>
                    <Table.Th style={{ width: 100 }}>Quantity</Table.Th>
                    <Table.Th style={{ width: 90 }}>Wastage %</Table.Th>
                    <Table.Th style={{ minWidth: 120 }}>Narration</Table.Th>
                    <Table.Th style={{ width: 40 }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {inputs.map((inp, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td>
                        <Select
                          data={allItemData}
                          value={inp.itemId || null}
                          onChange={(v) => updateInput(idx, 'itemId', v)}
                          searchable
                          size="xs"
                          placeholder="Select item..."
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput size="xs" min={0.0001} decimalScale={4} value={inp.quantity} onChange={(v) => updateInput(idx, 'quantity', v || 0)} />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput size="xs" min={0} max={100} value={inp.wastagePercent} onChange={(v) => updateInput(idx, 'wastagePercent', v || 0)} />
                      </Table.Td>
                      <Table.Td>
                        <TextInput size="xs" value={inp.narration} onChange={(e) => updateInput(idx, 'narration', e.target.value)} />
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeInput(idx)}>
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>

            <Group justify="flex-end">
              <Button variant="default" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" loading={saving}>{editingId ? 'Update' : 'Save'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Version History Modal */}
      <Modal opened={!!historyItemId} onClose={() => setHistoryItemId(null)} title="Version History" centered fullScreen={isMobile}>
        {historyLoading ? (
          <Center py="md"><Loader size="sm" /></Center>
        ) : historyVersions.length === 0 ? (
          <Text c="dimmed" ta="center" py="md">No versions found</Text>
        ) : (
          <Table withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Version</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Updated</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {historyVersions.map((v) => (
                <Table.Tr key={v._id}>
                  <Table.Td><Badge variant="light" size="sm">v{v.version}</Badge></Table.Td>
                  <Table.Td>{v.name}</Table.Td>
                  <Table.Td><Badge color={STATUS_COLORS[v.status]} variant="light" size="sm">{v.status}</Badge></Table.Td>
                  <Table.Td>{new Date(v.updatedAt).toLocaleDateString('en-IN')}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
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

import { useState, useEffect } from 'react';
import {
  Tabs,
  Select,
  TextInput,
  NumberInput,
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
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconTrash, IconPlus } from '@tabler/icons-react';
import DataTable from '../components/DataTable.jsx';
import ConfirmDelete from '../components/ConfirmDelete.jsx';
import api from '../services/api.js';

const GROUP_TYPES = [
  { value: 'raw_material', label: 'Raw Material' },
  { value: 'finished_good', label: 'Finished Good' },
  { value: 'semi_finished', label: 'Semi Finished' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'consumable', label: 'Consumable' },
];

export default function Items() {
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalType, setModalType] = useState(null); // 'item' | 'group'
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const itemForm = useForm({
    initialValues: { name: '', sku: '', itemGroupId: '', unit: 'pcs', hsnCode: '', gstRate: 18, costingMethod: 'weighted_average', reorderLevel: 0 },
  });
  const groupForm = useForm({
    initialValues: { name: '', code: '', type: 'raw_material' },
  });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [itemsRes, groupsRes] = await Promise.all([
        api.get('/items'),
        api.get('/items/groups'),
      ]);
      setItems(itemsRes.data.data.items);
      setGroups(groupsRes.data.data.itemGroups);
    } catch { /* ignore */ }
    setLoading(false);
  }

  // --- Items ---
  function openItemCreate() {
    setEditingId(null);
    itemForm.setValues({ name: '', sku: '', itemGroupId: groups[0]?._id || '', unit: 'pcs', hsnCode: '', gstRate: 18, costingMethod: 'weighted_average', reorderLevel: 0 });
    setError('');
    setModalType('item');
  }
  function openItemEdit(item) {
    setEditingId(item._id);
    itemForm.setValues({
      name: item.name,
      sku: item.sku,
      itemGroupId: item.itemGroupId?._id || item.itemGroupId || '',
      unit: item.unit,
      hsnCode: item.hsnCode || '',
      gstRate: item.gstRate ?? 18,
      costingMethod: item.costingMethod || 'weighted_average',
      reorderLevel: item.reorderLevel || 0,
    });
    setError('');
    setModalType('item');
  }

  // --- Groups ---
  function openGroupCreate() {
    setEditingId(null);
    groupForm.setValues({ name: '', code: '', type: 'raw_material' });
    setError('');
    setModalType('group');
  }
  function openGroupEdit(g) {
    setEditingId(g._id);
    groupForm.setValues({ name: g.name, code: g.code, type: g.type });
    setError('');
    setModalType('group');
  }

  async function handleItemSubmit(values) {
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.patch(`/items/${editingId}`, values);
        notifications.show({ title: 'Item updated', color: 'green' });
      } else {
        await api.post('/items', values);
        notifications.show({ title: 'Item created', color: 'green' });
      }
      setModalType(null);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  }

  async function handleGroupSubmit(values) {
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.patch(`/items/groups/${editingId}`, values);
        notifications.show({ title: 'Group updated', color: 'green' });
      } else {
        await api.post('/items/groups', values);
        notifications.show({ title: 'Group created', color: 'green' });
      }
      setModalType(null);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const endpoint = deleteType === 'item' ? `/items/${deleteTarget._id}`
        : `/items/groups/${deleteTarget._id}`;
      await api.delete(endpoint);
      notifications.show({ title: 'Deleted', color: 'green' });
      setDeleteTarget(null);
      setDeleteType(null);
      loadAll();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Failed', color: 'red' });
    }
    setDeleting(false);
  }

  if (loading) return <Center py="xl"><Loader /></Center>;

  const itemColumns = [
    { key: 'sku', label: 'SKU', render: (r) => r.sku, style: { fontFamily: 'monospace' } },
    { key: 'name', label: 'Name', render: (r) => r.name },
    { key: 'group', label: 'Group', render: (r) => r.itemGroupId?.name || '-' },
    { key: 'unit', label: 'Unit', render: (r) => r.unit },
    { key: 'gstRate', label: 'GST %', render: (r) => `${r.gstRate}%` },
    {
      key: 'actions', label: '',
      render: (r) => (
        <Group gap={4}>
          <ActionIcon variant="subtle" onClick={() => openItemEdit(r)}><IconPencil size={16} /></ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => { setDeleteTarget(r); setDeleteType('item'); }}><IconTrash size={16} /></ActionIcon>
        </Group>
      ),
    },
  ];

  const groupColumns = [
    { key: 'code', label: 'Code', render: (r) => r.code, style: { fontFamily: 'monospace' } },
    { key: 'name', label: 'Name', render: (r) => r.name },
    { key: 'type', label: 'Type', render: (r) => <Badge variant="light" size="sm">{r.type.replace(/_/g, ' ')}</Badge> },
    {
      key: 'actions', label: '',
      render: (r) => (
        <Group gap={4}>
          <ActionIcon variant="subtle" onClick={() => openGroupEdit(r)}><IconPencil size={16} /></ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => { setDeleteTarget(r); setDeleteType('group'); }}><IconTrash size={16} /></ActionIcon>
        </Group>
      ),
    },
  ];

  return (
    <div>
      <Title order={2} mb="lg">Items</Title>

      <Tabs defaultValue="items">
        <Tabs.List mb="md">
          <Tabs.Tab value="items">Items ({items.length})</Tabs.Tab>
          <Tabs.Tab value="groups">Groups ({groups.length})</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="items">
          <Group justify="flex-end" mb="sm">
            <Button leftSection={<IconPlus size={16} />} onClick={openItemCreate}>Add Item</Button>
          </Group>
          <DataTable columns={itemColumns} data={items} emptyMessage="No items yet" />
        </Tabs.Panel>

        <Tabs.Panel value="groups">
          <Group justify="flex-end" mb="sm">
            <Button leftSection={<IconPlus size={16} />} onClick={openGroupCreate}>Add Group</Button>
          </Group>
          <DataTable columns={groupColumns} data={groups} emptyMessage="No item groups yet" />
        </Tabs.Panel>
      </Tabs>

      {/* Item Modal */}
      <Modal opened={modalType === 'item'} onClose={() => setModalType(null)} title={editingId ? 'Edit Item' : 'New Item'} centered>
        {error && <Alert color="red" variant="light" mb="sm">{error}</Alert>}
        <form onSubmit={itemForm.onSubmit(handleItemSubmit)}>
          <Stack>
            <TextInput label="Name" required {...itemForm.getInputProps('name')} />
            <TextInput label="SKU" required {...itemForm.getInputProps('sku')} />
            <Select
              label="Group"
              data={groups.map((g) => ({ value: g._id, label: g.name }))}
              required
              searchable
              {...itemForm.getInputProps('itemGroupId')}
            />
            <TextInput label="Unit" required {...itemForm.getInputProps('unit')} />
            <TextInput label="HSN Code" {...itemForm.getInputProps('hsnCode')} />
            <NumberInput label="GST Rate (%)" min={0} max={100} {...itemForm.getInputProps('gstRate')} />
            <Select
              label="Costing Method"
              data={[{ value: 'weighted_average', label: 'Weighted Average' }, { value: 'fifo', label: 'FIFO' }]}
              {...itemForm.getInputProps('costingMethod')}
            />
            <NumberInput label="Reorder Level" min={0} {...itemForm.getInputProps('reorderLevel')} />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setModalType(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>{editingId ? 'Update' : 'Save'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Group Modal */}
      <Modal opened={modalType === 'group'} onClose={() => setModalType(null)} title={editingId ? 'Edit Group' : 'New Item Group'} centered>
        {error && <Alert color="red" variant="light" mb="sm">{error}</Alert>}
        <form onSubmit={groupForm.onSubmit(handleGroupSubmit)}>
          <Stack>
            <TextInput label="Name" required {...groupForm.getInputProps('name')} />
            <TextInput label="Code" required {...groupForm.getInputProps('code')} />
            <Select label="Type" data={GROUP_TYPES} required {...groupForm.getInputProps('type')} />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setModalType(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>{editingId ? 'Update' : 'Save'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <ConfirmDelete
        opened={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteType(null); }}
        onConfirm={handleDelete}
        loading={deleting}
        name={deleteTarget?.name || deleteTarget?.code}
      />
    </div>
  );
}

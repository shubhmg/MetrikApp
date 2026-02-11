import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Card,
  Text,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconTrash, IconPlus, IconChartBar, IconBook } from '@tabler/icons-react';
import DataTable from '../components/DataTable.jsx';
import ConfirmDelete from '../components/ConfirmDelete.jsx';
import ItemSalesGraphModal from '../components/ItemSalesGraphModal.jsx';
import api from '../services/api.js';
import { usePermission } from '../hooks/usePermission.js';

const GROUP_TYPES = [
  { value: 'raw_material', label: 'Raw Material' },
  { value: 'finished_good', label: 'Finished Good' },
  { value: 'semi_finished', label: 'Semi Finished' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'consumable', label: 'Consumable' },
];

export default function Items() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const canWrite = can('item', 'write');
  const canDelete = can('item', 'delete');
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupFilter, setGroupFilter] = useState('');

  // Modal state
  const [modalType, setModalType] = useState(null); // 'item' | 'group'
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [graphsOpen, setGraphsOpen] = useState(false);

  const itemForm = useForm({
    initialValues: { name: '', sku: '', itemGroupId: '', unitId: '', hsnCode: '', gstRate: 18, salesPrice: 0, reorderLevel: 0 },
  });
  const groupForm = useForm({
    initialValues: { name: '', code: '', type: 'raw_material' },
  });

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    if (!groupFilter && groups.length > 0) {
      const fg = groups.find((g) => g.type === 'finished_good');
      if (fg) setGroupFilter(fg._id);
    }
  }, [groups, groupFilter]);

  async function loadAll() {
    setLoading(true);
    try {
      const [itemsRes, groupsRes, unitsRes] = await Promise.all([
        api.get('/items'),
        api.get('/items/groups'),
        api.get('/items/units'),
      ]);
      setItems(itemsRes.data.data.items);
      setGroups(groupsRes.data.data.itemGroups);
      setUnits(unitsRes.data.data.units || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  // --- Items ---
  function openItemCreate() {
    setEditingId(null);
    itemForm.setValues({
      name: '',
      sku: '',
      itemGroupId: groups[0]?._id || '',
      unitId: units[0]?._id || '',
      hsnCode: '',
      gstRate: 18,
      salesPrice: 0,
      reorderLevel: 0,
    });
    setError('');
    setModalType('item');
  }
  function openItemEdit(item) {
    setEditingId(item._id);
    itemForm.setValues({
      name: item.name,
      sku: item.sku,
      itemGroupId: item.itemGroupId?._id || item.itemGroupId || '',
      unitId: item.unitId?._id || item.unitId || '',
      hsnCode: item.hsnCode || '',
      gstRate: item.gstRate ?? 18,
      salesPrice: item.salesPrice || 0,
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
        const { sku, itemGroupId, ...updateData } = values;
        await api.patch(`/items/${editingId}`, updateData);
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
    { key: 'unit', label: 'Unit', render: (r) => r.unitId?.symbol || r.unit || '-' },
    { key: 'gstRate', label: 'GST %', render: (r) => `${r.gstRate}%` },
    {
      key: 'actions', label: '',
      render: (r) => (
        <Group gap={4}>
          <ActionIcon variant="subtle" onClick={() => navigate(`/items/${r._id}/ledger`)}><IconBook size={16} /></ActionIcon>
          {canWrite && <ActionIcon variant="subtle" onClick={() => openItemEdit(r)}><IconPencil size={16} /></ActionIcon>}
          {canDelete && <ActionIcon variant="subtle" color="red" onClick={() => { setDeleteTarget(r); setDeleteType('item'); }}><IconTrash size={16} /></ActionIcon>}
        </Group>
      ),
    },
  ];

  const filteredItems = groupFilter
    ? items.filter((i) => (i.itemGroupId?._id || i.itemGroupId) === groupFilter)
    : items;

  const groupColumns = [
    { key: 'code', label: 'Code', render: (r) => r.code, style: { fontFamily: 'monospace' } },
    { key: 'name', label: 'Name', render: (r) => r.name },
    { key: 'type', label: 'Type', render: (r) => <Badge variant="light" size="sm">{r.type.replace(/_/g, ' ')}</Badge> },
    {
      key: 'actions', label: '',
      render: (r) => (
        <Group gap={4}>
          {canWrite && <ActionIcon variant="subtle" onClick={() => openGroupEdit(r)}><IconPencil size={16} /></ActionIcon>}
          {canDelete && <ActionIcon variant="subtle" color="red" onClick={() => { setDeleteTarget(r); setDeleteType('group'); }}><IconTrash size={16} /></ActionIcon>}
        </Group>
      ),
    },
  ];

  return (
    <div>
      <Title order={isMobile ? 3 : 2} mb="lg">Items</Title>

      <Tabs defaultValue="items">
        <Tabs.List mb="md" grow={isMobile}>
          <Tabs.Tab value="items">Items ({items.length})</Tabs.Tab>
          <Tabs.Tab value="groups">Groups ({groups.length})</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="items">
          {isMobile ? (
            <Stack gap="xs" mb="sm">
              <Select
                placeholder="All groups"
                data={[
                  { value: '', label: 'All groups' },
                  ...groups.map((g) => ({ value: g._id, label: g.name })),
                ]}
                value={groupFilter}
                onChange={(v) => setGroupFilter(v || '')}
                w="100%"
              />
              <Group gap="xs" align="center">
                {canWrite && <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={openItemCreate}
                  style={{ flex: 1 }}
                >
                  Add Item
                </Button>}
                <ActionIcon
                  variant="light"
                  color="teal"
                  size="lg"
                  onClick={() => setGraphsOpen(true)}
                  aria-label="Sales graphs"
                >
                  <IconChartBar size={18} />
                </ActionIcon>
              </Group>
            </Stack>
          ) : (
            <Group justify="space-between" mb="sm">
              <Select
                placeholder="All groups"
                data={[
                  { value: '', label: 'All groups' },
                  ...groups.map((g) => ({ value: g._id, label: g.name })),
                ]}
                value={groupFilter}
                onChange={(v) => setGroupFilter(v || '')}
                w={220}
              />
              <Group gap="xs">
                {canWrite && <Button leftSection={<IconPlus size={16} />} onClick={openItemCreate}>Add Item</Button>}
                <ActionIcon
                  variant="light"
                  color="teal"
                  size="lg"
                  onClick={() => setGraphsOpen(true)}
                  aria-label="Sales graphs"
                >
                  <IconChartBar size={18} />
                </ActionIcon>
              </Group>
            </Group>
          )}
          <DataTable
            columns={itemColumns}
            data={filteredItems}
            emptyMessage="No items yet"
            mobileRender={(r) => (
              <Card key={r._id} withBorder padding="sm">
                <Group justify="space-between" wrap="nowrap">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Text fw={600} truncate>{r.name}</Text>
                    <Text size="xs" c="dimmed" ff="monospace">{r.sku}</Text>
                    <Group gap={6} mt={4}>
                      {r.itemGroupId?.name && <Badge variant="light" size="sm">{r.itemGroupId.name}</Badge>}
                      <Text size="xs" c="dimmed">{r.unitId?.symbol || r.unit || '-'}</Text>
                      <Text size="xs" c="dimmed">GST {r.gstRate}%</Text>
                    </Group>
                  </div>
                  <Group gap={4}>
                    <ActionIcon variant="subtle" onClick={() => navigate(`/items/${r._id}/ledger`)}><IconBook size={16} /></ActionIcon>
                    {canWrite && <ActionIcon variant="subtle" onClick={() => openItemEdit(r)}><IconPencil size={16} /></ActionIcon>}
                    {canDelete && <ActionIcon variant="subtle" color="red" onClick={() => { setDeleteTarget(r); setDeleteType('item'); }}><IconTrash size={16} /></ActionIcon>}
                  </Group>
                </Group>
              </Card>
            )}
          />
        </Tabs.Panel>

        <Tabs.Panel value="groups">
          <Group justify="flex-end" mb="sm">
            {canWrite && <Button leftSection={<IconPlus size={16} />} onClick={openGroupCreate} fullWidth={isMobile}>Add Group</Button>}
          </Group>
          <DataTable
            columns={groupColumns}
            data={groups}
            emptyMessage="No item groups yet"
            mobileRender={(r) => (
              <Card key={r._id} withBorder padding="sm">
                <Group justify="space-between" wrap="nowrap">
                  <div>
                    <Text fw={600}>{r.name}</Text>
                    <Text size="xs" c="dimmed" ff="monospace">{r.code}</Text>
                    <Badge variant="light" size="sm" mt={4}>{r.type.replace(/_/g, ' ')}</Badge>
                  </div>
                  <Group gap={4}>
                    {canWrite && <ActionIcon variant="subtle" onClick={() => openGroupEdit(r)}><IconPencil size={16} /></ActionIcon>}
                    {canDelete && <ActionIcon variant="subtle" color="red" onClick={() => { setDeleteTarget(r); setDeleteType('group'); }}><IconTrash size={16} /></ActionIcon>}
                  </Group>
                </Group>
              </Card>
            )}
          />
        </Tabs.Panel>
      </Tabs>

      {/* Item Modal */}
      <Modal opened={modalType === 'item'} onClose={() => setModalType(null)} title={editingId ? 'Edit Item' : 'New Item'} centered fullScreen={isMobile}>
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
            <Select
              label="Unit"
              data={units.map((u) => ({ value: u._id, label: `${u.symbol} - ${u.name}` }))}
              required
              searchable
              {...itemForm.getInputProps('unitId')}
            />
            <TextInput label="HSN Code" {...itemForm.getInputProps('hsnCode')} />
            <NumberInput label="GST Rate (%)" min={0} max={100} {...itemForm.getInputProps('gstRate')} />
            <NumberInput label="Sales Price" min={0} decimalScale={2} {...itemForm.getInputProps('salesPrice')} />
            <NumberInput label="Reorder Level" min={0} {...itemForm.getInputProps('reorderLevel')} />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setModalType(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>{editingId ? 'Update' : 'Save'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Group Modal */}
      <Modal opened={modalType === 'group'} onClose={() => setModalType(null)} title={editingId ? 'Edit Group' : 'New Item Group'} centered fullScreen={isMobile}>
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

      <ItemSalesGraphModal
        opened={graphsOpen}
        onClose={() => setGraphsOpen(false)}
        items={items}
      />
    </div>
  );
}

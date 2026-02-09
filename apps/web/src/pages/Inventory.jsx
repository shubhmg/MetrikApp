import { useState, useEffect } from 'react';
import {
  Tabs,
  Select,
  TextInput,
  NumberInput,
  Switch,
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
import PhysicalStockModal from '../components/PhysicalStockModal.jsx';
import api from '../services/api.js';

const MC_TYPES = [
  { value: 'factory', label: 'Factory' },
  { value: 'godown', label: 'Godown' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'shop', label: 'Shop' },
];

export default function Inventory() {
  const [mcs, setMcs] = useState([]);
  const [groups, setGroups] = useState([]); // Needed for filter
  const [loading, setLoading] = useState(true);

  // Stock Report State
  const [stockData, setStockData] = useState([]);
  const [stockMcFilter, setStockMcFilter] = useState(null);
  const [stockGroupFilter, setStockGroupFilter] = useState(null);
  const [stockLoading, setStockLoading] = useState(false);

  // Modal state
  const [modalType, setModalType] = useState(null); // 'mc'
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [physicalStockOpen, setPhysicalStockOpen] = useState(false);

  const mcForm = useForm({
    initialValues: { name: '', code: '', type: 'factory', isDefault: false },
  });

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadStockReport(); }, [stockMcFilter, stockGroupFilter]);

  async function loadAll() {
    setLoading(true);
    try {
      const [mcsRes, groupsRes] = await Promise.all([
        api.get('/material-centres'),
        api.get('/items/groups'),
      ]);
      setMcs(mcsRes.data.data.materialCentres);
      setGroups(groupsRes.data.data.itemGroups);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function loadStockReport() {
    setStockLoading(true);
    try {
      let url = '/vouchers/stock-summary?';
      if (stockMcFilter) url += `materialCentreId=${stockMcFilter}&`;
      if (stockGroupFilter) url += `itemGroupId=${stockGroupFilter}&`;
      
      const res = await api.get(url);
      setStockData(res.data.data.stock);
    } catch (err) {
      console.error(err);
    }
    setStockLoading(false);
  }

  // --- Material Centres ---
  function openMcCreate() {
    setEditingId(null);
    mcForm.setValues({ name: '', code: '', type: 'factory', isDefault: false });
    setError('');
    setModalType('mc');
  }
  function openMcEdit(mc) {
    setEditingId(mc._id);
    mcForm.setValues({ name: mc.name, code: mc.code, type: mc.type, isDefault: mc.isDefault || false });
    setError('');
    setModalType('mc');
  }

  async function handleMcSubmit(values) {
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.patch(`/material-centres/${editingId}`, values);
        notifications.show({ title: 'Material Centre updated', color: 'green' });
      } else {
        await api.post('/material-centres', values);
        notifications.show({ title: 'Material Centre created', color: 'green' });
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
      await api.delete(`/material-centres/${deleteTarget._id}`);
      notifications.show({ title: 'Deleted', color: 'green' });
      setDeleteTarget(null);
      loadAll();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Failed', color: 'red' });
    }
    setDeleting(false);
  }

  if (loading) return <Center py="xl"><Loader /></Center>;

  const mcColumns = [
    { key: 'code', label: 'Code', render: (r) => r.code, style: { fontFamily: 'monospace' } },
    { key: 'name', label: 'Name', render: (r) => r.name },
    { key: 'type', label: 'Type', render: (r) => <Badge variant="light" size="sm">{r.type}</Badge> },
    { key: 'isDefault', label: 'Default', render: (r) => r.isDefault ? <Badge color="green" size="sm">Yes</Badge> : null },
    {
      key: 'actions', label: '',
      render: (r) => (
        <Group gap={4}>
          <ActionIcon variant="subtle" onClick={() => openMcEdit(r)}><IconPencil size={16} /></ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => { setDeleteTarget(r); }}><IconTrash size={16} /></ActionIcon>
        </Group>
      ),
    },
  ];

  const stockColumns = [
    { key: 'item', label: 'Item', render: (r) => r.itemId?.name || 'Unknown' },
    { key: 'sku', label: 'SKU', render: (r) => r.itemId?.sku || '-', style: { fontFamily: 'monospace' } },
    { key: 'group', label: 'Group', render: (r) => r.itemId?.itemGroupId?.name || '-' },
    { key: 'mc', label: 'Material Centre', render: (r) => r.materialCentreId?.name || '-' },
    { key: 'qty', label: 'Quantity', render: (r) => `${r.quantity} ${r.itemId?.unit || ''}` },
  ];

  return (
    <div>
      <Title order={2} mb="lg">Inventory</Title>

      <Tabs defaultValue="stock">
        <Tabs.List mb="md">
          <Tabs.Tab value="stock">Stock Report</Tabs.Tab>
          <Tabs.Tab value="centres">Material Centres ({mcs.length})</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="stock">
          <Group mb="md" justify="space-between">
            <Group>
              <Select 
                placeholder="Filter by Material Centre" 
                data={mcs.map(m => ({ value: m._id, label: m.name }))}
                value={stockMcFilter}
                onChange={setStockMcFilter}
                clearable
                w={250}
              />
              <Select 
                placeholder="Filter by Group" 
                data={groups.map(g => ({ value: g._id, label: g.name }))}
                value={stockGroupFilter}
                onChange={setStockGroupFilter}
                clearable
                w={250}
              />
              <Button variant="light" onClick={loadStockReport}>Refresh</Button>
            </Group>
            <Button variant="light" onClick={() => setPhysicalStockOpen(true)}>Physical Stock</Button>
          </Group>
          <DataTable columns={stockColumns} data={stockData} loading={stockLoading} emptyMessage="No stock data found" />
        </Tabs.Panel>

        <Tabs.Panel value="centres">
          <Group justify="flex-end" mb="sm">
            <Button leftSection={<IconPlus size={16} />} onClick={openMcCreate}>Add Centre</Button>
          </Group>
          <DataTable columns={mcColumns} data={mcs} emptyMessage="No material centres yet" />
        </Tabs.Panel>
      </Tabs>

      {/* Material Centre Modal */}
      <Modal opened={modalType === 'mc'} onClose={() => setModalType(null)} title={editingId ? 'Edit Material Centre' : 'New Material Centre'} centered>
        {error && <Alert color="red" variant="light" mb="sm">{error}</Alert>}
        <form onSubmit={mcForm.onSubmit(handleMcSubmit)}>
          <Stack>
            <TextInput label="Name" required {...mcForm.getInputProps('name')} />
            <TextInput label="Code" required {...mcForm.getInputProps('code')} />
            <Select label="Type" data={MC_TYPES} required {...mcForm.getInputProps('type')} />
            <Switch label="Default Centre" {...mcForm.getInputProps('isDefault', { type: 'checkbox' })} />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setModalType(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>{editingId ? 'Update' : 'Save'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <ConfirmDelete
        opened={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); }}
        onConfirm={handleDelete}
        loading={deleting}
        name={deleteTarget?.name || deleteTarget?.code}
      />

      <PhysicalStockModal opened={physicalStockOpen} onClose={() => setPhysicalStockOpen(false)} />
    </div>
  );
}

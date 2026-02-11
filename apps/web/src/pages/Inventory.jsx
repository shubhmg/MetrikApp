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
  Card,
  Text,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconTrash, IconPlus } from '@tabler/icons-react';
import DataTable from '../components/DataTable.jsx';
import ConfirmDelete from '../components/ConfirmDelete.jsx';
import PhysicalStockModal from '../components/PhysicalStockModal.jsx';
import api from '../services/api.js';
import { usePermission } from '../hooks/usePermission.js';

const MC_TYPES = [
  { value: 'factory', label: 'Factory' },
  { value: 'godown', label: 'Godown' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'shop', label: 'Shop' },
];

export default function Inventory() {
  const { can } = usePermission();
  const canWriteInv = can('inventory', 'write');
  const canDeleteInv = can('inventory', 'delete');
  const canWritePhysical = can('physical_stock', 'write');
  const [mcs, setMcs] = useState([]);
  const [groups, setGroups] = useState([]); // Needed for filter
  const [loading, setLoading] = useState(true);

  // Stock Report State
  const [stockData, setStockData] = useState([]);
  const [stockMcFilter, setStockMcFilter] = useState(null);
  const [stockGroupFilter, setStockGroupFilter] = useState(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockSelectOpen, setStockSelectOpen] = useState(false);

  // Modal state
  const [modalType, setModalType] = useState(null); // 'mc'
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [physicalStockOpen, setPhysicalStockOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 48em)');

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
      const loadedMcs = mcsRes.data.data.materialCentres;
      const loadedGroups = groupsRes.data.data.itemGroups;
      setMcs(loadedMcs);
      setGroups(loadedGroups);
      if (!stockMcFilter) {
        const defaultMc = loadedMcs.find((mc) => mc.isDefault) || loadedMcs[0];
        if (defaultMc) setStockMcFilter(defaultMc._id);
      }
      if (!stockGroupFilter) {
        const finishedGroup = loadedGroups.find((g) => g.type === 'finished_good') || loadedGroups[0];
        if (finishedGroup) setStockGroupFilter(finishedGroup._id);
      }
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
          {canWriteInv && <ActionIcon variant="subtle" onClick={() => openMcEdit(r)}><IconPencil size={16} /></ActionIcon>}
          {canDeleteInv && <ActionIcon variant="subtle" color="red" onClick={() => { setDeleteTarget(r); }}><IconTrash size={16} /></ActionIcon>}
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
      <Title order={isMobile ? 3 : 2} mb="lg">Inventory</Title>

      <Tabs defaultValue="stock">
        <Tabs.List mb="md" grow={isMobile}>
          <Tabs.Tab value="stock">Stock Report</Tabs.Tab>
          <Tabs.Tab value="centres">Material Centres ({mcs.length})</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="stock">
          <Stack gap="sm" mb="md">
            <Group grow wrap={isMobile ? 'wrap' : 'nowrap'}>
              <Select
                placeholder="Filter by MC"
                data={mcs.map(m => ({ value: m._id, label: m.name }))}
                value={stockMcFilter}
                onChange={setStockMcFilter}
                clearable
                size="sm"
                comboboxProps={{
                  withinPortal: true,
                  position: 'bottom-start',
                  onDropdownOpen: () => setStockSelectOpen(true),
                  onDropdownClose: () => setStockSelectOpen(false),
                }}
              />
              <Select
                placeholder="Filter by Group"
                data={groups.map(g => ({ value: g._id, label: g.name }))}
                value={stockGroupFilter}
                onChange={setStockGroupFilter}
                clearable
                size="sm"
                comboboxProps={{
                  withinPortal: true,
                  position: 'bottom-start',
                  onDropdownOpen: () => setStockSelectOpen(true),
                  onDropdownClose: () => setStockSelectOpen(false),
                }}
              />
            </Group>
            <Group grow={isMobile}>
              <Button size="sm" variant="light" onClick={loadStockReport}>Refresh</Button>
              {canWritePhysical && <Button size="sm" variant="light" onClick={() => setPhysicalStockOpen(true)}>Physical Stock</Button>}
            </Group>
          </Stack>
          {!stockSelectOpen && (
            <DataTable
              columns={stockColumns}
              data={stockData}
              loading={stockLoading}
              emptyMessage="No stock data found"
              mobileRender={(r) => (
                <Card key={r._id} withBorder padding="sm">
                  <Group justify="space-between" wrap="nowrap">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text fw={600} truncate>{r.itemId?.name || 'Unknown'}</Text>
                      <Text size="xs" c="dimmed" ff="monospace">{r.itemId?.sku || '-'}</Text>
                      <Group gap={6} mt={4}>
                        {r.itemId?.itemGroupId?.name && <Badge variant="light" size="xs">{r.itemId.itemGroupId.name}</Badge>}
                        {r.materialCentreId?.name && <Badge variant="light" size="xs" color="teal">{r.materialCentreId.name}</Badge>}
                      </Group>
                    </div>
                    <Text fw={700} size="md">{r.quantity} <Text span size="xs" c="dimmed">{r.itemId?.unit || ''}</Text></Text>
                  </Group>
                </Card>
              )}
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="centres">
          <Group justify="flex-end" mb="sm">
            {canWriteInv && <Button leftSection={<IconPlus size={16} />} onClick={openMcCreate} fullWidth={isMobile}>Add Centre</Button>}
          </Group>
          <DataTable
            columns={mcColumns}
            data={mcs}
            emptyMessage="No material centres yet"
            mobileRender={(r) => (
              <Card key={r._id} withBorder padding="sm">
                <Group justify="space-between" wrap="nowrap">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Text fw={600} truncate>{r.name}</Text>
                    <Text size="xs" c="dimmed" ff="monospace">{r.code}</Text>
                    <Group gap={6} mt={4}>
                      <Badge variant="light" size="xs">{r.type}</Badge>
                      {r.isDefault && <Badge color="green" size="xs">Default</Badge>}
                    </Group>
                  </div>
                  <Group gap={4}>
                    {canWriteInv && <ActionIcon variant="subtle" onClick={() => openMcEdit(r)}><IconPencil size={16} /></ActionIcon>}
                    {canDeleteInv && <ActionIcon variant="subtle" color="red" onClick={() => { setDeleteTarget(r); }}><IconTrash size={16} /></ActionIcon>}
                  </Group>
                </Group>
              </Card>
            )}
          />
        </Tabs.Panel>
      </Tabs>

      {/* Material Centre Modal */}
      <Modal opened={modalType === 'mc'} onClose={() => setModalType(null)} title={editingId ? 'Edit Material Centre' : 'New Material Centre'} centered fullScreen={isMobile}>
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

import { useState, useEffect, useMemo } from 'react';
import {
  Select,
  TextInput,
  PasswordInput,
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
  Checkbox,
  Table,
  Switch,
  MultiSelect,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconPlus, IconUserOff, IconUserCheck } from '@tabler/icons-react';
import DataTable from '../components/DataTable.jsx';
import api from '../services/api.js';
import { usePermission } from '../hooks/usePermission.js';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'operator', label: 'Operator' },
  { value: 'viewer', label: 'Viewer' },
];

const ROLE_COLORS = {
  owner: 'teal',
  admin: 'blue',
  manager: 'violet',
  accountant: 'orange',
  operator: 'cyan',
  viewer: 'gray',
};

const MODULES = {
  dashboard:        { label: 'Dashboard',                actions: ['read'] },
  sales_order:      { label: 'Sales Orders',             actions: ['read', 'write', 'delete'] },
  sales_invoice:    { label: 'Sales Invoices',           actions: ['read', 'write', 'delete'] },
  purchase_order:   { label: 'Purchase Orders',          actions: ['read', 'write', 'delete'] },
  purchase_invoice: { label: 'Purchase Invoices',        actions: ['read', 'write', 'delete'] },
  receipt:          { label: 'Receipts',                  actions: ['read', 'write', 'delete'] },
  payment:          { label: 'Payments',                  actions: ['read', 'write', 'delete'] },
  sales_return:     { label: 'Sales Returns',             actions: ['read', 'write', 'delete'] },
  purchase_return:  { label: 'Purchase Returns',          actions: ['read', 'write', 'delete'] },
  delivery_note:    { label: 'Delivery Notes',            actions: ['read', 'write', 'delete'] },
  grn:              { label: 'GRN',                       actions: ['read', 'write', 'delete'] },
  stock_transfer:   { label: 'Stock Transfers',           actions: ['read', 'write', 'delete'] },
  production:       { label: 'Productions',               actions: ['read', 'write', 'delete'] },
  physical_stock:   { label: 'Physical Stock',            actions: ['read', 'write', 'delete'] },
  journal:          { label: 'Journal Entries',           actions: ['read', 'write', 'delete'] },
  contra:           { label: 'Contra',                    actions: ['read', 'write', 'delete'] },
  item:             { label: 'Items & Groups',            actions: ['read', 'write', 'delete'] },
  inventory:        { label: 'Stock & Material Centres',  actions: ['read', 'write', 'delete'] },
  party:            { label: 'Parties',                   actions: ['read', 'write', 'delete'] },
  bom:              { label: 'Bill of Materials',         actions: ['read', 'write', 'delete'] },
  accounting:       { label: 'Accounting (CoA)',          actions: ['read', 'write', 'delete'] },
  member:           { label: 'Team Members',              actions: ['read', 'write', 'delete'] },
};

const MODULE_ENTRIES = Object.entries(MODULES);

export default function Members() {
  const { can, canAny } = usePermission();
  const canReadMember = canAny('member');
  const canWriteMember = can('member', 'write');
  const canDeleteMember = can('member', 'delete');
  const [members, setMembers] = useState([]);
  const [mcs, setMcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isMobile = useMediaQuery('(max-width: 48em)');

  // Create form
  const createForm = useForm({
    initialValues: { email: '', name: '', password: '', phone: '', role: 'viewer', allowedMaterialCentreIds: [] },
  });

  // Edit state
  const [editRole, setEditRole] = useState('');
  const [editPermissions, setEditPermissions] = useState([]);
  const [editActive, setEditActive] = useState(true);
  const [editAllowedMcs, setEditAllowedMcs] = useState([]);

  useEffect(() => { loadMembers(); }, [canReadMember]);
  useEffect(() => {
    api.get('/material-centres/lookup')
      .then(({ data }) => setMcs(data.data.materialCentres || []))
      .catch(() => {});
  }, []);

  async function loadMembers() {
    if (!canReadMember) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get('/members');
      setMembers(data.data.members);
    } catch { /* ignore */ }
    setLoading(false);
  }

  function openCreate() {
    createForm.setValues({ email: '', name: '', password: '', phone: '', role: 'viewer', allowedMaterialCentreIds: [] });
    setError('');
    setCreateOpen(true);
  }

  function openEdit(member) {
    setEditTarget(member);
    setEditRole(member.role);
    setEditPermissions([...(member.permissions || [])]);
    setEditActive(member.isActive);
    setEditAllowedMcs(member.allowedMaterialCentreIds || []);
    setError('');
  }

  async function handleCreate(values) {
    if (!canWriteMember) {
      notifications.show({ title: 'Not allowed', message: 'You do not have permission to add members', color: 'red' });
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/members', values);
      notifications.show({ title: 'Member added', color: 'green' });
      setCreateOpen(false);
      loadMembers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    }
    setSaving(false);
  }

  async function handleUpdate() {
    if (!canWriteMember) {
      notifications.show({ title: 'Not allowed', message: 'You do not have permission to update members', color: 'red' });
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.patch(`/members/${editTarget._id}`, {
        role: editRole,
        permissions: editPermissions,
        isActive: editActive,
        allowedMaterialCentreIds: editAllowedMcs,
      });
      notifications.show({ title: 'Member updated', color: 'green' });
      setEditTarget(null);
      loadMembers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update');
    }
    setSaving(false);
  }

  async function handleToggleActive(member) {
    if (!canDeleteMember) {
      notifications.show({ title: 'Not allowed', message: 'You do not have permission to deactivate members', color: 'red' });
      return;
    }
    try {
      if (member.isActive) {
        await api.delete(`/members/${member._id}`);
        notifications.show({ title: 'Member deactivated', color: 'orange' });
      } else {
        await api.patch(`/members/${member._id}`, { isActive: true });
        notifications.show({ title: 'Member reactivated', color: 'green' });
      }
      loadMembers();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Failed', color: 'red' });
    }
  }

  function togglePermission(mod, action) {
    const perm = `${mod}:${action}`;
    setEditPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  }

  if (loading) return <Center py="xl"><Loader /></Center>;
  const mcOptions = mcs.map((m) => ({ value: m._id, label: `${m.code ? `${m.code} - ` : ''}${m.name}`.trim() }));
  if (!canReadMember) {
    return (
      <Alert color="red" variant="light">
        You do not have permission to view team members.
      </Alert>
    );
  }

  const columns = [
    { key: 'name', label: 'Name', render: (r) => r.name },
    { key: 'email', label: 'Email', render: (r) => r.email },
    {
      key: 'role', label: 'Role',
      render: (r) => <Badge color={ROLE_COLORS[r.role] || 'gray'} variant="light" size="sm">{r.role}</Badge>,
    },
    {
      key: 'status', label: 'Status',
      render: (r) => <Badge color={r.isActive ? 'green' : 'red'} variant="light" size="sm">{r.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions', label: '',
      render: (r) => r.role === 'owner' ? null : (
        <Group gap={4}>
          {canWriteMember && (
            <ActionIcon variant="subtle" onClick={() => openEdit(r)}><IconPencil size={16} /></ActionIcon>
          )}
          {canDeleteMember && (
            <ActionIcon
              variant="subtle"
              color={r.isActive ? 'orange' : 'green'}
              onClick={() => handleToggleActive(r)}
            >
              {r.isActive ? <IconUserOff size={16} /> : <IconUserCheck size={16} />}
            </ActionIcon>
          )}
        </Group>
      ),
    },
  ];

  return (
    <div>
      {isMobile ? (
        <Stack gap="sm" mb="lg">
          <Title order={3}>Team Members</Title>
          {canWriteMember && <Button leftSection={<IconPlus size={16} />} onClick={openCreate} fullWidth>Add Member</Button>}
        </Stack>
      ) : (
        <Group justify="space-between" mb="lg">
          <Title order={2}>Team Members</Title>
          {canWriteMember && <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>Add Member</Button>}
        </Group>
      )}

      <DataTable
        columns={columns}
        data={members}
        emptyMessage="No team members yet"
        mobileRender={(r) => (
          <Card key={r._id} withBorder padding="sm">
            <Group justify="space-between" wrap="nowrap">
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text fw={600} truncate>{r.name}</Text>
                <Text size="xs" c="dimmed">{r.email}</Text>
                <Group gap={6} mt={4}>
                  <Badge color={ROLE_COLORS[r.role] || 'gray'} variant="light" size="sm">{r.role}</Badge>
                  <Badge color={r.isActive ? 'green' : 'red'} variant="light" size="sm">
                    {r.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </Group>
              </div>
              {r.role !== 'owner' && (
                <Group gap={4}>
                  {canWriteMember && (
                    <ActionIcon variant="subtle" onClick={() => openEdit(r)}><IconPencil size={16} /></ActionIcon>
                  )}
                  {canDeleteMember && (
                    <ActionIcon
                      variant="subtle"
                      color={r.isActive ? 'orange' : 'green'}
                      onClick={() => handleToggleActive(r)}
                    >
                      {r.isActive ? <IconUserOff size={16} /> : <IconUserCheck size={16} />}
                    </ActionIcon>
                  )}
                </Group>
              )}
            </Group>
          </Card>
        )}
      />

      {/* Create Modal */}
      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="Add Team Member" centered fullScreen={isMobile}>
        {error && <Alert color="red" variant="light" mb="sm">{error}</Alert>}
        <form onSubmit={createForm.onSubmit(handleCreate)}>
          <Stack>
            <TextInput label="Email" required type="email" {...createForm.getInputProps('email')} />
            <TextInput label="Name" required {...createForm.getInputProps('name')} />
            <PasswordInput label="Password" required minLength={6} {...createForm.getInputProps('password')} />
            <TextInput label="Phone" {...createForm.getInputProps('phone')} />
            <Select label="Role" data={ROLE_OPTIONS} required {...createForm.getInputProps('role')} />
            <MultiSelect
              label="Inventory Scope (Material Centres)"
              placeholder="All material centres"
              data={mcOptions}
              clearable
              searchable
              {...createForm.getInputProps('allowedMaterialCentreIds')}
            />
            <Text size="xs" c="dimmed">
              Leave empty to allow access to all material centres.
            </Text>
            <Text size="xs" c="dimmed">
              Default permissions for the selected role will be applied. You can customize them after creation.
            </Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" loading={saving}>Add Member</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        opened={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Edit Member: ${editTarget?.name || ''}`}
        centered
        size="lg"
        fullScreen={isMobile}
      >
        {error && <Alert color="red" variant="light" mb="sm">{error}</Alert>}
        <Stack>
          <Group grow>
            <Select
              label="Role"
              data={ROLE_OPTIONS}
              value={editRole}
              onChange={setEditRole}
            />
            <Switch
              label="Active"
              checked={editActive}
              onChange={(e) => setEditActive(e.target.checked)}
              mt="xl"
            />
          </Group>

          <MultiSelect
            label="Inventory Scope (Material Centres)"
            placeholder="All material centres"
            data={mcOptions}
            clearable
            searchable
            value={editAllowedMcs}
            onChange={setEditAllowedMcs}
          />
          <Text size="xs" c="dimmed">
            Leave empty to allow access to all material centres.
          </Text>

          <Text fw={600} size="sm" mt="sm">Permissions</Text>
          <div style={{ overflowX: 'auto' }}>
            <Table withTableBorder withColumnBorders striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Module</Table.Th>
                  <Table.Th style={{ textAlign: 'center', width: 70 }}>Read</Table.Th>
                  <Table.Th style={{ textAlign: 'center', width: 70 }}>Write</Table.Th>
                  <Table.Th style={{ textAlign: 'center', width: 70 }}>Delete</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {MODULE_ENTRIES.map(([mod, { label, actions }]) => (
                  <Table.Tr key={mod}>
                    <Table.Td><Text size="sm">{label}</Text></Table.Td>
                    {['read', 'write', 'delete'].map((action) => (
                      <Table.Td key={action} style={{ textAlign: 'center' }}>
                        {actions.includes(action) ? (
                          <Checkbox
                            checked={editPermissions.includes(`${mod}:${action}`)}
                            onChange={() => togglePermission(mod, action)}
                            size="sm"
                            styles={{ input: { cursor: 'pointer' } }}
                          />
                        ) : (
                          <Text size="xs" c="dimmed">-</Text>
                        )}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleUpdate} loading={saving}>Save Changes</Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}

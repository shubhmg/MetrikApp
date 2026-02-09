import { useState, useEffect } from 'react';
import {
  Title,
  Text,
  Card,
  SimpleGrid,
  Badge,
  TextInput,
  Button,
  Group,
  Stack,
  Center,
  Loader,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { useAuthStore } from '../store/authStore.js';
import api from '../services/api.js';

export default function Dashboard() {
  const { user, currentBusinessId } = useAuthStore();
  const { setCurrentBusiness } = useAuthStore();
  const [businesses, setBusinesses] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadBusinesses(); }, []);

  async function loadBusinesses() {
    try {
      const { data } = await api.get('/businesses');
      setBusinesses(data.data.businesses);
      if (!currentBusinessId && data.data.businesses.length > 0) {
        setCurrentBusiness(data.data.businesses[0]._id);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newBizName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/businesses', { name: newBizName.trim() });
      setCurrentBusiness(data.data.business._id);
      setNewBizName('');
      setShowCreate(false);
      notifications.show({ title: 'Business created', color: 'green' });
      loadBusinesses();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Failed', color: 'red' });
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <Center py="xl"><Loader /></Center>;
  }

  return (
    <div>
      <Title order={2} mb={4}>Dashboard</Title>
      <Text c="dimmed" mb="lg">Welcome, {user?.name}</Text>

      <Group justify="space-between" mb="md">
        <Title order={3}>Your Businesses</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          variant="light"
          onClick={() => setShowCreate(!showCreate)}
        >
          New Business
        </Button>
      </Group>

      {showCreate && (
        <Card withBorder mb="md" p="sm">
          <form onSubmit={handleCreate}>
            <Group>
              <TextInput
                placeholder="Business name"
                value={newBizName}
                onChange={(e) => setNewBizName(e.target.value)}
                style={{ flex: 1 }}
                required
              />
              <Button type="submit" loading={creating}>Create</Button>
              <Button variant="default" onClick={() => setShowCreate(false)}>Cancel</Button>
            </Group>
          </form>
        </Card>
      )}

      {businesses.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">No businesses yet. Create one to get started.</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }}>
          {businesses.map((biz) => {
            const isActive = currentBusinessId === biz._id;
            return (
              <Card
                key={biz._id}
                withBorder
                padding="lg"
                style={{
                  cursor: 'pointer',
                  borderColor: isActive ? 'var(--mantine-color-blue-5)' : undefined,
                  backgroundColor: isActive ? 'var(--mantine-color-blue-0)' : undefined,
                }}
                onClick={() => setCurrentBusiness(biz._id)}
              >
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text fw={600}>{biz.name}</Text>
                    {isActive && <Badge color="blue">Active</Badge>}
                  </Group>
                  <Text size="sm" c="dimmed" tt="capitalize">{biz.role}</Text>
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      )}
    </div>
  );
}

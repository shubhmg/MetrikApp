import { useEffect, useState } from 'react';
import { Alert, Button, Card, Group, Stack, Switch, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import api from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';

export default function Settings() {
  const businessId = useAuthStore((s) => s.currentBusinessId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [featureEnabled, setFeatureEnabled] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    api.get(`/businesses/${businessId}`)
      .then(({ data }) => {
        setFeatureEnabled(data.data.business?.settings?.features?.invoiceEmailPrintEnabled === true);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, [businessId]);

  async function saveSettings() {
    if (!businessId) return;
    setSaving(true);
    setError('');
    try {
      await api.patch(`/businesses/${businessId}`, {
        settings: {
          features: {
            invoiceEmailPrintEnabled: featureEnabled,
          },
        },
      });
      notifications.show({ title: 'Settings updated', color: 'green' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Title order={2} mb="lg">Settings</Title>
      <Card withBorder>
        <Stack>
          <Text fw={600}>Invoice Email Print</Text>
          <Text size="sm" c="dimmed">
            When enabled, posted sales invoices can be emailed to MC print-email automatically.
          </Text>
          <Switch
            label="Enable Invoice Auto Print Feature"
            checked={featureEnabled}
            onChange={(e) => setFeatureEnabled(e.currentTarget.checked)}
            disabled={loading}
          />
          {error && <Alert color="red" variant="light">{error}</Alert>}
          <Group justify="flex-end">
            <Button onClick={saveSettings} loading={saving} disabled={loading}>Save</Button>
          </Group>
        </Stack>
      </Card>
    </div>
  );
}

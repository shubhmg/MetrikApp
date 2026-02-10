import { Group, Title, Badge, Button, Stack } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconPlus } from '@tabler/icons-react';

export default function PageHeader({ title, count, actionLabel, onAction, children }) {
  const isMobile = useMediaQuery('(max-width: 48em)');

  if (isMobile) {
    return (
      <Stack gap="xs" mb="md">
        <Group justify="space-between">
          <Group>
            <Title order={3}>{title}</Title>
            {count != null && (
              <Badge variant="light" size="lg">{count}</Badge>
            )}
          </Group>
        </Group>
        {children && (
          <Group grow>
            {children}
          </Group>
        )}
        {actionLabel && (
          <Button leftSection={<IconPlus size={16} />} onClick={onAction} fullWidth>
            {actionLabel}
          </Button>
        )}
      </Stack>
    );
  }

  return (
    <Group justify="space-between" mb="lg">
      <Group>
        <Title order={2}>{title}</Title>
        {count != null && (
          <Badge variant="light" size="lg">{count}</Badge>
        )}
      </Group>
      <Group>
        {children}
        {actionLabel && (
          <Button leftSection={<IconPlus size={16} />} onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </Group>
    </Group>
  );
}

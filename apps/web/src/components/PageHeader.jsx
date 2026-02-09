import { Group, Title, Badge, Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

export default function PageHeader({ title, count, actionLabel, onAction, children }) {
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

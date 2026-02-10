import { Modal, Text, Group, Button, Stack } from '@mantine/core';

export default function ConfirmDelete({ opened, onClose, onConfirm, loading, name }) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Delete"
      centered
      size="sm"
      styles={{ content: { background: 'var(--app-surface)' } }}
    >
      <Stack gap="sm">
        <Text c="dimmed">
          This will permanently delete <strong>{name}</strong>. This action cannot be undone.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button color="red" onClick={onConfirm} loading={loading}>Delete</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

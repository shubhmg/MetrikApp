import { Modal, Text, Group, Button } from '@mantine/core';

export default function ConfirmDelete({ opened, onClose, onConfirm, loading, name }) {
  return (
    <Modal opened={opened} onClose={onClose} title="Confirm Delete" centered size="sm">
      <Text mb="lg">
        Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.
      </Text>
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>Cancel</Button>
        <Button color="red" onClick={onConfirm} loading={loading}>Delete</Button>
      </Group>
    </Modal>
  );
}

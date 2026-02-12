import { Table, Text, Center, Loader, Stack } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

export default function DataTable({ columns, data, loading, emptyMessage = 'No data found', onRowClick, mobileRender, alwaysCard = true }) {
  const isMobile = useMediaQuery('(max-width: 48em)');

  if (loading) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );
  }

  if (data.length === 0) {
    return (
      <Center py="xl">
        <Text c="dimmed">{emptyMessage}</Text>
      </Center>
    );
  }

  // Mobile card view
  if (mobileRender && (isMobile || alwaysCard)) {
    return (
      <Stack gap="xs">
        {data.map((row, i) => mobileRender(row, i))}
      </Stack>
    );
  }

  // Desktop table view
  return (
    <Table striped highlightOnHover withTableBorder>
      <Table.Thead>
        <Table.Tr>
          {columns.map((col) => (
            <Table.Th key={col.key} style={col.style}>
              {col.label}
            </Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {data.map((row, i) => (
          <Table.Tr
            key={row._id || i}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            style={onRowClick ? { cursor: 'pointer' } : undefined}
          >
            {columns.map((col) => (
              <Table.Td key={col.key} style={col.style}>
                {col.render ? col.render(row) : row[col.key]}
              </Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

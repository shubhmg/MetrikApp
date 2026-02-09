import { useDisclosure } from '@mantine/hooks';
import { Outlet, NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import {
  AppShell as MantineAppShell,
  Burger,
  Group,
  NavLink,
  Text,
  Button,
  Box,
} from '@mantine/core';
import {
  IconLayoutDashboard,
  IconFileInvoice,
  IconPackage,
  IconUsers,
  IconReportMoney,
  IconSettings,
} from '@tabler/icons-react';
import { useAuth } from '../../hooks/useAuth.js';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: IconLayoutDashboard },
  { path: '/vouchers', label: 'Vouchers', icon: IconFileInvoice },
  { path: '/inventory', label: 'Inventory', icon: IconPackage },
  { path: '/parties', label: 'Parties', icon: IconUsers },
  { path: '/accounting', label: 'Accounting', icon: IconReportMoney },
  { path: '/settings', label: 'Settings', icon: IconSettings },
];

export default function AppShell() {
  const [opened, { toggle, close }] = useDisclosure();
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <MantineAppShell
      header={{ height: 56 }}
      navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <MantineAppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700} size="lg" c="blue">Natraj ERP</Text>
          </Group>
          <Group>
            <Text size="sm" c="dimmed">{user?.name}</Text>
            <Button variant="subtle" size="xs" onClick={logout}>Logout</Button>
          </Group>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="xs">
        <Box style={{ flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                component={RouterNavLink}
                to={item.path}
                label={item.label}
                leftSection={<item.icon size={20} stroke={1.5} />}
                active={isActive}
                onClick={close}
                style={{ borderRadius: 'var(--mantine-radius-md)' }}
              />
            );
          })}
        </Box>
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>
        <Outlet />
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}

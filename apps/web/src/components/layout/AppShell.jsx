import { useState } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import { Outlet, NavLink as RouterNavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AppShell as MantineAppShell,
  Burger,
  Group,
  NavLink,
  Text,
  Button,
  Box,
  ActionIcon,
  Drawer,
  Stack,
  Divider,
  Switch,
  UnstyledButton,
} from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
import {
  IconLayoutDashboard,
  IconFileInvoice,
  IconPackage,
  IconUsers,
  IconReportMoney,
  IconSettings,
  IconBox,
  IconAssembly,
  IconTool,
  IconClipboardList,
  IconClipboardCheck,
  IconDots,
  IconSun,
  IconMoon,
  IconReceipt,
  IconPlus,
} from '@tabler/icons-react';
import { useAuth } from '../../hooks/useAuth.js';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: IconLayoutDashboard },
  { group: 'Sales', items: [
    { path: '/sales-orders', label: 'Sales Orders', icon: IconClipboardList },
    { path: '/sales-invoices', label: 'Sales Invoices', icon: IconFileInvoice },
    { path: '/receipts', label: 'Receipts', icon: IconReceipt },
  ]},
  { group: 'Purchases', items: [
    { path: '/purchase-orders', label: 'Purchase Orders', icon: IconClipboardCheck },
  ]},
  { group: 'Inventory', items: [
    { path: '/items', label: 'Items', icon: IconBox },
    { path: '/inventory', label: 'Stock & MCs', icon: IconPackage },
    { path: '/boms', label: 'Bill of Materials', icon: IconAssembly },
    { path: '/productions', label: 'Productions', icon: IconTool },
  ]},
  { group: 'Other', items: [
    { path: '/vouchers', label: 'All Vouchers', icon: IconFileInvoice },
    { path: '/parties', label: 'Parties', icon: IconUsers },
    { path: '/accounting', label: 'Accounting', icon: IconReportMoney },
    { path: '/settings', label: 'Settings', icon: IconSettings },
  ]},
];

// Flat list for sidebar
const FLAT_NAV = [];
for (const entry of NAV_ITEMS) {
  if (entry.path) {
    FLAT_NAV.push(entry);
  } else if (entry.items) {
    for (const item of entry.items) {
      FLAT_NAV.push(item);
    }
  }
}

// Bottom tab bar tabs
const BOTTOM_TABS = [
  { path: '/', label: 'Home', icon: IconLayoutDashboard },
  { path: '/sales-orders', label: 'Orders', icon: IconClipboardList },
  { path: '__more__', label: 'More', icon: IconPlus },
  { path: '/parties', label: 'Parties', icon: IconUsers },
  { path: '/inventory', label: 'Inventory', icon: IconPackage },
];

// "More" drawer items (everything not in bottom tabs)
const MORE_ITEMS = [
  { path: '/', label: 'Dashboard', icon: IconLayoutDashboard },
  { path: '/sales-orders', label: 'Sales Orders', icon: IconClipboardList },
  { path: '/sales-invoices', label: 'Sales Invoices', icon: IconFileInvoice },
  { path: '/receipts', label: 'Receipts', icon: IconReceipt },
  { path: '/purchase-orders', label: 'Purchase Orders', icon: IconClipboardCheck },
  { path: '/vouchers', label: 'All Vouchers', icon: IconFileInvoice },
  { path: '/items', label: 'Items', icon: IconBox },
  { path: '/inventory', label: 'Stock & MCs', icon: IconPackage },
  { path: '/boms', label: 'Bill of Materials', icon: IconAssembly },
  { path: '/productions', label: 'Productions', icon: IconTool },
  { path: '/parties', label: 'Parties', icon: IconUsers },
  { path: '/accounting', label: 'Accounting', icon: IconReportMoney },
  { path: '/settings', label: 'Settings', icon: IconSettings },
];

function isActive(itemPath, locationPath) {
  if (itemPath === '/') return locationPath === '/';
  return locationPath.startsWith(itemPath);
}

export default function AppShell() {
  const [sidebarOpened, setSidebarOpened] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const hideBottomBar = isMobile && (
    location.pathname.startsWith('/vouchers/new') ||
    location.pathname.includes('/edit') ||
    location.pathname.includes('/ledger') ||
    location.pathname.startsWith('/vouchers/')
  );

  function handleBottomTab(tab) {
    if (tab.path === '__more__') {
      setMoreOpen(true);
      return;
    }
    navigate(tab.path);
  }

  function handleMoreNav(path) {
    setMoreOpen(false);
    navigate(path);
  }

  return (
    <>
      <MantineAppShell
        header={{ height: 56 }}
        navbar={isMobile ? undefined : { width: 260, breakpoint: 'sm', collapsed: { mobile: true } }}
        padding="md"
        style={isMobile ? { '--app-shell-padding': 'var(--mantine-spacing-sm)' } : undefined}
      >
        <MantineAppShell.Header className="app-header">
          <Group h="100%" px="md" justify="space-between">
            <Group>
              {!isMobile && (
                <Burger opened={sidebarOpened} onClick={() => setSidebarOpened(!sidebarOpened)} hiddenFrom="sm" size="sm" />
              )}
              <Text fw={700} size="lg" c="teal">Metrik</Text>
            </Group>
            <Group>
              {!isMobile && (
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  onClick={toggleColorScheme}
                  aria-label="Toggle color scheme"
                >
                  {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
                </ActionIcon>
              )}
              {!isMobile && (
                <>
                  <Text size="sm" c="dimmed">{user?.name}</Text>
                  <Button variant="subtle" size="xs" onClick={logout}>Logout</Button>
                </>
              )}
            </Group>
          </Group>
        </MantineAppShell.Header>

        {/* Desktop Sidebar */}
        {!isMobile && (
          <MantineAppShell.Navbar p="xs">
            <Box style={{ flex: 1, overflowY: 'auto' }}>
              {NAV_ITEMS.map((entry, idx) => {
                if (entry.path) {
                  return (
                    <NavLink
                      key={entry.path}
                      component={RouterNavLink}
                      to={entry.path}
                      label={entry.label}
                      leftSection={<entry.icon size={20} stroke={1.5} />}
                      active={isActive(entry.path, location.pathname)}
                      onClick={() => setSidebarOpened(false)}
                      style={{ borderRadius: 'var(--mantine-radius-md)' }}
                    />
                  );
                }
                return (
                  <Box key={entry.group}>
                    {idx > 0 && <Divider my="xs" />}
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" px="sm" mb={4}>
                      {entry.group}
                    </Text>
                    {entry.items.map((item) => (
                      <NavLink
                        key={item.path}
                        component={RouterNavLink}
                        to={item.path}
                        label={item.label}
                        leftSection={<item.icon size={20} stroke={1.5} />}
                        active={isActive(item.path, location.pathname)}
                        onClick={() => setSidebarOpened(false)}
                        style={{ borderRadius: 'var(--mantine-radius-md)' }}
                      />
                    ))}
                  </Box>
                );
              })}
            </Box>
          </MantineAppShell.Navbar>
        )}

        <MantineAppShell.Main
          className="page-root"
          style={isMobile ? { paddingBottom: 76 } : undefined}
        >
          <Outlet />
        </MantineAppShell.Main>
      </MantineAppShell>

      {/* Mobile Bottom Tab Bar */}
      {isMobile && !hideBottomBar && (
        <Box
          className="app-tabbar"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            paddingBottom: 'env(safe-area-inset-bottom)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            borderTop: '1px solid var(--mantine-color-default-border)',
            backgroundColor: 'var(--mantine-color-body)',
            zIndex: 200,
          }}
        >
          {BOTTOM_TABS.map((tab) => {
            const active = tab.path !== '__more__' && isActive(tab.path, location.pathname);
            const isMore = tab.path === '__more__';
            return (
              <UnstyledButton
                key={tab.path}
                onClick={() => handleBottomTab(tab)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  flex: 1,
                  padding: isMore ? 0 : '8px 0',
                  height: isMore ? 60 : 'auto',
                  justifyContent: 'center',
                }}
              >
                {isMore ? (
                  <ActionIcon
                    size={44}
                    radius="xl"
                    variant="filled"
                    color="teal"
                    style={{ boxShadow: 'none' }}
                    aria-label="More"
                  >
                    <IconPlus size={22} stroke={2} />
                  </ActionIcon>
                ) : (
                  <tab.icon
                    size={22}
                    stroke={1.5}
                    color={active ? 'var(--mantine-color-teal-6)' : 'var(--mantine-color-dimmed)'}
                  />
                )}
                <Text
                  size="xs"
                  fw={active ? 600 : 400}
                  c={tab.path === '__more__' ? 'dimmed' : active ? 'teal' : 'dimmed'}
                  style={{ lineHeight: 1 }}
                >
                  {isMore ? '' : tab.label}
                </Text>
              </UnstyledButton>
            );
          })}
        </Box>
      )}

      {/* More Drawer (mobile) */}
      <Drawer
        opened={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Menu"
        position="bottom"
        size="80%"
        styles={{ content: { borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}
      >
        <Stack gap={0}>
          {MORE_ITEMS.map((item) => {
            const active = isActive(item.path, location.pathname);
            return (
              <NavLink
                key={item.path}
                label={item.label}
                leftSection={<item.icon size={20} stroke={1.5} />}
                active={active}
                onClick={() => handleMoreNav(item.path)}
                style={{ borderRadius: 'var(--mantine-radius-md)' }}
              />
            );
          })}
        </Stack>
        <Divider my="md" />
        <Group justify="space-between" px="sm">
          <Text size="sm">Dark Mode</Text>
          <Switch
            checked={colorScheme === 'dark'}
            onChange={toggleColorScheme}
            size="md"
            onLabel={<IconSun size={14} />}
            offLabel={<IconMoon size={14} />}
          />
        </Group>
        <Divider my="md" />
        <Button variant="subtle" color="red" fullWidth onClick={logout}>
          Logout
        </Button>
      </Drawer>
    </>
  );
}

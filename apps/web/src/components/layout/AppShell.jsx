import { useState, useMemo } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import { Outlet, NavLink as RouterNavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AppShell as MantineAppShell,
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
  IconSun,
  IconMoon,
  IconReceipt,
  IconPlus,
  IconUsersGroup,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import { useAuth } from '../../hooks/useAuth.js';
import { usePermission } from '../../hooks/usePermission.js';

const ALL_NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: IconLayoutDashboard, module: 'dashboard' },
  { group: 'Sales', items: [
    { path: '/sales-orders', label: 'Sales Orders', icon: IconClipboardList, module: 'sales_order' },
    { path: '/sales-invoices', label: 'Sales Invoices', icon: IconFileInvoice, module: 'sales_invoice' },
    { path: '/receipts', label: 'Receipts', icon: IconReceipt, module: 'receipt' },
  ]},
  { group: 'Purchases', items: [
    { path: '/purchase-orders', label: 'Purchase Orders', icon: IconClipboardCheck, module: 'purchase_order' },
  ]},
  { group: 'Inventory', items: [
    { path: '/items', label: 'Items', icon: IconBox, module: 'item' },
    { path: '/inventory', label: 'Stock & MCs', icon: IconPackage, module: 'inventory' },
    { path: '/boms', label: 'Bill of Materials', icon: IconAssembly, module: 'bom' },
    { path: '/productions', label: 'Productions', icon: IconTool, module: 'production' },
  ]},
  { group: 'Other', items: [
    { path: '/vouchers', label: 'All Vouchers', icon: IconFileInvoice },
    { path: '/parties', label: 'Parties', icon: IconUsers, module: 'party' },
    { path: '/accounting', label: 'Accounting', icon: IconReportMoney, module: 'accounting' },
    { path: '/members', label: 'Members', icon: IconUsersGroup, module: 'member' },
    { path: '/settings', label: 'Settings', icon: IconSettings },
  ]},
];

function isActive(itemPath, locationPath) {
  if (itemPath === '/') return locationPath === '/';
  return locationPath.startsWith(itemPath);
}

export default function AppShell() {
  const [desktopNavCollapsed, setDesktopNavCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { user, logout } = useAuth();
  const { canAny, role } = usePermission();
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
  const isContractorUser = role === 'contractor';

  // Filter nav items by permission
  const NAV_ITEMS = useMemo(() => {
    if (isContractorUser) {
      return [
        { path: '/productions', label: 'Productions', icon: IconTool, module: 'production' },
        { path: '/parties', label: 'My Ledger', icon: IconUsers, module: 'party' },
      ];
    }
    return ALL_NAV_ITEMS.map((entry) => {
      if (entry.path) {
        // Top-level item
        if (entry.module && !canAny(entry.module)) return null;
        return entry;
      }
      if (entry.items) {
        const filtered = entry.items.filter(
          (item) => !item.module || canAny(item.module)
        );
        if (filtered.length === 0) return null;
        return { ...entry, items: filtered };
      }
      return entry;
    }).filter(Boolean);
  }, [canAny, isContractorUser]);

  // Flat list for "More" drawer
  const MORE_ITEMS = useMemo(() => {
    const flat = [];
    for (const entry of NAV_ITEMS) {
      if (entry.path) flat.push(entry);
      else if (entry.items) flat.push(...entry.items);
    }
    return flat;
  }, [NAV_ITEMS]);

  // Bottom tabs — filtered by permission
  const ALL_BOTTOM_TABS = isContractorUser ? [
    { path: '/productions', label: 'Productions', icon: IconTool, module: 'production' },
    { path: '/parties', label: 'Ledger', icon: IconUsers, module: 'party' },
  ] : [
    { path: '/', label: 'Home', icon: IconLayoutDashboard, module: 'dashboard' },
    { path: '/sales-orders', label: 'Orders', icon: IconClipboardList, module: 'sales_order' },
    { path: '__more__', label: 'More', icon: IconPlus },
    { path: '/parties', label: 'Parties', icon: IconUsers, module: 'party' },
    { path: '/inventory', label: 'Inventory', icon: IconPackage, module: 'inventory' },
  ];
  const BOTTOM_TABS = useMemo(() =>
    ALL_BOTTOM_TABS.filter((tab) => !tab.module || canAny(tab.module)),
    [canAny]
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
        header={{ height: 'var(--app-header-height)' }}
        navbar={isMobile ? undefined : { width: 260, breakpoint: 'sm', collapsed: { mobile: true, desktop: desktopNavCollapsed } }}
        padding="md"
        style={isMobile ? { '--app-shell-padding': 'var(--mantine-spacing-sm)' } : undefined}
      >
        <MantineAppShell.Header className="app-header">
          <Group h="100%" px="md" justify="space-between" style={{ paddingTop: 'var(--safe-area-inset-top)' }}>
            <Group>
              {!isMobile && (
                <ActionIcon
                  size="lg"
                  radius="md"
                  variant="light"
                  color="gray"
                  onClick={() => setDesktopNavCollapsed((v) => !v)}
                  aria-label={desktopNavCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                >
                  {desktopNavCollapsed ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
                </ActionIcon>
              )}
              <Text fw={700} size="1.5rem" c="teal">Metrik</Text>
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

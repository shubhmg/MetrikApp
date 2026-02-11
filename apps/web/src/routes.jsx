import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Vouchers from './pages/Vouchers.jsx';
import VoucherCreate from './pages/VoucherCreate.jsx';
import Inventory from './pages/Inventory.jsx';
import Items from './pages/Items.jsx';
import ItemLedger from './pages/ItemLedger.jsx';
import Parties from './pages/Parties.jsx';
import PartyLedger from './pages/PartyLedger.jsx';
import Accounting from './pages/Accounting.jsx';
import SalesInvoices from './pages/SalesInvoices.jsx';
import Boms from './pages/Boms.jsx';
import Productions from './pages/Productions.jsx';
import Receipts from './pages/Receipts.jsx';
import SalesOrders from './pages/SalesOrders.jsx';
import PurchaseOrders from './pages/PurchaseOrders.jsx';
import Members from './pages/Members.jsx';
import { useAuthStore } from './store/authStore.js';
import { usePermission } from './hooks/usePermission.js';

function ProtectedRoute({ children }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (accessToken) return <Navigate to="/" replace />;
  return children;
}

function PermissionRoute({ module, children }) {
  const { canAny } = usePermission();
  if (module && !canAny(module)) return <Navigate to="/" replace />;
  return children;
}

function VoucherRoute({ children }) {
  const { can } = usePermission();
  const voucherModules = [
    'sales_invoice',
    'purchase_invoice',
    'sales_return',
    'purchase_return',
    'payment',
    'receipt',
    'journal',
    'contra',
    'stock_transfer',
    'grn',
    'delivery_note',
    'production',
    'sales_order',
    'purchase_order',
    'physical_stock',
  ];
  const canAnyVoucher = voucherModules.some((m) => can(m, 'read') || can(m, 'write') || can(m, 'delete'));
  if (!canAnyVoucher) return <Navigate to="/" replace />;
  return children;
}

function Placeholder({ title }) {
  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{title}</h1>
      <p style={{ color: '#64748b', marginTop: 8 }}>Coming soon</p>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'items', element: <PermissionRoute module="item"><Items /></PermissionRoute> },
      { path: 'items/:id/ledger', element: <PermissionRoute module="item"><ItemLedger /></PermissionRoute> },
      { path: 'boms', element: <PermissionRoute module="bom"><Boms /></PermissionRoute> },
      { path: 'productions', element: <PermissionRoute module="production"><Productions /></PermissionRoute> },
      { path: 'sales-orders', element: <PermissionRoute module="sales_order"><SalesOrders /></PermissionRoute> },
      { path: 'purchase-orders', element: <PermissionRoute module="purchase_order"><PurchaseOrders /></PermissionRoute> },
      { path: 'sales-invoices', element: <PermissionRoute module="sales_invoice"><SalesInvoices /></PermissionRoute> },
      { path: 'receipts', element: <PermissionRoute module="receipt"><Receipts /></PermissionRoute> },
      { path: 'vouchers', element: <VoucherRoute><Vouchers /></VoucherRoute> },
      { path: 'vouchers/new', element: <VoucherRoute><VoucherCreate /></VoucherRoute> },
      { path: 'vouchers/:id/edit', element: <VoucherRoute><VoucherCreate /></VoucherRoute> },
      { path: 'inventory', element: <PermissionRoute module="inventory"><Inventory /></PermissionRoute> },
      { path: 'parties', element: <PermissionRoute module="party"><Parties /></PermissionRoute> },
      { path: 'parties/:id/ledger', element: <PermissionRoute module="party"><PartyLedger /></PermissionRoute> },
      { path: 'accounting', element: <PermissionRoute module="accounting"><Accounting /></PermissionRoute> },
      { path: 'members', element: <PermissionRoute module="member"><Members /></PermissionRoute> },
      { path: 'settings', element: <Placeholder title="Settings" /> },
    ],
  },
]);

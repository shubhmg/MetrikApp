import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
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
import Settings from './pages/Settings.jsx';
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

function NonContractorRoute({ children }) {
  const { role } = usePermission();
  if (role === 'contractor') return <Navigate to="/productions" replace />;
  return children;
}

function HomeRoute() {
  const { role } = usePermission();
  if (role === 'contractor') return <Navigate to="/productions" replace />;
  return <Dashboard />;
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

function ContractorProductionCreateRoute({ children }) {
  const { role } = usePermission();
  const location = useLocation();
  if (role !== 'contractor') return children;

  const params = new URLSearchParams(location.search);
  const type = params.get('type');
  if (type && type !== 'production') {
    return <Navigate to="/vouchers/new?type=production" replace />;
  }
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
      { index: true, element: <HomeRoute /> },
      { path: 'items', element: <NonContractorRoute><PermissionRoute module="item"><Items /></PermissionRoute></NonContractorRoute> },
      { path: 'items/:id/ledger', element: <NonContractorRoute><PermissionRoute module="item"><ItemLedger /></PermissionRoute></NonContractorRoute> },
      { path: 'boms', element: <NonContractorRoute><PermissionRoute module="bom"><Boms /></PermissionRoute></NonContractorRoute> },
      { path: 'productions', element: <PermissionRoute module="production"><Productions /></PermissionRoute> },
      { path: 'sales-orders', element: <NonContractorRoute><PermissionRoute module="sales_order"><SalesOrders /></PermissionRoute></NonContractorRoute> },
      { path: 'purchase-orders', element: <NonContractorRoute><PermissionRoute module="purchase_order"><PurchaseOrders /></PermissionRoute></NonContractorRoute> },
      { path: 'sales-invoices', element: <NonContractorRoute><PermissionRoute module="sales_invoice"><SalesInvoices /></PermissionRoute></NonContractorRoute> },
      { path: 'receipts', element: <NonContractorRoute><PermissionRoute module="receipt"><Receipts /></PermissionRoute></NonContractorRoute> },
      { path: 'vouchers', element: <NonContractorRoute><VoucherRoute><Vouchers /></VoucherRoute></NonContractorRoute> },
      { path: 'vouchers/new', element: <ContractorProductionCreateRoute><VoucherRoute><VoucherCreate /></VoucherRoute></ContractorProductionCreateRoute> },
      { path: 'vouchers/:id/edit', element: <NonContractorRoute><VoucherRoute><VoucherCreate /></VoucherRoute></NonContractorRoute> },
      { path: 'inventory', element: <NonContractorRoute><PermissionRoute module="inventory"><Inventory /></PermissionRoute></NonContractorRoute> },
      { path: 'parties', element: <PermissionRoute module="party"><Parties /></PermissionRoute> },
      { path: 'parties/:id/ledger', element: <PermissionRoute module="party"><PartyLedger /></PermissionRoute> },
      { path: 'accounting', element: <PermissionRoute module="accounting"><Accounting /></PermissionRoute> },
      { path: 'members', element: <NonContractorRoute><PermissionRoute module="member"><Members /></PermissionRoute></NonContractorRoute> },
      { path: 'settings', element: <Settings /> },
    ],
  },
]);

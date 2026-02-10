import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Vouchers from './pages/Vouchers.jsx';
import VoucherCreate from './pages/VoucherCreate.jsx';
import Inventory from './pages/Inventory.jsx';
import Items from './pages/Items.jsx';
import Parties from './pages/Parties.jsx';
import PartyLedger from './pages/PartyLedger.jsx';
import Accounting from './pages/Accounting.jsx';
import SalesInvoices from './pages/SalesInvoices.jsx';
import Boms from './pages/Boms.jsx';
import Productions from './pages/Productions.jsx';
import Receipts from './pages/Receipts.jsx';
import SalesOrders from './pages/SalesOrders.jsx';
import PurchaseOrders from './pages/PurchaseOrders.jsx';
import { useAuthStore } from './store/authStore.js';

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
      { path: 'items', element: <Items /> },
      { path: 'boms', element: <Boms /> },
      { path: 'productions', element: <Productions /> },
      { path: 'sales-orders', element: <SalesOrders /> },
      { path: 'purchase-orders', element: <PurchaseOrders /> },
      { path: 'sales-invoices', element: <SalesInvoices /> },
      { path: 'receipts', element: <Receipts /> },
      { path: 'vouchers', element: <Vouchers /> },
      { path: 'vouchers/new', element: <VoucherCreate /> },
      { path: 'vouchers/:id/edit', element: <VoucherCreate /> },
      { path: 'inventory', element: <Inventory /> },
      { path: 'parties', element: <Parties /> },
      { path: 'parties/:id/ledger', element: <PartyLedger /> },
      { path: 'accounting', element: <Accounting /> },
      { path: 'settings', element: <Placeholder title="Settings" /> },
    ],
  },
]);

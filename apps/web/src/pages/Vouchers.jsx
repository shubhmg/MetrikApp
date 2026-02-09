import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, Pagination, Center, Loader } from '@mantine/core';
import PageHeader from '../components/PageHeader.jsx';
import VoucherList from '../components/VoucherList.jsx';
import VoucherDetailModal from '../components/VoucherDetailModal.jsx';
import api from '../services/api.js';

const VOUCHER_TYPES = [
  { value: 'sales_invoice', label: 'Sales Invoice' },
  { value: 'purchase_invoice', label: 'Purchase Invoice' },
  { value: 'sales_return', label: 'Sales Return' },
  { value: 'purchase_return', label: 'Purchase Return' },
  { value: 'payment', label: 'Payment' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'journal', label: 'Journal' },
  { value: 'contra', label: 'Contra' },
  { value: 'stock_transfer', label: 'Stock Transfer' },
  { value: 'grn', label: 'GRN' },
  { value: 'delivery_note', label: 'Delivery Note' },
  { value: 'production', label: 'Production' },
  { value: 'sales_order', label: 'Sales Order' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'physical_stock', label: 'Physical Stock' },
];

export default function Vouchers() {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => { loadVouchers(); }, [page, typeFilter]);

  async function loadVouchers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (typeFilter) params.set('voucherType', typeFilter);
      const { data } = await api.get(`/vouchers?${params}`);
      setVouchers(data.data.vouchers);
      setTotal(data.data.total);
      setTotalPages(data.data.totalPages);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function viewDetail(row) {
    try {
      const { data } = await api.get(`/vouchers/${row._id}`);
      setSelected(data.data.voucher);
    } catch { /* ignore */ }
  }

  return (
    <div>
      <PageHeader title="All Vouchers" count={total} actionLabel="New Voucher" onAction={() => navigate('/vouchers/new')}>
        <Select
          placeholder="Filter Type"
          data={VOUCHER_TYPES}
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v); setPage(1); }}
          clearable
          searchable
          w={200}
        />
      </PageHeader>

      {loading ? (
        <Center py="xl"><Loader /></Center>
      ) : (
        <>
          <VoucherList vouchers={vouchers} onItemClick={viewDetail} />
          {totalPages > 1 && (
            <Center mt="md">
              <Pagination value={page} onChange={setPage} total={totalPages} />
            </Center>
          )}
        </>
      )}

      <VoucherDetailModal 
        voucher={selected} 
        onClose={() => setSelected(null)} 
        onUpdate={loadVouchers} 
      />
    </div>
  );
}

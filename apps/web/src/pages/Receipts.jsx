import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Center, Loader, Pagination } from '@mantine/core';
import PageHeader from '../components/PageHeader.jsx';
import VoucherList from '../components/VoucherList.jsx';
import VoucherDetailModal from '../components/VoucherDetailModal.jsx';
import api from '../services/api.js';
import { usePermission } from '../hooks/usePermission.js';

export default function Receipts() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const canWrite = can('receipt', 'write');
  const [vouchers, setVouchers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => { loadVouchers(); }, [page]);

  async function loadVouchers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50, voucherType: 'receipt' });
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
      <PageHeader 
        title="Receipts" 
        count={total} 
        actionLabel={canWrite ? "New Receipt" : null}
        onAction={() => navigate('/vouchers/new?type=receipt')} 
      />

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

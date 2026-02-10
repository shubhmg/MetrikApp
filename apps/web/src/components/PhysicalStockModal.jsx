import { useState, useEffect } from 'react';
import { Modal, Select, Table, NumberInput, Button, Group, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import api from '../services/api';

export default function PhysicalStockModal({ opened, onClose }) {
  const [mcs, setMcs] = useState([]);
  const [selectedMc, setSelectedMc] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stockData, setStockData] = useState({}); // itemId -> systemQty

  useEffect(() => {
    if (opened) {
      loadInitialData();
    } else {
      setSelectedMc(null);
      setStockData({});
    }
  }, [opened]);

  useEffect(() => {
    if (selectedMc) {
      loadStock();
    }
  }, [selectedMc]);

  async function loadInitialData() {
    try {
      const [mcsRes, itemsRes] = await Promise.all([
        api.get('/material-centres'),
        api.get('/items')
      ]);
      setMcs(mcsRes.data.data.materialCentres.map(mc => ({ value: mc._id, label: mc.name })));
      setItems(itemsRes.data.data.items.map(i => ({ ...i, physicalQty: undefined })));
    } catch (err) {
      console.error(err);
    }
  }

  async function loadStock() {
    setLoading(true);
    try {
      const res = await api.get(`/vouchers/stock-summary?materialCentreId=${selectedMc}`);
      const map = {};
      res.data.data.stock.forEach(s => {
        map[s.itemId._id] = s.quantity;
      });
      setStockData(map);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  function handleQtyChange(itemId, val) {
    setItems(prev => prev.map(i => i._id === itemId ? { ...i, physicalQty: val } : i));
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Build line items with signed quantities (positive = excess IN, negative = shortage OUT)
      const lineItems = [];

      items.forEach(item => {
        const systemQty = stockData[item._id] || 0;
        const physicalQty = item.physicalQty;

        if (physicalQty !== undefined && physicalQty !== systemQty) {
          const diff = physicalQty - systemQty;
          lineItems.push({ itemId: item._id, quantity: diff, rate: 0 });
        }
      });

      if (lineItems.length === 0) {
        notifications.show({ title: 'No changes detected', color: 'yellow' });
        setSaving(false);
        return;
      }

      const payload = {
        voucherType: 'physical_stock',
        date: new Date().toISOString(),
        materialCentreId: selectedMc,
        lineItems,
        narration: 'Physical stock verification adjustment',
      };

      await api.post('/vouchers', payload);

      notifications.show({ title: 'Stock adjusted', color: 'green' });
      onClose();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Failed', color: 'red' });
    }
    setSaving(false);
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Physical Stock Verification" size="xl">
      <Select 
        label="Material Centre" 
        data={mcs} 
        value={selectedMc} 
        onChange={setSelectedMc} 
        mb="md"
        placeholder="Select Material Centre"
      />

      {selectedMc && (
        <>
          {loading ? <Loader /> : (
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Item</Table.Th>
                    <Table.Th>System Stock</Table.Th>
                    <Table.Th>Physical Stock</Table.Th>
                    <Table.Th>Difference</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.map(item => {
                    const systemQty = stockData[item._id] || 0;
                    const physicalQty = item.physicalQty;
                    const diff = physicalQty !== undefined ? physicalQty - systemQty : 0;
                    
                    return (
                      <Table.Tr key={item._id}>
                        <Table.Td>
                          <div>{item.name}</div>
                          <div style={{ fontSize: '0.8em', color: 'gray' }}>{item.sku}</div>
                        </Table.Td>
                        <Table.Td>{systemQty} {item.unit}</Table.Td>
                        <Table.Td>
                          <NumberInput 
                            value={physicalQty} 
                            onChange={(val) => handleQtyChange(item._id, val)}
                            placeholder={systemQty.toString()}
                            min={0}
                            hideControls
                          />
                        </Table.Td>
                        <Table.Td style={{ 
                          color: diff < 0 ? 'red' : diff > 0 ? 'green' : 'inherit',
                          fontWeight: diff !== 0 ? 'bold' : 'normal'
                        }}>
                          {diff !== 0 ? (diff > 0 ? `+${diff}` : diff) : '-'}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </div>
          )}
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save</Button>
          </Group>
        </>
      )}
    </Modal>
  );
}

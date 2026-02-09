import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Title,
  Select,
  TextInput,
  NumberInput,
  Textarea,
  Button,
  Group,
  Stack,
  Table,
  ActionIcon,
  Card,
  Text,
  Alert,
  Center,
  Loader,
  SimpleGrid,
  Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconArrowLeft } from '@tabler/icons-react';
import api from '../services/api.js';

const TYPE_GROUPS = [
  {
    group: 'Sales',
    items: [
      { value: 'sales_invoice', label: 'Sales Invoice' },
      { value: 'sales_return', label: 'Sales Return' },
      { value: 'sales_order', label: 'Sales Order' },
      { value: 'delivery_note', label: 'Delivery Note' },
    ],
  },
  {
    group: 'Purchase',
    items: [
      { value: 'purchase_invoice', label: 'Purchase Invoice' },
      { value: 'purchase_return', label: 'Purchase Return' },
      { value: 'purchase_order', label: 'Purchase Order' },
      { value: 'grn', label: 'GRN' },
    ],
  },
  {
    group: 'Financial',
    items: [
      { value: 'payment', label: 'Payment' },
      { value: 'receipt', label: 'Receipt' },
      { value: 'journal', label: 'Journal' },
      { value: 'contra', label: 'Contra' },
    ],
  },
  {
    group: 'Inventory',
    items: [
      { value: 'stock_transfer', label: 'Stock Transfer' },
      { value: 'production', label: 'Production' },
      { value: 'physical_stock', label: 'Physical Stock' },
    ],
  },
];

const PARTY_TYPES = ['sales_invoice', 'purchase_invoice', 'sales_return', 'purchase_return', 'payment', 'receipt', 'sales_order', 'purchase_order', 'delivery_note', 'grn'];
const ITEM_TYPES = ['sales_invoice', 'purchase_invoice', 'sales_return', 'purchase_return', 'sales_order', 'purchase_order', 'delivery_note', 'grn', 'stock_transfer', 'production', 'physical_stock'];
const ACCOUNT_TYPES = ['payment', 'receipt', 'journal', 'contra'];
const MC_TYPES = ['sales_invoice', 'purchase_invoice', 'sales_return', 'purchase_return', 'grn', 'delivery_note', 'production', 'physical_stock'];
const TRANSFER_TYPE = 'stock_transfer';

// Voucher types that should be immediately posted
const AUTO_POST_VOUCHER_TYPES = ['sales_invoice', 'receipt'];

const EMPTY_ITEM_LINE = { itemId: '', quantity: 1, rate: 0, discount: 0, gstRate: 18 };
const EMPTY_ACCOUNT_LINE = { accountId: '', debit: 0, credit: 0, narration: '' };

export default function VoucherCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [voucherType, setVoucherType] = useState(searchParams.get('type') || null);
  const [partyId, setPartyId] = useState(null);
  const [materialCentreId, setMaterialCentreId] = useState(null);
  const [fromMaterialCentreId, setFromMaterialCentreId] = useState(null);
  const [toMaterialCentreId, setToMaterialCentreId] = useState(null);
  const [narration, setNarration] = useState('');
  const [itemLines, setItemLines] = useState([{ ...EMPTY_ITEM_LINE }]);
  const [accountLines, setAccountLines] = useState([{ ...EMPTY_ACCOUNT_LINE }]);
  const [saving, setSaving] = useState(false);

  // BOM state for production vouchers
  const [activeBom, setActiveBom] = useState(null);
  const [selectedBomId, setSelectedBomId] = useState(null);
  const [bomLoading, setBomLoading] = useState(false);

  // Reference data
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [mcs, setMcs] = useState([]);
  const [loadingRef, setLoadingRef] = useState(true);

  useEffect(() => {
    async function loadRef() {
      try {
        const [p, i, a, m] = await Promise.all([
          api.get('/parties'),
          api.get('/items'),
          api.get('/accounts'),
          api.get('/material-centres'),
        ]);
        setParties(p.data.data.parties);
        setItems(i.data.data.items);
        setAccounts(a.data.data.accounts);
        setMcs(m.data.data.materialCentres);
      } catch { /* ignore */ }
      setLoadingRef(false);
    }
    loadRef();
  }, []);

  const isItemBased = ITEM_TYPES.includes(voucherType);
  const isAccountBased = ACCOUNT_TYPES.includes(voucherType);
  const needsParty = PARTY_TYPES.includes(voucherType);
  const needsMc = MC_TYPES.includes(voucherType);
  const isTransfer = voucherType === TRANSFER_TYPE;
  const shouldAutoPost = AUTO_POST_VOUCHER_TYPES.includes(voucherType);
  
  // Simple mode for Receipt/Payment with Party selected
  const isSimpleMode = (voucherType === 'receipt' || voucherType === 'payment') && partyId;

  const isProduction = voucherType === 'production';

  const partyData = useMemo(() => parties.map((p) => ({ value: p._id, label: p.name })), [parties]);
  const itemData = useMemo(() => items.map((i) => ({ value: i._id, label: `${i.sku} - ${i.name}` })), [items]);
  const accountData = useMemo(() => accounts.map((a) => ({ value: a._id, label: `${a.code || ''} ${a.name}`.trim() })), [accounts]);
  const mcData = useMemo(() => mcs.map((m) => ({ value: m._id, label: `${m.code} - ${m.name}` })), [mcs]);

  // Fetch active BOM when output item changes for production vouchers
  async function fetchBomForItem(outputItemId) {
    if (!outputItemId) {
      setActiveBom(null);
      setSelectedBomId(null);
      return;
    }
    setBomLoading(true);
    try {
      const res = await api.get(`/boms/item/${outputItemId}/active`);
      const bom = res.data.data.bom;
      setActiveBom(bom);
      setSelectedBomId(bom?._id || null);
    } catch {
      setActiveBom(null);
      setSelectedBomId(null);
    }
    setBomLoading(false);
  }

  // Expand BOM inputs when BOM selected + output quantity set
  async function expandBomInputs(bomId, outputQuantity) {
    if (!bomId || !outputQuantity || outputQuantity <= 0) return;
    try {
      const res = await api.get(`/boms/expand?bomId=${bomId}&outputQuantity=${outputQuantity}`);
      const expandedInputs = res.data.data.inputs;
      // Keep first line (output), replace rest with expanded inputs
      setItemLines((prev) => {
        const outputLine = prev[0] || { ...EMPTY_ITEM_LINE };
        const inputLines = expandedInputs.map((inp) => ({
          itemId: inp.itemId?._id || inp.itemId,
          quantity: inp.quantity,
          rate: 0,
          discount: 0,
          gstRate: 0,
        }));
        return [outputLine, ...inputLines];
      });
    } catch { /* ignore */ }
  }

  // Item line helpers
  function updateItemLine(idx, field, value) {
    setItemLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      // Auto-fill gstRate from item
      if (field === 'itemId') {
        const item = items.find((i) => i._id === value);
        if (item) next[idx].gstRate = item.gstRate ?? 18;
      }
      return next;
    });

    // For production: when output item (idx 0) changes, fetch BOM
    if (isProduction && idx === 0 && field === 'itemId') {
      fetchBomForItem(value);
    }
    // For production: when output quantity (idx 0) changes and BOM selected, expand
    if (isProduction && idx === 0 && field === 'quantity' && selectedBomId && value > 0) {
      expandBomInputs(selectedBomId, value);
    }
  }
  function addItemLine() { setItemLines((prev) => [...prev, { ...EMPTY_ITEM_LINE }]); }
  function removeItemLine(idx) { setItemLines((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev); }

  // Account line helpers
  function updateAccountLine(idx, field, value) {
    setAccountLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }
  function addAccountLine() { setAccountLines((prev) => [...prev, { ...EMPTY_ACCOUNT_LINE }]); }
  function removeAccountLine(idx) { setAccountLines((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev); }

  // Calculations
  const itemCalcs = useMemo(() => {
    let subtotal = 0, totalDiscount = 0, totalTax = 0;
    const lines = itemLines.map((l) => {
      const lineAmount = l.quantity * l.rate;
      const disc = l.discount || 0;
      const afterDiscount = lineAmount - disc;
      const tax = afterDiscount * (l.gstRate || 0) / 100;
      subtotal += afterDiscount;
      totalDiscount += disc;
      totalTax += tax;
      return { ...l, amount: afterDiscount, taxAmount: tax, lineTotal: afterDiscount + tax };
    });
    return { lines, subtotal, totalDiscount, totalTax, grandTotal: subtotal + totalTax };
  }, [itemLines]);

  const accountCalcs = useMemo(() => {
    let totalDebit = 0, totalCredit = 0;
    accountLines.forEach((l) => { totalDebit += l.debit || 0; totalCredit += l.credit || 0; });
    return { totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  }, [accountLines]);

  async function handleSave(postImmediately = false) {
    if (!voucherType) {
      notifications.show({ title: 'Select type', message: 'Please select a voucher type', color: 'red' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        voucherType,
        date: new Date().toISOString(),
        narration,
      };

      if (needsParty && partyId) payload.partyId = partyId;
      if (needsMc && materialCentreId) payload.materialCentreId = materialCentreId;
      if (isProduction && selectedBomId) payload.bomId = selectedBomId;
      if (isTransfer) {
        payload.fromMaterialCentreId = fromMaterialCentreId;
        payload.toMaterialCentreId = toMaterialCentreId;
      }

      if (isItemBased) {
        payload.lineItems = itemLines
          .filter((l) => l.itemId)
          .map((l) => ({
            itemId: l.itemId,
            quantity: l.quantity,
            rate: l.rate,
            discount: l.discount || 0,
            gstRate: l.gstRate || 0,
          }));
      } else if (isAccountBased) {
        payload.lineItems = accountLines
          .filter((l) => l.accountId)
          .map((l) => ({
            accountId: l.accountId,
            debit: l.debit || 0,
            credit: l.credit || 0,
            narration: l.narration || '',
          }));
      }

      const createRes = await api.post('/vouchers', payload);
      const newVoucherId = createRes.data.data.voucher._id;

      if (postImmediately) {
        await api.post(`/vouchers/${newVoucherId}/post`);
        notifications.show({ title: 'Voucher created and posted', color: 'green' });
      } else {
        notifications.show({ title: 'Voucher created', message: 'Saved as draft', color: 'green' });
      }
      
      navigate(-1); // Go back to previous page
    } catch (err) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Failed to create', color: 'red' });
    }
    setSaving(false);
  }

  if (loadingRef) return <Center py="xl"><Loader /></Center>;

  return (
    <div>
      <Group mb="lg">
        <ActionIcon variant="subtle" onClick={() => navigate(-1)}><IconArrowLeft size={20} /></ActionIcon>
        <Title order={2}>New Voucher</Title>
      </Group>

      <Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select
            label="Voucher Type"
            placeholder="Select type..."
            data={TYPE_GROUPS}
            value={voucherType}
            onChange={setVoucherType}
            searchable
            required
          />

          {needsParty && (
            <Select
              label="Party"
              placeholder="Select party..."
              data={partyData}
              value={partyId}
              onChange={setPartyId}
              searchable
              clearable
            />
          )}

          {needsMc && !isTransfer && (
            <Select
              label="Material Centre"
              placeholder="Select MC..."
              data={mcData}
              value={materialCentreId}
              onChange={setMaterialCentreId}
              searchable
              clearable
            />
          )}

          {isTransfer && (
            <>
              <Select
                label="From Material Centre"
                placeholder="Source MC..."
                data={mcData}
                value={fromMaterialCentreId}
                onChange={setFromMaterialCentreId}
                searchable
              />
              <Select
                label="To Material Centre"
                placeholder="Destination MC..."
                data={mcData}
                value={toMaterialCentreId}
                onChange={setToMaterialCentreId}
                searchable
              />
            </>
          )}
        </SimpleGrid>

        {/* BOM indicator for production vouchers */}
        {isProduction && activeBom && (
          <Alert variant="light" color="blue" title={`BOM: ${activeBom.name} (v${activeBom.version})`}>
            Active BOM found. Set output quantity to auto-expand input items.
          </Alert>
        )}
        {isProduction && bomLoading && (
          <Alert variant="light" color="gray">Checking for active BOM...</Alert>
        )}

        {/* Item-based line items */}
        {isItemBased && voucherType && (
          <Card withBorder>
            <Group justify="space-between" mb="sm">
              <Text fw={600}>Line Items</Text>
              <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={addItemLine}>Add Row</Button>
            </Group>
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ minWidth: 200 }}>Item</Table.Th>
                  <Table.Th style={{ width: 80 }}>Qty</Table.Th>
                  <Table.Th style={{ width: 100 }}>Rate</Table.Th>
                  <Table.Th style={{ width: 80 }}>Disc</Table.Th>
                  <Table.Th style={{ width: 70 }}>GST%</Table.Th>
                  <Table.Th style={{ width: 100, textAlign: 'right' }}>Amount</Table.Th>
                  <Table.Th style={{ width: 40 }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {itemLines.map((line, idx) => {
                  const calc = itemCalcs.lines[idx] || {};
                  return (
                    <Table.Tr key={idx}>
                      <Table.Td>
                        <Select
                          data={itemData}
                          value={line.itemId || null}
                          onChange={(v) => updateItemLine(idx, 'itemId', v)}
                          searchable
                          size="xs"
                          placeholder="Select item..."
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput size="xs" min={0} value={line.quantity} onChange={(v) => updateItemLine(idx, 'quantity', v || 0)} />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput size="xs" min={0} value={line.rate} onChange={(v) => updateItemLine(idx, 'rate', v || 0)} />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput size="xs" min={0} value={line.discount} onChange={(v) => updateItemLine(idx, 'discount', v || 0)} />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput size="xs" min={0} max={100} value={line.gstRate} onChange={(v) => updateItemLine(idx, 'gstRate', v || 0)} />
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={500}>{(calc.lineTotal || 0).toLocaleString('en-IN')}</Text>
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeItemLine(idx)}>
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>

            <SimpleGrid cols={2} mt="sm">
              <div />
              <Stack gap={4}>
                <Group justify="space-between"><Text size="sm">Subtotal:</Text><Text size="sm">{itemCalcs.subtotal.toLocaleString('en-IN')}</Text></Group>
                <Group justify="space-between"><Text size="sm">Discount:</Text><Text size="sm">{itemCalcs.totalDiscount.toLocaleString('en-IN')}</Text></Group>
                <Group justify="space-between"><Text size="sm">Tax:</Text><Text size="sm">{itemCalcs.totalTax.toLocaleString('en-IN')}</Text></Group>
                <Group justify="space-between"><Text fw={700}>Grand Total:</Text><Text fw={700}>{itemCalcs.grandTotal.toLocaleString('en-IN')}</Text></Group>
              </Stack>
            </SimpleGrid>
          </Card>
        )}

        {/* Account-based line items */}
        {isAccountBased && voucherType && (
          <Card withBorder>
            <Group justify="space-between" mb="sm">
              <Text fw={600}>{isSimpleMode ? 'Payment Details' : 'Journal Entries'}</Text>
              <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={addAccountLine}>Add Row</Button>
            </Group>
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ minWidth: 200 }}>Account</Table.Th>
                  {isSimpleMode ? (
                    <Table.Th style={{ width: 150 }}>Amount</Table.Th>
                  ) : (
                    <>
                      <Table.Th style={{ width: 120 }}>Debit</Table.Th>
                      <Table.Th style={{ width: 120 }}>Credit</Table.Th>
                    </>
                  )}
                  <Table.Th style={{ minWidth: 150 }}>Narration</Table.Th>
                  <Table.Th style={{ width: 40 }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {accountLines.map((line, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td>
                      <Select
                        data={accountData}
                        value={line.accountId || null}
                        onChange={(v) => updateAccountLine(idx, 'accountId', v)}
                        searchable
                        size="xs"
                        placeholder={isSimpleMode ? (voucherType === 'receipt' ? "Select Cash/Bank Account" : "Select Payment Source") : "Select account..."}
                      />
                    </Table.Td>
                    {isSimpleMode ? (
                      <Table.Td>
                        <NumberInput 
                          size="xs" 
                          min={0} 
                          value={voucherType === 'receipt' ? line.debit : line.credit} 
                          onChange={(v) => {
                            if (voucherType === 'receipt') {
                              updateAccountLine(idx, 'debit', v || 0);
                              updateAccountLine(idx, 'credit', 0);
                            } else {
                              updateAccountLine(idx, 'credit', v || 0);
                              updateAccountLine(idx, 'debit', 0);
                            }
                          }} 
                        />
                      </Table.Td>
                    ) : (
                      <>
                        <Table.Td>
                          <NumberInput size="xs" min={0} value={line.debit} onChange={(v) => updateAccountLine(idx, 'debit', v || 0)} />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput size="xs" min={0} value={line.credit} onChange={(v) => updateAccountLine(idx, 'credit', v || 0)} />
                        </Table.Td>
                      </>
                    )}
                    <Table.Td>
                      <TextInput size="xs" value={line.narration} onChange={(e) => updateAccountLine(idx, 'narration', e.target.value)} />
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeAccountLine(idx)}>
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            <Group justify="flex-end" mt="sm" gap="lg">
              {isSimpleMode ? (
                <Text size="sm">Total Amount: <strong>{(voucherType === 'receipt' ? accountCalcs.totalDebit : accountCalcs.totalCredit).toLocaleString('en-IN')}</strong></Text>
              ) : (
                <>
                  <Text size="sm">Total Debit: <strong>{accountCalcs.totalDebit.toLocaleString('en-IN')}</strong></Text>
                  <Text size="sm">Total Credit: <strong>{accountCalcs.totalCredit.toLocaleString('en-IN')}</strong></Text>
                  <Badge color={accountCalcs.balanced ? 'green' : 'red'} variant="light">
                    {accountCalcs.balanced ? 'Balanced' : 'Not Balanced'}
                  </Badge>
                </>
              )}
            </Group>
          </Card>
        )}

        <Textarea label="Narration" value={narration} onChange={(e) => setNarration(e.target.value)} minRows={2} />

        <Group justify="flex-end">
          <Button variant="default" onClick={() => navigate(-1)}>Cancel</Button>
          {shouldAutoPost ? (
            <Button onClick={() => handleSave(true)} loading={saving} disabled={!voucherType}>
              Save & Post
            </Button>
          ) : (
            <Button onClick={() => handleSave(false)} loading={saving} disabled={!voucherType}>
              Save as Draft
            </Button>
          )}
        </Group>
      </Stack>
    </div>
  );
}

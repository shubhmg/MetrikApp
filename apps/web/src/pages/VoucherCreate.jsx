import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
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
  Chip,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { DateInput } from '@mantine/dates';
import { IconPlus, IconTrash, IconArrowLeft } from '@tabler/icons-react';
import api from '../services/api.js';
import { usePermission } from '../hooks/usePermission.js';
import { useAuthStore } from '../store/authStore.js';

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
const MC_TYPES = ['sales_invoice', 'purchase_invoice', 'sales_return', 'purchase_return', 'grn', 'delivery_note', 'production', 'physical_stock', 'sales_order', 'purchase_order'];
const TRANSFER_TYPE = 'stock_transfer';

const EMPTY_ITEM_LINE = { itemId: '', quantity: 1, rate: 0, discount: 0, gstRate: 18 };
const EMPTY_ACCOUNT_LINE = { accountId: '', debit: 0, credit: 0, narration: '' };
const DOZEN_UNITS = new Set(['dozen', 'dozens', 'doz', 'dzn', 'dz']);

function isDozenUnit(unit) {
  return DOZEN_UNITS.has(String(unit || '').trim().toLowerCase());
}

export default function VoucherCreate() {
  const navigate = useNavigate();
  const { can, role } = usePermission();
  const user = useAuthStore((s) => s.user);
  const [searchParams] = useSearchParams();
  const { id: editId } = useParams();
  const isEditMode = !!editId;
  const [voucherType, setVoucherType] = useState(searchParams.get('type') || null);
  const [voucherDate, setVoucherDate] = useState(new Date());
  const [partyId, setPartyId] = useState(null);
  const [materialCentreId, setMaterialCentreId] = useState(null);
  const [outputMaterialCentreId, setOutputMaterialCentreId] = useState(null);
  const [productionMode, setProductionMode] = useState('manual');
  const [contractorPartyId, setContractorPartyId] = useState(null);
  const [fromMaterialCentreId, setFromMaterialCentreId] = useState(null);
  const [toMaterialCentreId, setToMaterialCentreId] = useState(null);
  const [narration, setNarration] = useState('');
  const [itemLines, setItemLines] = useState([{ ...EMPTY_ITEM_LINE }]);
  const [accountLines, setAccountLines] = useState([{ ...EMPTY_ACCOUNT_LINE }]);
  const [saving, setSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [quickInputs, setQuickInputs] = useState({});
  const isMobile = useMediaQuery('(max-width: 48em)');

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
        const [p, i, a, m] = await Promise.allSettled([
          api.get('/parties'),
          api.get('/items'),
          api.get('/accounts'),
          api.get('/material-centres/lookup'),
        ]);
        if (p.status === 'fulfilled') setParties(p.value.data.data.parties || []);
        if (i.status === 'fulfilled') setItems(i.value.data.data.items || []);
        if (a.status === 'fulfilled') setAccounts(a.value.data.data.accounts || []);
        if (m.status === 'fulfilled') setMcs(m.value.data.data.materialCentres || []);
      } catch { /* ignore */ }
      setLoadingRef(false);
    }
    loadRef();
  }, []);

  // Load voucher data when editing
  useEffect(() => {
    if (!editId || loadingRef) return;
    setEditLoading(true);
    api.get(`/vouchers/${editId}`)
      .then(({ data }) => {
        const v = data.data.voucher;
        setVoucherType(v.voucherType);
        setVoucherDate(new Date(v.date));
        setPartyId(v.partyId?._id || v.partyId || null);
        setMaterialCentreId(v.materialCentreId?._id || v.materialCentreId || null);
        setOutputMaterialCentreId(v.outputMaterialCentreId?._id || v.outputMaterialCentreId || null);
        setProductionMode(v.productionMode || 'manual');
        setContractorPartyId(v.contractorPartyId?._id || v.contractorPartyId || null);
        setFromMaterialCentreId(v.fromMaterialCentreId || null);
        setToMaterialCentreId(v.toMaterialCentreId || null);
        setNarration(v.narration || '');
        setSelectedBomId(v.bomId?._id || v.bomId || null);

        const isItemType = ITEM_TYPES.includes(v.voucherType);
        const isAcctType = ACCOUNT_TYPES.includes(v.voucherType);

        if (isItemType && v.lineItems?.length) {
          setItemLines(v.lineItems.map((li) => ({
            itemId: li.itemId?._id || li.itemId || '',
            quantity: li.quantity || 1,
            rate: li.rate || 0,
            discount: li.discount || 0,
            gstRate: li.gstRate || 18,
          })));
        }
        if (isAcctType && v.lineItems?.length) {
          setAccountLines(v.lineItems.map((li) => ({
            accountId: li.accountId?._id || li.accountId || '',
            debit: li.debit || 0,
            credit: li.credit || 0,
            narration: li.narration || '',
          })));
        }
      })
      .catch(() => {
        notifications.show({ title: 'Error', message: 'Failed to load voucher for editing', color: 'red' });
      })
      .finally(() => setEditLoading(false));
  }, [editId, loadingRef]);

  // Filter voucher type dropdown to only types user can write
  const filteredTypeGroups = useMemo(() =>
    TYPE_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((item) => can(item.value, 'write')),
    })).filter((g) => g.items.length > 0),
    [can]
  );

  const fixedType = searchParams.get('type');
  const showVoucherType = !fixedType || isEditMode;
  const isItemBased = ITEM_TYPES.includes(voucherType);
  const isAccountBased = ACCOUNT_TYPES.includes(voucherType);
  const needsParty = PARTY_TYPES.includes(voucherType);
  const needsMc = MC_TYPES.includes(voucherType);
  const isTransfer = voucherType === TRANSFER_TYPE;
  const isSalesQuick = voucherType === 'sales_invoice' || voucherType === 'sales_order';

  // Simple mode for Receipt/Payment with Party selected
  const isSimpleMode = (voucherType === 'receipt' || voucherType === 'payment') && partyId;

  const isProduction = voucherType === 'production';
  const isContractorProduction = isProduction && productionMode === 'contractor';

  const partyData = useMemo(() => parties.map((p) => ({ value: p._id, label: p.name })), [parties]);
  const itemData = useMemo(() => items.map((i) => ({ value: i._id, label: `${i.sku} - ${i.name}` })), [items]);
  const accountData = useMemo(() => accounts.map((a) => ({ value: a._id, label: `${a.code || ''} ${a.name}`.trim() })), [accounts]);
  const mcData = useMemo(() => mcs.map((m) => ({ value: m._id, label: `${m.code} - ${m.name}` })), [mcs]);
  const quickMcOptions = useMemo(
    () => mcs.filter((m) => m.type === 'factory' || m.type === 'godown'),
    [mcs]
  );
  const finishedGoods = useMemo(() => {
    const list = items.filter((i) => {
      const groupType = i.itemGroupId?.type || i.itemGroupType || i.type;
      return groupType === 'finished_good';
    });
    return list.length ? list : items;
  }, [items]);
  const contractors = useMemo(
    () => parties.filter((p) => {
      if (!(p.type?.includes('contractor') && p.contractorSettings?.isEnabled)) return false;
      if (role !== 'contractor') return true;
      const linkedUserId = p.contractorSettings?.linkedUserId?._id || p.contractorSettings?.linkedUserId;
      return String(linkedUserId) === String(user?._id);
    }),
    [parties, role, user]
  );
  const contractorData = useMemo(
    () => contractors.map((p) => ({ value: p._id, label: p.name })),
    [contractors]
  );
  const selectedContractor = useMemo(
    () => contractors.find((p) => p._id === contractorPartyId) || null,
    [contractors, contractorPartyId]
  );
  const contractorItemOptions = useMemo(() => {
    const map = new Map(items.map((i) => [i._id, i]));
    return (selectedContractor?.contractorSettings?.itemRates || [])
      .map((r) => {
        const item = map.get(r.itemId);
        if (!item) return null;
        return { value: item._id, label: `${item.sku} - ${item.name}` };
      })
      .filter(Boolean);
  }, [selectedContractor, items]);
  const contractorAmount = useMemo(() => {
    if (!isContractorProduction || !selectedContractor) return 0;
    const output = itemLines[0] || {};
    if (!output.itemId || !output.quantity) return 0;
    const cfg = (selectedContractor.contractorSettings?.itemRates || []).find((r) => String(r.itemId) === String(output.itemId));
    if (!cfg) return 0;
    const outputItem = items.find((i) => String(i._id) === String(output.itemId));
    const qty = Number(output.quantity || 0);
    const rate = Number(cfg.rate || 0);
    const amount = cfg.rateUom === 'per_dozen'
      ? (isDozenUnit(outputItem?.unit) ? qty * rate : (qty / 12) * rate)
      : qty * rate;
    return Number(amount.toFixed(2));
  }, [isContractorProduction, selectedContractor, itemLines, items]);

  useEffect(() => {
    if (role === 'contractor' && !isEditMode && voucherType !== 'production') {
      setVoucherType('production');
    }
  }, [role, isEditMode, voucherType]);

  useEffect(() => {
    if (role === 'contractor' && isProduction && productionMode !== 'contractor') {
      setProductionMode('contractor');
    }
  }, [role, isProduction, productionMode]);

  useEffect(() => {
    if (role !== 'contractor' || !isProduction || contractors.length === 0) return;
    const ownContractor = contractors[0];
    const consumeMc = ownContractor.contractorSettings?.consumeMaterialCentreId?._id || ownContractor.contractorSettings?.consumeMaterialCentreId || null;
    const outputMc = ownContractor.contractorSettings?.outputMaterialCentreId?._id || ownContractor.contractorSettings?.outputMaterialCentreId || null;

    if (contractorPartyId !== ownContractor._id) {
      setContractorPartyId(ownContractor._id);
    }
    if (materialCentreId !== consumeMc) {
      setMaterialCentreId(consumeMc);
    }
    if (outputMaterialCentreId !== outputMc) {
      setOutputMaterialCentreId(outputMc);
    }
  }, [role, isProduction, contractors, contractorPartyId, materialCentreId, outputMaterialCentreId]);

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
      // Auto-fill gstRate and rate from item
      if (field === 'itemId') {
        const item = items.find((i) => i._id === value);
        if (item) {
          next[idx].gstRate = item.gstRate ?? 18;
          if (item.salesPrice > 0) next[idx].rate = item.salesPrice;
        }
      }
      return next;
    });

    // For production: when output item (idx 0) changes, fetch BOM
    if (isProduction && idx === 0 && field === 'itemId') {
      fetchBomForItem(value);
      if (isContractorProduction && selectedContractor) {
        const cfg = (selectedContractor.contractorSettings?.itemRates || []).find((r) => String(r.itemId) === String(value));
        if (!cfg) {
          notifications.show({ title: 'Not assigned', message: 'This item is not assigned to selected contractor.', color: 'red' });
        }
      }
    }
    // For production: when output quantity (idx 0) changes and BOM selected, expand
    if (isProduction && idx === 0 && field === 'quantity' && selectedBomId && value > 0) {
      expandBomInputs(selectedBomId, value);
    }
  }
  function addItemLine() { setItemLines((prev) => [...prev, { ...EMPTY_ITEM_LINE }]); }
  function removeItemLine(idx) {
    if (isProduction && idx === 0) return; // Can't delete the output line
    setItemLines((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  }

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

  function updateQuickInput(itemId, field, value) {
    setQuickInputs((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [field]: value,
      },
    }));
  }

  function addFromQuick(item) {
    const entry = quickInputs[item._id] || {};
    const quantity = Number(entry.quantity || 0);
    const rate = Number(entry.rate || item.salesPrice || 0);
    if (!quantity) {
      notifications.show({ title: 'Enter quantity', message: 'Please enter a quantity before adding.', color: 'yellow' });
      return;
    }
    setItemLines((prev) => {
      const idx = prev.findIndex((l) => l.itemId === item._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity,
          rate,
        };
        return next;
      }
      return [
        ...prev,
        { ...EMPTY_ITEM_LINE, itemId: item._id, quantity, rate },
      ];
    });
    setQuickInputs((prev) => ({ ...prev, [item._id]: { quantity: '', rate: '' } }));
  }

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

  async function handleSave() {
    if (role === 'contractor' && voucherType !== 'production') {
      notifications.show({ title: 'Not allowed', message: 'Contractor users can only create production vouchers', color: 'red' });
      return;
    }
    if (voucherType && !can(voucherType, 'write')) {
      notifications.show({ title: 'Not allowed', message: 'You do not have permission to create this voucher type', color: 'red' });
      return;
    }
    if (!voucherType) {
      notifications.show({ title: 'Select type', message: 'Please select a voucher type', color: 'red' });
      return;
    }
    if (role === 'contractor' && !contractorPartyId) {
      notifications.show({ title: 'Contractor not linked', message: 'No contractor profile is linked to this user.', color: 'red' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date: voucherDate.toISOString(),
        narration,
      };

      // Only include voucherType on create
      if (!isEditMode) payload.voucherType = voucherType;

      if (needsParty && partyId) payload.partyId = partyId;
      if (needsMc && materialCentreId) payload.materialCentreId = materialCentreId;
      if (isProduction && selectedBomId) payload.bomId = selectedBomId;
      if (isProduction) {
        payload.productionMode = role === 'contractor' ? 'contractor' : productionMode;
        payload.outputMaterialCentreId = outputMaterialCentreId || materialCentreId;
        if ((role === 'contractor') || isContractorProduction) {
          payload.contractorPartyId = contractorPartyId;
          payload.contractorAmount = contractorAmount;
        }
      }
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

      if (isEditMode) {
        await api.put(`/vouchers/${editId}`, payload);
        notifications.show({ title: 'Voucher updated', color: 'green' });
      } else {
        await api.post('/vouchers', payload);
        notifications.show({ title: 'Voucher saved', color: 'green' });
      }
      navigate(-1);
    } catch (err) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || (isEditMode ? 'Failed to update' : 'Failed to create'), color: 'red' });
    }
    setSaving(false);
  }

  if (loadingRef || editLoading) return <Center py="xl"><Loader /></Center>;

  if (voucherType && !can(voucherType, 'write')) {
    return (
      <Alert color="red" variant="light">
        You do not have permission to access this voucher type.
      </Alert>
    );
  }

  return (
    <div>
      <Group mb="lg">
        <ActionIcon variant="subtle" onClick={() => navigate(-1)}><IconArrowLeft size={20} /></ActionIcon>
        <Title order={isMobile ? 3 : 2}>
          {isEditMode ? (isProduction ? 'Edit Production' : 'Edit Voucher') : (isProduction ? 'New Production' : 'New Voucher')}
        </Title>
      </Group>

      <Stack gap={isMobile ? 'md' : 'lg'}>
        <Card withBorder>
          <Stack gap="sm">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={{ base: 'sm', sm: 'md' }}>
          {showVoucherType && (
            <Select
              label="Voucher Type"
              placeholder="Select type..."
              data={filteredTypeGroups}
              value={voucherType}
              onChange={setVoucherType}
              searchable
              required
              disabled={isEditMode}
            />
          )}

          <DateInput
            label="Date"
            value={voucherDate}
            onChange={setVoucherDate}
            required
            valueFormat="DD MMM YYYY"
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

          {needsMc && !isTransfer && !(isProduction && productionMode === 'contractor') && (
            quickMcOptions.length > 0 ? (
              <Stack gap={6} style={{ marginTop: 4 }}>
                <Text size="sm" fw={600} mb={4}>Material Centre</Text>
                <Chip.Group value={materialCentreId} onChange={setMaterialCentreId} multiple={false}>
                  <Group gap="xs">
                    {quickMcOptions.map((mc) => (
                      <Chip key={mc._id} value={mc._id} variant="light" radius="xl">
                        {mc.name}
                      </Chip>
                    ))}
                  </Group>
                </Chip.Group>
              </Stack>
            ) : (
              <Select
                label="Material Centre"
                placeholder="Select MC..."
                data={mcData}
                value={materialCentreId}
                onChange={setMaterialCentreId}
                searchable
                clearable
              />
            )
          )}

          {isProduction && (
            <>
              <Select
                label="Production Mode"
                data={[
                  { value: 'manual', label: 'Manual Production' },
                  { value: 'contractor', label: 'Contractor Production' },
                ]}
                value={productionMode}
                onChange={(v) => setProductionMode(v || 'manual')}
                disabled={role === 'contractor'}
              />
              {productionMode === 'contractor' && (
                <Select
                  label="Contractor"
                  placeholder="Select contractor..."
                  data={contractorData}
                  value={contractorPartyId}
                  onChange={(v) => {
                    setContractorPartyId(v);
                    const contractor = contractors.find((p) => p._id === v);
                    setMaterialCentreId(contractor?.contractorSettings?.consumeMaterialCentreId || null);
                    setOutputMaterialCentreId(contractor?.contractorSettings?.outputMaterialCentreId || null);
                    setItemLines([{ ...EMPTY_ITEM_LINE }]);
                  }}
                  searchable
                  disabled={role === 'contractor'}
                />
              )}
              {productionMode === 'contractor' && (
                <Select
                  label="Output Material Centre"
                  data={mcData}
                  value={outputMaterialCentreId}
                  onChange={setOutputMaterialCentreId}
                  searchable
                />
              )}
            </>
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
          </Stack>
        </Card>

        {/* BOM indicator for production vouchers */}
        {isProduction && activeBom && (
          <Alert variant="light" color="teal" title={`BOM: ${activeBom.name} (v${activeBom.version})`}>
            Active BOM found. Set output quantity to auto-expand input items.
          </Alert>
        )}
        {isProduction && bomLoading && (
          <Alert variant="light" color="gray">Checking for active BOM...</Alert>
        )}

        {/* Production-specific form */}
        {isProduction && voucherType && (() => {
          const inputLines = itemLines.slice(1);
          const totalInputCost = inputLines.reduce((sum, l) => sum + (l.quantity * l.rate), 0);
          const outputQty = itemLines[0]?.quantity || 0;
          const outputCostPerUnit = outputQty > 0 ? totalInputCost / outputQty : 0;
          return (
            <Stack>
              {/* Output Section */}
              <Card withBorder style={{ borderColor: 'var(--mantine-color-green-5)', borderWidth: 2 }}>
                <Text fw={600} c="green" mb="sm">Output (Produced Item)</Text>
                <SimpleGrid cols={{ base: 1, sm: 3 }}>
                  <Select
                    label="Item"
                    data={isContractorProduction ? contractorItemOptions : itemData}
                    value={itemLines[0]?.itemId || null}
                    onChange={(v) => updateItemLine(0, 'itemId', v)}
                    searchable
                    placeholder="Select output item..."
                  />
                  <NumberInput
                    label="Quantity"
                    min={1}
                    value={itemLines[0]?.quantity || 1}
                    onChange={(v) => updateItemLine(0, 'quantity', v || 0)}
                  />
                  <TextInput
                    label="Rate (auto-calculated)"
                    value={outputCostPerUnit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    readOnly
                    variant="filled"
                  />
                </SimpleGrid>
              </Card>

              {/* Inputs Section */}
              <Card withBorder style={{ borderColor: 'var(--mantine-color-orange-5)', borderWidth: 2 }}>
                <Group justify="space-between" mb="sm">
                  <Text fw={600} c="orange">Inputs (Raw Materials Consumed)</Text>
                  <Button size="xs" variant="light" color="orange" leftSection={<IconPlus size={14} />} onClick={addItemLine}>Add Input</Button>
                </Group>
                {inputLines.length === 0 ? (
                  <Text size="sm" c="dimmed" ta="center" py="sm">No input items. Add rows or select an output item with an active BOM.</Text>
                ) : isMobile ? (
                  <Stack gap="xs">
                    {inputLines.map((line, i) => {
                      const realIdx = i + 1;
                      const lineAmount = line.quantity * line.rate;
                      return (
                        <Card key={realIdx} withBorder padding="xs">
                          <Group justify="space-between" wrap="nowrap" mb={4}>
                            <Select
                              data={itemData}
                              value={line.itemId || null}
                              onChange={(v) => updateItemLine(realIdx, 'itemId', v)}
                              searchable
                              size="xs"
                              placeholder="Select item..."
                              style={{ flex: 1 }}
                            />
                            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeItemLine(realIdx)}>
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Group>
                          <Group grow>
                            <NumberInput label="Qty" size="xs" min={0} value={line.quantity} onChange={(v) => updateItemLine(realIdx, 'quantity', v || 0)} />
                            <NumberInput label="Rate" size="xs" min={0} value={line.rate} onChange={(v) => updateItemLine(realIdx, 'rate', v || 0)} />
                          </Group>
                          <Text size="xs" ta="right" fw={500} mt={4}>{lineAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                        </Card>
                      );
                    })}
                  </Stack>
                ) : (
                  <Table withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th style={{ minWidth: 200 }}>Item</Table.Th>
                        <Table.Th style={{ width: 100 }}>Qty</Table.Th>
                        <Table.Th style={{ width: 120 }}>Rate</Table.Th>
                        <Table.Th style={{ width: 120, textAlign: 'right' }}>Amount</Table.Th>
                        <Table.Th style={{ width: 40 }}></Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {inputLines.map((line, i) => {
                        const realIdx = i + 1;
                        const lineAmount = line.quantity * line.rate;
                        return (
                          <Table.Tr key={realIdx}>
                            <Table.Td>
                              <Select
                                data={itemData}
                                value={line.itemId || null}
                                onChange={(v) => updateItemLine(realIdx, 'itemId', v)}
                                searchable
                                size="xs"
                                placeholder="Select item..."
                              />
                            </Table.Td>
                            <Table.Td>
                              <NumberInput size="xs" min={0} value={line.quantity} onChange={(v) => updateItemLine(realIdx, 'quantity', v || 0)} />
                            </Table.Td>
                            <Table.Td>
                              <NumberInput size="xs" min={0} value={line.rate} onChange={(v) => updateItemLine(realIdx, 'rate', v || 0)} />
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right' }}>
                              <Text size="sm" fw={500}>{lineAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                            </Table.Td>
                            <Table.Td>
                              <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeItemLine(realIdx)}>
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                )}

                {/* Cost Summary */}
                <Stack gap={4} mt="sm">
                  <Group justify="space-between">
                    <Text size="sm">Total Input Cost:</Text>
                    <Text size="sm" fw={600}>{totalInputCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Output Cost / Unit:</Text>
                    <Text size="sm" fw={700} c="green">{outputCostPerUnit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                  </Group>
                  {isContractorProduction && (
                    <Group justify="space-between">
                      <Text size="sm">Contractor Charges:</Text>
                      <Text size="sm" fw={700} c="teal">{contractorAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                    </Group>
                  )}
                </Stack>
              </Card>
            </Stack>
          );
        })()}

        {/* Item-based line items (non-production) */}
        {isItemBased && !isProduction && voucherType && (
          isSalesQuick ? (
            <Stack gap="md">
              <Card withBorder>
                <Group justify="space-between" mb="sm">
                  <Text fw={600}>Finished Goods</Text>
                  <Text size="xs" c="dimmed">Tap + to add</Text>
                </Group>
                <Stack gap="xs">
                  {finishedGoods.map((item) => {
                    const entry = quickInputs[item._id] || {};
                    return (
                      <Card key={item._id} withBorder padding="sm">
                        <Group gap="xs" wrap="nowrap" align="center">
                          <Text fw={600} lineClamp={1} style={{ minWidth: 0, flex: 1 }}>
                            {item.name}
                          </Text>
                          <NumberInput
                            size="sm"
                            min={0}
                            placeholder="Qty"
                            value={entry.quantity ?? ''}
                            onChange={(v) => updateQuickInput(item._id, 'quantity', v || '')}
                            w={isMobile ? 70 : 90}
                            hideControls
                            radius="sm"
                          />
                          <NumberInput
                            size="sm"
                            min={0}
                            placeholder="Rate"
                            value={entry.rate ?? (item.salesPrice || '')}
                            onChange={(v) => updateQuickInput(item._id, 'rate', v || '')}
                            w={isMobile ? 90 : 120}
                            hideControls
                            radius="sm"
                          />
                          <ActionIcon variant="light" color="teal" size="md" onClick={() => addFromQuick(item)}>
                            <IconPlus size={16} />
                          </ActionIcon>
                        </Group>
                      </Card>
                    );
                  })}
                </Stack>
              </Card>

              {itemLines.filter((l) => l.itemId).length > 0 && (
                <Card withBorder>
                  <Text fw={600} mb="sm">Selected Items</Text>
                  <Stack gap="xs">
                    {itemLines.map((line, idx) => {
                      if (!line.itemId) return null;
                      const item = items.find((i) => i._id === line.itemId);
                      return (
                        <Card key={`${line.itemId}-${idx}`} withBorder padding="xs">
                          <Group justify="space-between" wrap="nowrap">
                            <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
                              <Text size="sm" fw={600} lineClamp={1}>{item?.name || 'Item'}</Text>
                              <Text size="xs" c="dimmed">
                                {line.quantity} {item?.unit || ''} × {line.rate}
                              </Text>
                            </Stack>
                            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeItemLine(idx)}>
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Group>
                        </Card>
                      );
                    })}
                  </Stack>
                </Card>
              )}

              <Card withBorder>
                <SimpleGrid cols={2}>
                  <div />
                  <Stack gap={4}>
                    <Group justify="space-between"><Text size="sm">Subtotal:</Text><Text size="sm">{itemCalcs.subtotal.toLocaleString('en-IN')}</Text></Group>
                    <Group justify="space-between"><Text size="sm">Discount:</Text><Text size="sm">{itemCalcs.totalDiscount.toLocaleString('en-IN')}</Text></Group>
                    <Group justify="space-between"><Text size="sm">Tax:</Text><Text size="sm">{itemCalcs.totalTax.toLocaleString('en-IN')}</Text></Group>
                    <Group justify="space-between"><Text fw={700}>Grand Total:</Text><Text fw={700}>{itemCalcs.grandTotal.toLocaleString('en-IN')}</Text></Group>
                  </Stack>
                </SimpleGrid>
              </Card>
            </Stack>
          ) : (
            <Card withBorder>
              <Group justify="space-between" mb="sm">
                <Text fw={600}>Line Items</Text>
                <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={addItemLine}>Add Row</Button>
              </Group>
              {isMobile ? (
                <Stack gap="xs">
                  {itemLines.map((line, idx) => {
                    const calc = itemCalcs.lines[idx] || {};
                    return (
                      <Card key={idx} withBorder padding="xs">
                        <Group justify="space-between" wrap="nowrap" mb={4}>
                          <Select
                            data={itemData}
                            value={line.itemId || null}
                            onChange={(v) => updateItemLine(idx, 'itemId', v)}
                            searchable
                            size="xs"
                            placeholder="Select item..."
                            style={{ flex: 1 }}
                          />
                          <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeItemLine(idx)}>
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Group>
                        <SimpleGrid cols={2} spacing="xs">
                          <NumberInput label="Qty" size="xs" min={0} value={line.quantity} onChange={(v) => updateItemLine(idx, 'quantity', v || 0)} />
                          <NumberInput label="Rate" size="xs" min={0} value={line.rate} onChange={(v) => updateItemLine(idx, 'rate', v || 0)} />
                          <NumberInput label="Disc" size="xs" min={0} value={line.discount} onChange={(v) => updateItemLine(idx, 'discount', v || 0)} />
                          <NumberInput label="GST%" size="xs" min={0} max={100} value={line.gstRate} onChange={(v) => updateItemLine(idx, 'gstRate', v || 0)} />
                        </SimpleGrid>
                        <Text size="xs" ta="right" fw={500} mt={4}>{(calc.lineTotal || 0).toLocaleString('en-IN')}</Text>
                      </Card>
                    );
                  })}
                </Stack>
              ) : (
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
              )}

              <Stack gap={4} mt="sm">
                <Group justify="space-between"><Text size="sm">Subtotal:</Text><Text size="sm">{itemCalcs.subtotal.toLocaleString('en-IN')}</Text></Group>
                <Group justify="space-between"><Text size="sm">Discount:</Text><Text size="sm">{itemCalcs.totalDiscount.toLocaleString('en-IN')}</Text></Group>
                <Group justify="space-between"><Text size="sm">Tax:</Text><Text size="sm">{itemCalcs.totalTax.toLocaleString('en-IN')}</Text></Group>
                <Group justify="space-between"><Text fw={700}>Grand Total:</Text><Text fw={700}>{itemCalcs.grandTotal.toLocaleString('en-IN')}</Text></Group>
              </Stack>
            </Card>
          )
        )}

        {/* Account-based line items */}
        {isAccountBased && voucherType && (
          <Card withBorder>
            <Group justify="space-between" mb="sm">
              <Text fw={600}>{isSimpleMode ? 'Payment Details' : 'Journal Entries'}</Text>
              <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={addAccountLine}>Add Row</Button>
            </Group>
            {isMobile ? (
              <Stack gap="xs">
                {accountLines.map((line, idx) => (
                  <Card key={idx} withBorder padding="xs">
                    <Group justify="space-between" wrap="nowrap" mb={4}>
                      <Select
                        data={accountData}
                        value={line.accountId || null}
                        onChange={(v) => updateAccountLine(idx, 'accountId', v)}
                        searchable
                        size="xs"
                        placeholder={isSimpleMode ? (voucherType === 'receipt' ? "Cash/Bank Account" : "Payment Source") : "Select account..."}
                        style={{ flex: 1 }}
                      />
                      <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeAccountLine(idx)}>
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                    {isSimpleMode ? (
                      <NumberInput
                        label="Amount"
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
                    ) : (
                      <Group grow>
                        <NumberInput label="Debit" size="xs" min={0} value={line.debit} onChange={(v) => updateAccountLine(idx, 'debit', v || 0)} />
                        <NumberInput label="Credit" size="xs" min={0} value={line.credit} onChange={(v) => updateAccountLine(idx, 'credit', v || 0)} />
                      </Group>
                    )}
                    <TextInput label="Narration" size="xs" mt={4} value={line.narration} onChange={(e) => updateAccountLine(idx, 'narration', e.target.value)} />
                  </Card>
                ))}
              </Stack>
            ) : (
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
            )}

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

        <Card withBorder>
          <Textarea label="Narration" value={narration} onChange={(e) => setNarration(e.target.value)} minRows={2} />
        </Card>

        <Group justify="flex-end">
          <Button variant="default" onClick={() => navigate(-1)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving} disabled={!voucherType}>
            {isEditMode ? 'Update' : 'Save'}
          </Button>
        </Group>
      </Stack>
    </div>
  );
}

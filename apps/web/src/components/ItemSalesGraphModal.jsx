import { useEffect, useMemo, useState } from 'react';
import { Modal, Group, Select, Stack, Text, Card, Loader } from '@mantine/core';
import api from '../services/api.js';

function getFiscalYearRange(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month >= 3 ? year : year - 1; // FY starts April
  const start = new Date(startYear, 3, 1);
  const end = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);
  return { start, end, startYear };
}

function getFyMonthIndex(d, startYear) {
  const month = d.getMonth();
  const year = d.getFullYear();
  // FY starts in April (month 3)
  const idx = (year - startYear) * 12 + (month - 3);
  return idx;
}

const MONTH_LABELS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

export default function ItemSalesGraphModal({ opened, onClose, items }) {
  const [loading, setLoading] = useState(false);
  const [mcFilter, setMcFilter] = useState(null);
  const [mcs, setMcs] = useState([]);
  const [dataMap, setDataMap] = useState({});

  const finishedGoods = useMemo(() => {
    return items.filter((i) => {
      const groupType = i.itemGroupId?.type || i.itemGroupType || i.type;
      return groupType === 'finished_good';
    });
  }, [items]);

  useEffect(() => {
    if (!opened) return;
    api.get('/material-centres')
      .then(({ data }) => setMcs(data.data.materialCentres))
      .catch(() => {});
  }, [opened]);

  useEffect(() => {
    if (!opened) return;
    loadSales();
  }, [opened, mcFilter]);

  async function loadSales() {
    if (finishedGoods.length === 0) return;
    const { start, end, startYear } = getFiscalYearRange();
    const paramsBase = {
      voucherType: 'sales_invoice',
      fromDate: start.toISOString(),
      toDate: end.toISOString(),
      limit: 100,
      page: 1,
    };
    if (mcFilter) paramsBase.materialCentreId = mcFilter;

    setLoading(true);
    const all = [];
    try {
      let page = 1;
      let totalPages = 1;
      do {
        const { data } = await api.get('/vouchers', { params: { ...paramsBase, page } });
        const payload = data.data || {};
        all.push(...(payload.vouchers || []));
        totalPages = payload.totalPages || 1;
        page += 1;
      } while (page <= totalPages);

      const map = {};
      for (const item of finishedGoods) {
        map[item._id] = new Array(12).fill(0);
      }

      all.forEach((v) => {
        const d = new Date(v.date);
        const mi = getFyMonthIndex(d, startYear);
        if (mi < 0 || mi > 11) return;
        (v.lineItems || []).forEach((li) => {
          const id = li.itemId?._id || li.itemId;
          if (!id || !map[id]) return;
          map[id][mi] += Number(li.quantity || 0);
        });
      });

      setDataMap(map);
    } catch {
      setDataMap({});
    }
    setLoading(false);
  }

  const mcOptions = [{ value: '', label: 'All MCs' }, ...mcs.map((m) => ({ value: m._id, label: m.name }))];

  return (
    <Modal opened={opened} onClose={onClose} title="Finished Goods Sales" size="xl" centered>
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Select
            placeholder="All MCs"
            data={mcOptions}
            value={mcFilter || ''}
            onChange={(v) => setMcFilter(v || null)}
            w={200}
          />
          <Text size="xs" c="dimmed">
            FY {getFiscalYearRange().startYear}-{String(getFiscalYearRange().startYear + 1).slice(2)}
          </Text>
        </Group>

        <Group gap="xs" wrap="nowrap">
          {MONTH_LABELS.map((m) => (
            <Text key={m} size="xs" c="dimmed" style={{ width: 24, textAlign: 'center' }}>{m}</Text>
          ))}
        </Group>

        {loading && <Loader size="sm" />}
        {!loading && finishedGoods.map((item) => {
          const series = dataMap[item._id] || new Array(12).fill(0);
          const max = Math.max(...series, 1);
          return (
            <Card key={item._id} withBorder padding="sm">
              <Stack gap={6}>
                <Text fw={600} lineClamp={1}>{item.name}</Text>
                <Group gap={6} wrap="nowrap">
                  {series.map((v, i) => (
                    <div
                      key={`${item._id}-${i}`}
                      style={{
                        width: 24,
                        height: 48,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: 12,
                          height: Math.round((v / max) * 40),
                          borderRadius: 6,
                          background: 'var(--mantine-color-teal-6)',
                          opacity: v === 0 ? 0.25 : 1,
                        }}
                      />
                    </div>
                  ))}
                </Group>
              </Stack>
            </Card>
          );
        })}
      </Stack>
    </Modal>
  );
}

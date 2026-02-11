import { useEffect, useMemo, useState } from 'react';
import { Modal, Group, Select, Stack, Text, Card, Loader, SegmentedControl, Badge } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import api from '../services/api.js';

function getFiscalYearRange(startYear) {
  const start = new Date(startYear, 3, 1);
  const end = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);
  return { start, end, startYear };
}

function getFyStartYear(date) {
  const y = date.getFullYear();
  return date.getMonth() >= 3 ? y : y - 1;
}

function getFyMonthIndex(d, startYear) {
  const month = d.getMonth();
  const year = d.getFullYear();
  return (year - startYear) * 12 + (month - 3);
}

const MONTH_LABELS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const QUARTER_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'];

const FY_COLORS = ['#22c55e', '#3b82f6', '#f59e0b'];

export default function ItemSalesGraphModal({ opened, onClose, items }) {
  const [loading, setLoading] = useState(false);
  const [mcFilter, setMcFilter] = useState(null);
  const [itemFilter, setItemFilter] = useState('');
  const [mcs, setMcs] = useState([]);
  const [dataMap, setDataMap] = useState({});
  const [granularity, setGranularity] = useState('monthly');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 48em)');

  const finishedGoods = useMemo(() => {
    return items.filter((i) => {
      const groupType = i.itemGroupId?.type || i.itemGroupType || i.type;
      return groupType === 'finished_good';
    });
  }, [items]);

  useEffect(() => {
    if (!opened) return;
    api.get('/material-centres/lookup')
      .then(({ data }) => setMcs(data.data.materialCentres))
      .catch(() => {});
  }, [opened]);

  useEffect(() => {
    if (!opened) return;
    loadSales();
  }, [opened, mcFilter]);

  async function loadSales() {
    if (finishedGoods.length === 0) return;
    const currentStartYear = getFyStartYear(new Date());
    const fyStarts = [currentStartYear - 2, currentStartYear - 1, currentStartYear];
    const { start } = getFiscalYearRange(fyStarts[0]);
    const { end } = getFiscalYearRange(fyStarts[2]);

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
        map[item._id] = {
          [fyStarts[0]]: new Array(12).fill(0),
          [fyStarts[1]]: new Array(12).fill(0),
          [fyStarts[2]]: new Array(12).fill(0),
        };
      }

      all.forEach((v) => {
        const d = new Date(v.date);
        const fyStartYear = getFyStartYear(d);
        if (!fyStarts.includes(fyStartYear)) return;
        const mi = getFyMonthIndex(d, fyStartYear);
        if (mi < 0 || mi > 11) return;
        (v.lineItems || []).forEach((li) => {
          const id = li.itemId?._id || li.itemId;
          if (!id || !map[id]) return;
          map[id][fyStartYear][mi] += Number(li.quantity || 0);
        });
      });

      setDataMap(map);
    } catch {
      setDataMap({});
    }
    setLoading(false);
  }

  const mcOptions = [{ value: '', label: 'All MCs' }, ...mcs.map((m) => ({ value: m._id, label: m.name }))];
  const itemOptions = [{ value: '', label: 'All Finished Goods' }, ...finishedGoods.map((i) => ({ value: i._id, label: i.name }))];
  const currentStartYear = getFyStartYear(new Date());
  const fyStarts = [currentStartYear - 2, currentStartYear - 1, currentStartYear];
  const labels = granularity === 'monthly' ? MONTH_LABELS : QUARTER_LABELS;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Finished Goods Sales"
      size="xl"
      centered
      fullScreen={isMobile}
      padding={isMobile ? 'sm' : 'md'}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="center" wrap={isMobile}>
          <Select
            placeholder="All Finished Goods"
            data={itemOptions}
            value={itemFilter}
            onChange={(v) => setItemFilter(v || '')}
            w={isMobile ? '100%' : 240}
            searchable
            clearable
            comboboxProps={{
              withinPortal: true,
              position: 'bottom-start',
              onDropdownOpen: () => setFiltersOpen(true),
              onDropdownClose: () => setFiltersOpen(false),
            }}
          />
          <Select
            placeholder="All MCs"
            data={mcOptions}
            value={mcFilter || ''}
            onChange={(v) => setMcFilter(v || null)}
            w={isMobile ? '100%' : 200}
            comboboxProps={{
              withinPortal: true,
              position: 'bottom-start',
              onDropdownOpen: () => setFiltersOpen(true),
              onDropdownClose: () => setFiltersOpen(false),
            }}
          />
          <SegmentedControl
            size="xs"
            value={granularity}
            onChange={setGranularity}
            data={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
            ]}
            w={isMobile ? '100%' : 'auto'}
          />
        </Group>

        <Group gap="md" align="center">
          {fyStarts.map((fy, i) => (
            <Group key={fy} gap={6} align="center">
              <div style={{ width: 10, height: 10, borderRadius: 999, background: FY_COLORS[i] }} />
              <Text size="xs" c="dimmed">FY {fy}-{String(fy + 1).slice(2)}</Text>
            </Group>
          ))}
          <Badge size="xs" variant="light">3 FYs</Badge>
        </Group>

        {!isMobile && (
          <Group gap="xs" wrap="nowrap">
            {labels.map((m) => (
              <Text key={m} size="xs" c="dimmed" style={{ width: 36, textAlign: 'center' }}>{m}</Text>
            ))}
          </Group>
        )}

        {loading && <Loader size="sm" />}
        {!loading && filtersOpen && (
          <Text size="xs" c="dimmed">Close the dropdown to view charts.</Text>
        )}
        {!loading && !filtersOpen && finishedGoods
          .filter((i) => !itemFilter || i._id === itemFilter)
          .map((item) => {
          const seriesMap = dataMap[item._id] || {};
          const byFy = fyStarts.map((fy) => seriesMap[fy] || new Array(12).fill(0));
          const agg = (arr) => {
            if (granularity === 'monthly') return arr;
            return [0, 1, 2, 3].map((q) => arr.slice(q * 3, q * 3 + 3).reduce((s, v) => s + v, 0));
          };
          const series = byFy.map((arr) => agg(arr));
          const max = Math.max(...series.flat(), 1);
          const yTicks = [max, Math.round(max * 0.66), Math.round(max * 0.33), 0];

          return (
            <Card key={item._id} withBorder padding={isMobile ? 8 : 'sm'}>
              <Stack gap={6}>
                <Text fw={600} lineClamp={1}>{item.name}</Text>
                <Group gap={isMobile ? 6 : 10} wrap="nowrap" align="flex-start">
                  {!isMobile && (
                    <Stack gap={10} style={{ width: 32 }}>
                      {yTicks.map((t, i) => (
                        <Text key={`${item._id}-yt-${i}`} size="xs" c="dimmed" style={{ lineHeight: 1, textAlign: 'right' }}>
                          {t}
                        </Text>
                      ))}
                    </Stack>
                  )}
                  <div
                    style={{
                      flex: 1,
                      position: 'relative',
                      height: isMobile ? 86 : 96,
                      background: 'var(--app-surface-elevated)',
                      borderRadius: 8,
                      padding: isMobile ? '8px 6px' : '10px 8px',
                      overflowX: isMobile && granularity === 'quarterly' ? 'auto' : 'hidden',
                    }}
                  >
                    {yTicks.map((_, i) => (
                      <div
                        key={`${item._id}-grid-${i}`}
                        style={{
                          position: 'absolute',
                          left: isMobile ? 6 : 8,
                          right: isMobile ? 6 : 8,
                          top: (isMobile ? 10 : 10) + (i * (isMobile ? 18 : 20)),
                          borderTop: '1px dashed var(--mantine-color-default-border)'
                        }}
                      />
                    ))}
                    <div
                      style={{
                        position: 'absolute',
                        left: isMobile ? 6 : 8,
                        right: isMobile ? 6 : 8,
                        bottom: isMobile ? 8 : 10,
                        overflowX: isMobile && granularity === 'quarterly' ? 'auto' : 'hidden',
                      }}
                    >
                      <Group
                        gap={granularity === 'quarterly' ? (isMobile ? 8 : 12) : (isMobile ? 6 : 8)}
                        wrap="nowrap"
                        align="end"
                        style={{
                          minWidth: isMobile
                            ? labels.length * (granularity === 'quarterly' ? 72 : 0)
                            : 'auto',
                        }}
                      >
                        {labels.map((label, idx) => (
                          <div
                            key={`${item._id}-${idx}`}
                            style={{
                              width: granularity === 'quarterly'
                                ? (isMobile ? 72 : 84)
                                : (isMobile ? 28 : 36),
                              height: isMobile ? 54 : 64,
                              display: 'flex',
                              alignItems: 'flex-end',
                              justifyContent: 'center',
                              gap: 0,
                              position: 'relative',
                            }}
                          >
                            {series.map((s, si) => {
                              const h = Math.round((s[idx] / max) * (isMobile ? 48 : 56));
                              const barWidth = granularity === 'quarterly'
                                ? (isMobile ? 12 : 14)
                                : (isMobile ? 6 : 8);
                              return (
                                <div key={`${item._id}-${idx}-${si}`} style={{ position: 'relative' }}>
                                  {!isMobile && s[idx] > 0 && (
                                    <Text size="xs" c="dimmed" style={{ position: 'absolute', top: -14, left: -2 }}>
                                      {Math.round(s[idx])}
                                    </Text>
                                  )}
                                  <div
                                    style={{
                                      width: barWidth,
                                      height: h,
                                      borderRadius: 0,
                                      background: FY_COLORS[si],
                                      opacity: s[idx] === 0 ? 0.2 : 1,
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </Group>
                    </div>
                  </div>
                </Group>
                {isMobile && (
                  <Group
                    gap={8}
                    wrap="nowrap"
                    style={{
                      overflowX: granularity === 'quarterly' ? 'auto' : 'hidden',
                      paddingBottom: 4,
                    }}
                  >
                    {labels.map((m) => (
                      <Text
                        key={m}
                        size="xs"
                        c="dimmed"
                        style={{
                          width: granularity === 'quarterly' ? 72 : 28,
                          textAlign: 'center',
                        }}
                      >
                        {m}
                      </Text>
                    ))}
                  </Group>
                )}
              </Stack>
            </Card>
          );
        })}
      </Stack>
    </Modal>
  );
}

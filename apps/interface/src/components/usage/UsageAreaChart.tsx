"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  DatePicker,
  Radio,
  Spin,
  Statistic,
  Tooltip,
  theme as antTheme,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { Area } from "@ant-design/charts";
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { BillType, Usage } from "@xpensive/types";
import { useUsagesStore } from "@/store/usagesStore";
import { usePricesStore } from "@/store/pricesStore";
import { useTheme } from "@/components/layout/ThemeProvider";
import EmptyState from "@/components/shared/EmptyState";
import { colors } from "@/globals";
import UsageCompareChart from "./UsageCompareChart";
import {
  ViewMode,
  calcPeriodStats,
  clampRange,
  defaultRange,
  filterUsageByLabels,
  weekStart,
} from "@/lib/usageChartUtils";

dayjs.extend(customParseFormat);

const { RangePicker } = DatePicker;
const CHART_DATE_FORMAT = "DD/MM/YYYY HH:mm";

function buildChartData(data: Usage[], mode: ViewMode) {
  if (mode === "day") {
    const byDay = new Map<string, number>();
    for (const row of data) {
      const day = dayjs(row.datetime).format("DD/MM/YYYY");
      byDay.set(day, (byDay.get(day) ?? 0) + row.usage);
    }
    return Array.from(byDay.entries())
      .sort(
        (a, b) =>
          dayjs(a[0], "DD/MM/YYYY").valueOf() -
          dayjs(b[0], "DD/MM/YYYY").valueOf(),
      )
      .map(([datetime, usage]) => ({
        datetime,
        usage: parseFloat(usage.toFixed(3)),
      }));
  }
  if (mode === "week") {
    const byWeek = new Map<string, { sum: number; sunday: Dayjs }>();
    for (const row of data) {
      const sunday = weekStart(dayjs(row.datetime));
      const key = sunday.format("YYYY-MM-DD");
      const existing = byWeek.get(key);
      byWeek.set(key, { sum: (existing?.sum ?? 0) + row.usage, sunday });
    }
    return Array.from(byWeek.values())
      .sort((a, b) => a.sunday.valueOf() - b.sunday.valueOf())
      .map(({ sum, sunday }) => ({
        datetime: sunday.format("DD/MM/YYYY"),
        usage: parseFloat(sum.toFixed(3)),
      }));
  }
  return data.map((row) => ({
    datetime: dayjs(row.datetime).format(CHART_DATE_FORMAT),
    usage: row.usage,
  }));
}

// In the hourly ("all") view the x-axis category is "DD/MM/YYYY HH:mm".
// Show just the hour (HH:mm), except at midnight where we show the date so
// the day boundary stays readable. Day/week views only carry a date, so we
// leave those untouched.
function formatXAxisLabel(value: string, mode: ViewMode): string {
  if (mode !== "all") return value;
  const parsed = dayjs(value, CHART_DATE_FORMAT, true);
  if (!parsed.isValid()) return value;
  return parsed.format("HH:mm") === "00:00"
    ? parsed.format("DD/MM/YYYY")
    : parsed.format("HH:mm");
}

export type ChartMode = "chart" | "compare";

interface Props {
  type: BillType;
  chartMode: ChartMode;
}

interface StatsBlockProps {
  label?: string;
  totalUsage: number;
  dayUsage: number;
  nightUsage: number;
  avgSuffix: string;
  cost: number | null;
  unitPrice: number | null;
  isDark: boolean;
  bg?: string;
  borderRadius: number;
  // When true, show only Total Usage + Est. Cost (used for the selected range).
  compact?: boolean;
}

function StatsBlock({
  label,
  totalUsage,
  dayUsage,
  nightUsage,
  avgSuffix,
  cost,
  unitPrice,
  isDark,
  bg,
  borderRadius,
  compact = false,
}: StatsBlockProps) {
  // Breakdown of how Est. Cost is derived, surfaced on hover so the user can
  // see the current unit price that feeds the estimate.
  const costTooltip =
    cost != null && unitPrice != null
      ? `${totalUsage.toFixed(3)} kWh × ₪${unitPrice} = ₪${cost.toFixed(2)}`
      : "No current price set for this bill type";
  const costTitle = (
    <Tooltip title={costTooltip}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        Est. Cost
        <InfoCircleOutlined style={{ fontSize: 12, opacity: 0.55 }} />
      </span>
    </Tooltip>
  );
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "12px 24px",
        borderRadius,
        background: bg,
      }}
    >
      {label && <span style={{ fontSize: 12, opacity: 0.6 }}>{label}</span>}
      <div style={{ display: "flex", gap: 48 }}>
        <Statistic
          title="Total Usage"
          value={totalUsage}
          precision={3}
          suffix="kWh"
        />
        {!compact && (
          <>
            <Statistic
              title={`Day Usage (07:00–23:00)${avgSuffix}`}
              value={dayUsage}
              precision={3}
              suffix="kWh"
            />
            <Statistic
              title={`Night Usage (23:00–07:00)${avgSuffix}`}
              value={nightUsage}
              precision={3}
              suffix="kWh"
            />
          </>
        )}
        <Statistic
          title={costTitle}
          value={cost ?? "—"}
          precision={cost != null ? 2 : undefined}
          prefix={cost != null ? "₪" : undefined}
        />
      </div>
    </div>
  );
}

export default function UsageAreaChart({ type, chartMode }: Props) {
  const { usages, loading, bounds, fetchByType, fetchBounds } =
    useUsagesStore();
  const { current: currentPrices, fetchCurrentByType } = usePricesStore();
  const { isDark } = useTheme();
  const { token } = antTheme.useToken();

  const [range, setRange] = useState<[Dayjs, Dayjs]>(defaultRange);
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  // Chart x-axis category labels inside the current brush selection. Drives the
  // "Selected range" stats block. Empty means nothing is selected.
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  useEffect(() => {
    fetchBounds(type);
    fetchCurrentByType(type);
  }, [type]);

  // Clear the brush selection when the view/type/range changes, since the
  // underlying data the selection referred to is no longer on screen.
  useEffect(() => {
    setSelectedLabels([]);
  }, [type, viewMode, range]);

  useEffect(() => {
    fetchByType({
      type,
      from: range[0].toISOString(),
      to: range[1].toISOString(),
    });
  }, [type, range]);

  const data: Usage[] = usages[type];
  const isLoading = loading[type];
  const firstEntry = bounds[type]?.first ? dayjs(bounds[type].first) : null;
  const lastEntry = bounds[type]?.last ? dayjs(bounds[type].last) : null;
  const unitPrice = currentPrices[type]?.price ?? null;

  const presets = [
    {
      label: "Today",
      value: clampRange(
        dayjs().startOf("day"),
        dayjs().endOf("day").startOf("minute"),
        firstEntry,
        lastEntry,
      ),
    },
    {
      label: "Yesterday",
      value: clampRange(
        dayjs().subtract(1, "day").startOf("day"),
        dayjs().subtract(1, "day").endOf("day").startOf("minute"),
        firstEntry,
        lastEntry,
      ),
    },
    {
      label: "Last 7 Days",
      value: clampRange(
        dayjs().subtract(6, "day").startOf("day"),
        dayjs().endOf("day").startOf("minute"),
        firstEntry,
        lastEntry,
      ),
    },
    {
      label: "Last Week",
      value: clampRange(
        weekStart(dayjs().subtract(1, "week")),
        weekStart(dayjs().subtract(1, "week"))
          .add(6, "day")
          .endOf("day")
          .startOf("minute"),
        firstEntry,
        lastEntry,
      ),
    },
    {
      label: "Last 30 Days",
      value: clampRange(
        dayjs().subtract(29, "day").startOf("day"),
        dayjs().endOf("day").startOf("minute"),
        firstEntry,
        lastEntry,
      ),
    },
    {
      label: "Last Month",
      value: clampRange(
        dayjs().subtract(1, "month").startOf("month"),
        dayjs()
          .subtract(1, "month")
          .endOf("month")
          .endOf("day")
          .startOf("minute"),
        firstEntry,
        lastEntry,
      ),
    },
  ];

  const periodStats = calcPeriodStats(data);
  const { averaged, isMultiDay } = periodStats;
  const uniqueWeeks = new Set(
    data.map((row) => weekStart(dayjs(row.datetime)).format("YYYY-MM-DD")),
  );
  const isMultiWeek = uniqueWeeks.size > 1;
  const chartData = buildChartData(data, viewMode);
  const avgSuffix = averaged ? " avg/day" : "";
  // Brush selection only makes sense on the per-reading hourly view; aggregated
  // day/week bars don't have a meaningful intra-selection.
  const brushEnabled = viewMode === "all";

  // Stats scoped to the current brush selection (null when nothing selected).
  const selectedData = filterUsageByLabels(data, selectedLabels);
  // Always compute selected-range stats so the block is visible even before a
  // selection (showing zeros). calcPeriodStats([]) yields all-zero values.
  const selectedStats = calcPeriodStats(selectedData);

  // Start/end datetime of the selection (computed from min/max so order of the
  // filtered rows doesn't matter).
  let selectedSpan: string | null = null;
  if (selectedData.length > 0) {
    const times = selectedData.map((row) => dayjs(row.datetime));
    const start = times.reduce((a, b) => (b.isBefore(a) ? b : a));
    const end = times.reduce((a, b) => (b.isAfter(a) ? b : a));
    selectedSpan = `${start.format(CHART_DATE_FORMAT)} → ${end.format(CHART_DATE_FORMAT)}`;
  }

  const estimateCost = (kWh: number): number | null =>
    unitPrice != null ? parseFloat((kWh * unitPrice).toFixed(2)) : null;

  // Handle every chart event through the library's supported `onEvent` channel
  // (it subscribes to the wildcard "*" on the chart emitter). The wildcard
  // handler doesn't tell us the event name, so we discriminate by payload:
  // brush highlight/end events carry `data.selection = [xDomain, yDomain]`;
  // brush:remove carries `{ nativeEvent: true }` with no `data`.
  const handleChartEvent = useCallback((_chart: unknown, evt: unknown) => {
    const e = evt as {
      type?: string;
      nativeEvent?: unknown;
      data?: { selection?: unknown[][] };
    };
    const selection = e?.data?.selection;
    const isBrushRemove =
      e?.type === "brush:remove" ||
      (e?.nativeEvent === true && e?.data === undefined);

    if (Array.isArray(selection)) {
      const xDomain = selection[0];
      const labels = Array.isArray(xDomain)
        ? xDomain.filter((v): v is string => typeof v === "string")
        : [];
      setSelectedLabels(labels);
      return;
    }
    if (isBrushRemove) {
      setSelectedLabels([]);
    }
  }, []);

  const controls = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Radio.Group
        value={viewMode}
        onChange={(e) => setViewMode(e.target.value)}
        optionType="button"
        buttonStyle="solid"
      >
        <Radio.Button value="all">All</Radio.Button>
        <Radio.Button value="day" disabled={!isMultiDay}>
          Day
        </Radio.Button>
        <Radio.Button value="week" disabled={!isMultiWeek}>
          Week
        </Radio.Button>
      </Radio.Group>
      <RangePicker
        showTime={{
          format: "HH:mm",
          defaultOpenValue: [
            dayjs().startOf("day"),
            dayjs().endOf("day").startOf("minute"),
          ],
        }}
        format={CHART_DATE_FORMAT}
        value={range}
        onChange={(val) => {
          if (val) setRange(val as [Dayjs, Dayjs]);
        }}
        presets={presets}
        disabledDate={(date) => {
          if (firstEntry && date.isBefore(firstEntry, "day")) return true;
          if (lastEntry && date.isAfter(lastEntry, "day")) return true;
          return false;
        }}
        allowClear={false}
      />
      <Button onClick={() => setRange(defaultRange())}>Reset</Button>
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        height: "100%",
      }}
    >
      {chartMode === "compare" ? (
        <UsageCompareChart
          type={type}
          firstEntry={firstEntry}
          lastEntry={lastEntry}
        />
      ) : isLoading ? (
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Spin />
        </div>
      ) : chartData.length === 0 ? (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            {controls}
          </div>
          <EmptyState description="No usage data" />
        </>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <StatsBlock
                totalUsage={periodStats.totalUsage}
                dayUsage={periodStats.dayUsage}
                nightUsage={periodStats.nightUsage}
                avgSuffix={avgSuffix}
                cost={estimateCost(periodStats.totalUsage)}
                unitPrice={unitPrice}
                isDark={isDark}
                bg={isDark ? undefined : colors.brand.palette.lightest}
                borderRadius={token.borderRadiusLG}
              />
              <StatsBlock
                label={
                  selectedSpan
                    ? `Selected range · ${selectedSpan}`
                    : "Selected range · drag on the chart"
                }
                totalUsage={selectedStats.totalUsage}
                dayUsage={selectedStats.dayUsage}
                nightUsage={selectedStats.nightUsage}
                avgSuffix={selectedStats.averaged ? " avg/day" : ""}
                cost={estimateCost(selectedStats.totalUsage)}
                unitPrice={unitPrice}
                isDark={isDark}
                bg={isDark ? undefined : colors.brand.palette.lightest}
                borderRadius={token.borderRadiusLG}
                compact
              />
            </div>
            {controls}
          </div>
          <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
            <Area
              height={1000}
              data={chartData}
              xField="datetime"
              yField="usage"
              theme={{ type: isDark ? "classicDark" : "classic" }}
              axis={{
                y: { title: "Usage" },
                x: {
                  label: { autoRotate: true, autoHide: true },
                  labelFormatter: (value: string) =>
                    formatXAxisLabel(value, viewMode),
                },
              }}
              style={{
                fill: `linear-gradient(-90deg, ${colors.brand.palette.lightest} 0%, ${colors.brand.palette.mid} 60%, ${colors.brand.palette.dark} 100%)`,
                stroke: colors.brand.palette.dark,
              }}
              scale={{ y: { domainMin: 0, nice: true } }}
              interaction={
                brushEnabled
                  ? { brushXHighlight: { series: false } }
                  : undefined
              }
              onEvent={handleChartEvent}
              tooltip={{
                title: (d) => d.datetime,
                items: [{ field: "usage", name: "Usage" }],
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

import dayjs, { Dayjs } from "dayjs";
import { Usage } from "@xpensive/types";

export type ViewMode = "all" | "day" | "week";

export function isNight(dt: Dayjs): boolean {
  const h = dt.hour();
  return h >= 23 || h < 7;
}

// Returns the Sunday that starts the week containing `dt` (Sun–Sat weeks).
export function weekStart(dt: Dayjs): Dayjs {
  return dt.subtract(dt.day(), "day").startOf("day");
}

export function defaultRange(): [Dayjs, Dayjs] {
  return [
    dayjs().subtract(6, "day").startOf("day"),
    dayjs().endOf("day").startOf("minute"),
  ];
}

export function clampRange(
  start: Dayjs,
  end: Dayjs,
  first: Dayjs | null,
  last: Dayjs | null,
): [Dayjs, Dayjs] {
  return [
    first && start.isBefore(first) ? first : start,
    last && end.isAfter(last) ? last : end,
  ];
}

export const USAGE_CHART_DATE_FORMAT = "DD/MM/YYYY HH:mm";

// Filters raw usage rows to those whose hourly chart label
// ("DD/MM/YYYY HH:mm") is in the given set of selected x-axis categories.
// Used to scope stats to a brush selection on the chart. Returns the matching
// rows in input order.
export function filterUsageByLabels(data: Usage[], labels: string[]): Usage[] {
  if (labels.length === 0) return [];
  const selected = new Set(labels);
  return data.filter((row) =>
    selected.has(dayjs(row.datetime).format(USAGE_CHART_DATE_FORMAT)),
  );
}

export function calcPeriodStats(data: Usage[]) {
  const totalUsage = data.reduce((sum, row) => sum + row.usage, 0);
  const uniqueDates = new Set(
    data.map((row) => dayjs(row.datetime).format("YYYY-MM-DD")),
  );
  const isMultiDay = uniqueDates.size > 1;
  const nightTotal = data
    .filter((row) => isNight(dayjs(row.datetime)))
    .reduce((sum, row) => sum + row.usage, 0);
  const dayTotal = data
    .filter((row) => !isNight(dayjs(row.datetime)))
    .reduce((sum, row) => sum + row.usage, 0);

  if (isMultiDay) {
    return {
      totalUsage,
      nightUsage: nightTotal / uniqueDates.size,
      dayUsage: dayTotal / uniqueDates.size,
      averaged: true,
      isMultiDay,
    };
  }
  return {
    totalUsage,
    nightUsage: nightTotal,
    dayUsage: dayTotal,
    averaged: false,
    isMultiDay,
  };
}

"use client";

import {Column} from "@ant-design/charts";
import type {Bill, ElectricBillData, WaterBillData} from "@xpensive/types";
import {calcPeriodDays, calcPeriodUsage} from "@/lib/billUtils";
import {useTheme} from "@/components/layout/ThemeProvider";
import EmptyState from "@/components/shared/EmptyState";
import YearColorLegend, {useYearColors, colorForYear} from "./YearColorLegend";

const STORAGE_KEY = "usage-chart-year-colors";

interface ChartRow {
    period: string;
    avgUsagePerDay: number;
    year: string;
    days: number;
}

interface Props {
    data: Bill[];
}

export default function UsageChart({data}: Props) {
    const {isDark} = useTheme();
    const {yearColors, handleColorChange} = useYearColors(STORAGE_KEY);

    if (data.length === 0) {
        return <EmptyState description="No data to display"/>;
    }

    const buckets = new Map<string, { bills: Bill[]; year: string; period: string }>();
    for (const bill of data) {
        const {period, year} = bill.data as ElectricBillData | WaterBillData;
        const key = `${year}-${period}`;
        if (!buckets.has(key)) buckets.set(key, {bills: [], year: String(year), period: `P${period}`});
        buckets.get(key)!.bills.push(bill);
    }

    const grouped = new Map<string, { totalUsage: number; totalDays: number; year: string; period: string }>();
    for (const [key, {bills, year, period}] of buckets.entries()) {
        grouped.set(key, {totalUsage: calcPeriodUsage(bills), totalDays: calcPeriodDays(bills), year, period});
    }

    const chartData: ChartRow[] = Array.from(grouped.values())
        .map(({totalUsage, totalDays, year, period}) => ({
            period,
            avgUsagePerDay: totalDays > 0 ? parseFloat((totalUsage / totalDays).toFixed(2)) : 0,
            year,
            days: totalDays,
        }))
        .sort((a, b) => {
            const yearDiff = parseInt(a.year) - parseInt(b.year);
            if (yearDiff !== 0) return yearDiff;
            return parseInt(a.period.slice(1)) - parseInt(b.period.slice(1));
        });

    const yearsAsc = Array.from(new Set(chartData.map((r) => r.year))).sort();
    const colorRange = yearsAsc.map((y) => colorForYear(y, yearColors));

    const periodOrder = ["P1", "P2", "P3", "P4", "P5", "P6"];

    return (
        <div style={{display: "flex", flexDirection: "column", height: "100%"}}>
            <div style={{flex: 1, minHeight: 0, height: "100%"}}>
                <Column
                    data={chartData}
                    xField="period"
                    yField="avgUsagePerDay"
                    colorField="year"
                    group
                    theme={{type: isDark ? "classicDark" : "classic"}}
                    scale={{
                        y: {domainMin: 0, zero: true, nice: true},
                        x: {domain: periodOrder},
                        color: {domain: yearsAsc, range: colorRange},
                    }}
                    legend={{color: {position: "top", layout: {justifyContent: "center"}}}}
                    axis={{
                        y: {title: "Avg. Usage / Day (kWh)"},
                        x: {title: "Period"},
                    }}
                    tooltip={{
                        items: [
                            (d: ChartRow) => ({
                                name: d.year,
                                value: `${d.avgUsagePerDay.toFixed(2)} (${d.days} days)`,
                            }),
                        ],
                    }}
                    annotations={["P1", "P3", "P5"].map((period) => ({
                        type: "rangeX",
                        data: [period, period],
                        style: {
                            fill: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                            fillOpacity: 1,
                        },
                    }))}
                />
            </div>

            <YearColorLegend yearsAsc={yearsAsc} yearColors={yearColors} onColorChange={handleColorChange}/>
        </div>
    );
}

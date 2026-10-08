"use client";

import {useState, isValidElement} from "react";
import type {Key} from "react";
import dayjs from "dayjs";
import {Button, Space, Table} from "antd";
import {EditOutlined, DeleteOutlined} from "@ant-design/icons";
import type {TableColumnsType} from "antd";
import {BillType} from "@xpensive/types";
import type {Bill, ElectricBillData, Residence, Resident, WaterBillData} from "@xpensive/types";
import {calcPeriodDays, calcPeriodUsage} from "@/lib/billUtils";
import DataTable from "@/components/shared/DataTable";

const DATE_FORMAT = "DD/MM/YY";

const fmtPrice = (n: number | string) =>
    `₪${parseFloat(String(n)).toLocaleString("en", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

const fmtNum = (n: number, decimals = 2) =>
    n.toLocaleString("en", {minimumFractionDigits: decimals, maximumFractionDigits: decimals});

function withFilters<T>(columns: TableColumnsType<T>, data: T[]): TableColumnsType<T> {
    return columns.map((col) => {
        if (col.key === "actions") return col;

        const getText = (record: T): string => {
            const dataIndex = (col as {dataIndex?: keyof T}).dataIndex;
            const raw = dataIndex ? record[dataIndex] : undefined;
            const rendered = col.render ? col.render(raw, record, 0) : raw;
            if (isValidElement(rendered)) return "";
            return rendered == null ? "" : String(rendered);
        };

        const values = Array.from(new Set(data.map(getText)))
            .filter((v) => v !== "")
            .sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));

        if (values.length === 0) return col;

        return {
            ...col,
            filters: values.map((v) => ({text: v, value: v})),
            filterSearch: values.length > 8,
            onFilter: (value: boolean | Key, record: T) => getText(record) === value,
        };
    });
}

interface GroupedRow {
    key: string;
    year: number;
    period: number;
    residence: string;
    start_date: string | Date;
    end_date: string | Date;
    days: number;
    usage: number;
    price: number;
    bills: Bill[];
}

interface ResidenceGroupedRow {
    key: string;
    residence: string;
    year: number;
    price: number;
    start_date: Date;
    end_date: Date;
    bills: Bill[];
}

interface Props {
    data: Bill[];
    loading?: boolean;
    showUsage?: boolean;
    groupByResidence?: boolean;
    type?: BillType;
    residences?: Residence[];
    residents?: Resident[];
    onEdit: (bill: Bill) => void;
    onDelete: (bill: Bill) => void;
}

function groupBills(bills: Bill[], residenceById: Record<string, Residence>): GroupedRow[] {
    const map = new Map<string, Bill[]>();
    for (const bill of bills) {
        const {year, period} = bill.data as ElectricBillData | WaterBillData;
        const key = `${year}-${period}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(bill);
    }

    const rows: GroupedRow[] = [];
    for (const [key, group] of map.entries()) {
        const sorted = [...group].sort((a, b) => dayjs(a.start_date).valueOf() - dayjs(b.start_date).valueOf());
        const {year, period} = sorted[0].data as ElectricBillData | WaterBillData;

        const days = calcPeriodDays(sorted);
        const usage = calcPeriodUsage(sorted);
        const price = sorted.reduce((sum, b) => sum + parseFloat(String(b.price)), 0);

        const seenIds = new Set<string>();
        const residenceLabels: string[] = [];
        for (const bill of sorted) {
            if (bill.residence_id && !seenIds.has(bill.residence_id)) {
                seenIds.add(bill.residence_id);
                const r = residenceById[bill.residence_id];
                residenceLabels.push(r ? `${r.street}` : "-");
            }
        }
        const residence = residenceLabels.length === 0 ? "-" : residenceLabels.join(" → ");

        rows.push({
            key,
            year,
            period,
            residence,
            start_date: sorted[0].start_date,
            end_date: sorted[sorted.length - 1].end_date,
            days,
            usage,
            price,
            bills: sorted,
        });
    }

    return rows.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.period - a.period;
    });
}

function groupBillsByResidence(bills: Bill[], residenceById: Record<string, Residence>): ResidenceGroupedRow[] {
    const map = new Map<string, Bill[]>();
    for (const bill of bills) {
        const year = (bill.data as { year?: number }).year ?? 0;
        const key = `${bill.residence_id ?? "__none__"}__${year}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(bill);
    }
    const rows: ResidenceGroupedRow[] = [];
    for (const [key, group] of map.entries()) {
        const residenceId = group[0].residence_id;
        const r = residenceId ? residenceById[residenceId] : undefined;
        const label = r ? `${r.street}, ${r.city}` : "-";
        const year = (group[0].data as { year?: number }).year ?? 0;
        const price = group.reduce((sum, b) => sum + parseFloat(String(b.price)), 0);
        const sorted = [...group].sort((a, b) => dayjs(a.start_date).valueOf() - dayjs(b.start_date).valueOf());
        const start_date = sorted[0].start_date as Date;
        const end_date = sorted[sorted.length - 1].end_date as Date;
        rows.push({key, residence: label, year, price, start_date, end_date, bills: group});
    }
    return rows.sort((a, b) => b.year - a.year || a.residence.localeCompare(b.residence));
}

export default function BillsTable({
                                       data,
                                       loading,
                                       showUsage,
                                       groupByResidence,
                                       type,
                                       residences = [],
                                       residents = [],
                                       onEdit,
                                       onDelete
                                   }: Props) {
    const residenceById = Object.fromEntries(residences.map((r) => [r.id, r]));
    const residentById = Object.fromEntries(residents.map((r) => [r.id, r]));
    const usageUnit = type === BillType.Electric ? "kWh" : "m³";
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    if (showUsage) {
        const grouped = groupBills(data, residenceById);

        const childColumns: TableColumnsType<Bill> = [
            {
                title: "Residence / Resident",
                key: "residence_id",
                render: (_: unknown, bill: Bill) => {
                    if (bill.resident_id) {
                        const r = residentById[bill.resident_id];
                        return r ? r.name : "-";
                    }
                    if (!bill.residence_id) return "-";
                    const r = residenceById[bill.residence_id];
                    return r ? `${r.street}, ${r.city}` : "-";
                },
            },
            {
                title: "Comment",
                key: "comment",
                render: (_: unknown, bill: Bill) => bill.comment ? bill.comment : "-",
            },
            {
                title: "Start Date",
                dataIndex: "start_date",
                key: "start_date",
                render: (value: Date) => dayjs(value).format(DATE_FORMAT),
            },
            {
                title: "End Date",
                dataIndex: "end_date",
                key: "end_date",
                render: (value: Date) => dayjs(value).format(DATE_FORMAT),
            },
            {
                title: "# Days",
                key: "days",
                render: (_: unknown, bill: Bill) => dayjs(bill.end_date).diff(dayjs(bill.start_date), "day") + 1,
            },
            {
                title: `Usage (${usageUnit})`,
                key: "usage",
                render: (_: unknown, bill: Bill) => fmtNum((bill.data as ElectricBillData | WaterBillData).usage ?? 0),
            },
            {
                title: `Avg. Usage/Day (${usageUnit})`,
                key: "avg_usage_day",
                render: (_: unknown, bill: Bill) => {
                    const d = dayjs(bill.end_date).diff(dayjs(bill.start_date), "day") + 1;
                    const u = (bill.data as ElectricBillData | WaterBillData).usage;
                    return d > 0 ? fmtNum(u / d) : "-";
                },
            },
            {
                title: "Price",
                dataIndex: "price",
                key: "price",
                render: (value: number | string) => fmtPrice(value),
            },
            {
                key: "actions",
                fixed: "right",
                width: 80,
                render: (_: unknown, bill: Bill) => (
                    <Space style={{opacity: hoveredId === bill.id ? 1 : 0, transition: "opacity 0.15s"}}>
                        <Button type="text" size="small" icon={<EditOutlined/>} onClick={() => onEdit(bill)}/>
                        <Button type="text" danger size="small" icon={<DeleteOutlined/>} onClick={() => onDelete(bill)}/>
                    </Space>
                ),
            },
        ];

        const groupedColumns: TableColumnsType<GroupedRow> = [
            {title: "Year", dataIndex: "year", key: "year"},
            {title: "Period", dataIndex: "period", key: "period"},
            {title: "Residence", dataIndex: "residence", key: "residence"},
            {
                title: "Start Date",
                dataIndex: "start_date",
                key: "start_date",
                render: (value: Date) => dayjs(value).format(DATE_FORMAT),
            },
            {
                title: "End Date",
                dataIndex: "end_date",
                key: "end_date",
                render: (value: Date) => dayjs(value).format(DATE_FORMAT),
            },
            {title: "# Days", dataIndex: "days", key: "days"},
            {title: `Usage (${usageUnit})`, dataIndex: "usage", key: "usage", render: (v: number) => fmtNum(v ?? 0)},
            {
                title: `Avg. Usage/Day (${usageUnit})`,
                key: "avg_usage_day",
                render: (_: unknown, row: GroupedRow) => row.days > 0 ? fmtNum(row.usage / row.days) : "-",
            },
            {
                title: "Price",
                dataIndex: "price",
                key: "price",
                render: (value: number) => fmtPrice(value),
            },
            {
                key: "actions",
                fixed: "right",
                width: 80,
                render: (_: unknown, row: GroupedRow) =>
                    row.bills.length === 1 ? (
                        <Space style={{opacity: hoveredId === row.key ? 1 : 0, transition: "opacity 0.15s"}}>
                            <Button type="text" size="small" icon={<EditOutlined/>} onClick={() => onEdit(row.bills[0])}/>
                            <Button type="text" danger size="small" icon={<DeleteOutlined/>} onClick={() => onDelete(row.bills[0])}/>
                        </Space>
                    ) : null,
            },
        ];

        return (
            <DataTable<GroupedRow>
                size="small"
                rowKey="key"
                columns={withFilters(groupedColumns, grouped)}
                dataSource={grouped}
                loading={loading}
                expandable={{
                    expandedRowRender: (row) => (
                        <Table<Bill>
                            size="small"
                            columns={withFilters(childColumns, row.bills)}
                            dataSource={row.bills}
                            rowKey="id"
                            pagination={false}
                            onRow={(bill) => ({
                                onMouseEnter: () => setHoveredId(bill.id),
                                onMouseLeave: () => setHoveredId(null),
                            })}
                        />
                    ),
                    rowExpandable: (row) => row.bills.length > 1,
                }}
                onRow={(row) => ({
                    onMouseEnter: () => setHoveredId(row.key),
                    onMouseLeave: () => setHoveredId(null),
                })}
            />
        );
    }

    if (groupByResidence) {
        const grouped = groupBillsByResidence(data, residenceById);

        const childColumns: TableColumnsType<Bill> = [
            {
                title: "Start Date",
                dataIndex: "start_date",
                key: "start_date",
                render: (value: Date) => dayjs(value).format(DATE_FORMAT),
            },
            {
                title: "End Date",
                dataIndex: "end_date",
                key: "end_date",
                render: (value: Date) => dayjs(value).format(DATE_FORMAT),
            },
            {
                title: "# Days",
                key: "days",
                render: (_: unknown, bill: Bill) => dayjs(bill.end_date).diff(dayjs(bill.start_date), "day") + 1,
            },
            {
                title: "Price",
                dataIndex: "price",
                key: "price",
                render: (value: number | string) => fmtPrice(value),
            },
            {
                title: "Comment",
                key: "comment",
                render: (_: unknown, bill: Bill) => bill.comment ?? "-",
            },
            {
                key: "actions",
                fixed: "right",
                width: 80,
                render: (_: unknown, bill: Bill) => (
                    <Space style={{opacity: hoveredId === bill.id ? 1 : 0, transition: "opacity 0.15s"}}>
                        <Button type="text" size="small" icon={<EditOutlined/>} onClick={() => onEdit(bill)}/>
                        <Button type="text" danger size="small" icon={<DeleteOutlined/>} onClick={() => onDelete(bill)}/>
                    </Space>
                ),
            },
        ];

        const groupedColumns: TableColumnsType<ResidenceGroupedRow> = [
            {title: "Year", dataIndex: "year", key: "year"},
            {title: "Residence", dataIndex: "residence", key: "residence"},
            {
                title: "Start Date",
                dataIndex: "start_date",
                key: "start_date",
                render: (value: Date) => dayjs(value).format(DATE_FORMAT),
            },
            {
                title: "End Date",
                dataIndex: "end_date",
                key: "end_date",
                render: (value: Date) => dayjs(value).format(DATE_FORMAT),
            },
            {
                title: "Total Price",
                dataIndex: "price",
                key: "price",
                render: (value: number) => fmtPrice(value),
            },
            {
                key: "actions",
                fixed: "right",
                width: 80,
                render: (_: unknown, row: ResidenceGroupedRow) =>
                    row.bills.length === 1 ? (
                        <Space style={{opacity: hoveredId === row.key ? 1 : 0, transition: "opacity 0.15s"}}>
                            <Button type="text" size="small" icon={<EditOutlined/>} onClick={() => onEdit(row.bills[0])}/>
                            <Button type="text" danger size="small" icon={<DeleteOutlined/>} onClick={() => onDelete(row.bills[0])}/>
                        </Space>
                    ) : null,
            },
        ];

        return (
            <DataTable<ResidenceGroupedRow>
                rowKey="key"
                size={"small"}
                columns={withFilters(groupedColumns, grouped)}
                dataSource={grouped}
                loading={loading}
                expandable={{
                    expandedRowRender: (row) => (
                        <Table<Bill>
                            size="small"
                            columns={withFilters(childColumns, row.bills)}
                            dataSource={row.bills}
                            rowKey="id"
                            pagination={false}
                            onRow={(bill) => ({
                                onMouseEnter: () => setHoveredId(bill.id),
                                onMouseLeave: () => setHoveredId(null),
                            })}
                        />
                    ),
                    rowExpandable: (row) => row.bills.length > 1,
                }}
                onRow={(row) => ({
                    onMouseEnter: () => setHoveredId(row.key),
                    onMouseLeave: () => setHoveredId(null),
                })}
            />
        );
    }

    const columns: TableColumnsType<Bill> = [
        {
            title: "Residence / Resident",
            key: "residence_id",
            render: (_: unknown, bill: Bill) => {
                if (bill.resident_id) {
                    const r = residentById[bill.resident_id];
                    return r ? r.name : "-";
                }
                if (!bill.residence_id) return "-";
                const r = residenceById[bill.residence_id];
                return r ? `${r.street}, ${r.city}` : "-";
            },
        },
        {
            title: "Start Date",
            dataIndex: "start_date",
            key: "start_date",
            render: (value: Date) => dayjs(value).format(DATE_FORMAT),
        },
        {
            title: "End Date",
            dataIndex: "end_date",
            key: "end_date",
            render: (value: Date) => dayjs(value).format(DATE_FORMAT),
        },
        {
            title: "# Days",
            key: "days",
            render: (_: unknown, bill: Bill) => dayjs(bill.end_date).diff(dayjs(bill.start_date), "day") + 1,
        },
        {
            title: "Price",
            dataIndex: "price",
            key: "price",
            render: (value: number | string) => `₪${parseFloat(String(value)).toFixed(2)}`,
        },
        {
            key: "actions",
            fixed: "right",
            width: 80,
            render: (_: unknown, bill: Bill) => (
                <Space style={{opacity: hoveredId === bill.id ? 1 : 0, transition: "opacity 0.15s"}}>
                    <Button type="text" size="small" icon={<EditOutlined/>} onClick={() => onEdit(bill)}/>
                    <Button type="text" danger size="small" icon={<DeleteOutlined/>} onClick={() => onDelete(bill)}/>
                </Space>
            ),
        },
    ];

    return (
        <DataTable<Bill>
            rowKey="id"
            size={"small"}
            columns={withFilters(columns, data)}
            dataSource={data}
            loading={loading}
            onRow={(bill) => ({
                onMouseEnter: () => setHoveredId(bill.id),
                onMouseLeave: () => setHoveredId(null),
            })}
        />
    );
}

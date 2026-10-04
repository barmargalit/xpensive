"use client";

import React, {useRef, useState} from "react";
import {Button, DatePicker, Divider, Space, theme, Tooltip} from "antd";
import {EditOutlined, SearchOutlined, SwapOutlined, WarningOutlined} from "@ant-design/icons";
import type {TableColumnsType} from "antd";

interface FilterDropdownProps {
    setSelectedKeys: (keys: React.Key[]) => void;
    selectedKeys: React.Key[];
    confirm: () => void;
    clearFilters?: () => void;
}

import dayjs, {Dayjs} from "dayjs";
import type {Contract, Provider, Residence, Resident} from "@xpensive/types";
import DataTable from "@/components/shared/DataTable";
import {BillTypeTag, BILL_TYPE_LABEL} from "@/lib/billTypes";
import {BillType} from "@xpensive/types";

const DATE_FORMAT = "DD/MM/YY";

function isEnded(endDate: string | null) {
    return !!endDate && dayjs(endDate).isBefore(dayjs(), "day");
}

function isExpiringSoon(endDate: string | null) {
    if (!endDate) return false;
    const end = dayjs(endDate);
    const now = dayjs();
    return end.isAfter(now) && end.isBefore(now.add(2, "month"));
}

function DateRangeFilter({setSelectedKeys, selectedKeys, confirm, clearFilters}: FilterDropdownProps) {
    const value = selectedKeys[0] as unknown as [Dayjs, Dayjs] | undefined;
    return (
        <div style={{padding: 8, display: "flex", flexDirection: "column", gap: 8}}>
            <DatePicker.RangePicker
                format={DATE_FORMAT}
                value={value ?? null}
                onChange={(dates) => setSelectedKeys(dates ? [dates as unknown as string] : [])}
            />
            <Space>
                <Button
                    type="primary"
                    icon={<SearchOutlined/>}
                    size="small"
                    onClick={() => confirm()}
                >
                    Filter
                </Button>
                <Button size="small" onClick={() => {
                    clearFilters?.();
                    confirm();
                }}>
                    Reset
                </Button>
            </Space>
        </div>
    );
}

interface Props {
    data: Contract[];
    loading?: boolean;
    providers: Provider[];
    residences?: Residence[];
    residents?: Resident[];
    offerCounts?: Record<string, number>;
    onEdit: (contract: Contract) => void;
    onCompare: (contract: Contract) => void;
}

export default function ContractsTable({
                                           data,
                                           loading,
                                           providers,
                                           residences = [],
                                           residents = [],
                                           offerCounts = {},
                                           onEdit,
                                           onCompare
                                       }: Props) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const {token} = theme.useToken();
    const providerById = Object.fromEntries(providers.map((p) => [p.id, p]));
    const residenceById = Object.fromEntries(residences.map((r) => [r.id, r]));
    const residentById = Object.fromEntries(residents.map((r) => [r.id, r]));

    const columns: TableColumnsType<Contract> = [
        {
            key: "alert",
            width: 32,
            render: (_: unknown, row: Contract) =>
                isExpiringSoon(row.end_date)
                    ? <Tooltip
                        title={`This contract is about to expire in ${dayjs(row.end_date).diff(dayjs(), "day")} days`}><WarningOutlined
                        style={{color: token.colorWarning, fontSize: 16}}/></Tooltip>
                    : null,
        },
        {
            title: "Provider",
            key: "provider_id",
            render: (_: unknown, row: Contract) => providerById[row.provider_id]?.name ?? "-",
            filters: providers.map((p) => ({text: p.name, value: p.id})),
            onFilter: (value, row) => row.provider_id === value,
        },
        {
            title: "Residence / Resident",
            key: "residence_resident",
            render: (_: unknown, row: Contract) => {
                if (row.resident_id) return residentById[row.resident_id]?.name ?? "-";
                if (row.residence_id) {
                    const r = residenceById[row.residence_id];
                    return r ? `${r.street}, ${r.city}` : "-";
                }
                return "-";
            },
        },
        {
            title: "Type",
            key: "bill_type",
            render: (_: unknown, row: Contract) => <BillTypeTag type={row.bill_type}/>,
            filters: (Object.values(BillType) as BillType[]).map((t) => ({
                text: <BillTypeTag type={t}/>,
                value: t,
            })),
            onFilter: (value, row) => row.bill_type === value,
        },
        {
            title: "Start Date",
            dataIndex: "start_date",
            key: "start_date",
            align: "center",
            render: (value: string) => dayjs(value).format(DATE_FORMAT),
            filterDropdown: (props) => <DateRangeFilter {...props} />,
            onFilter: (value, row) => {
                const [from, to] = value as unknown as [Dayjs, Dayjs];
                const d = dayjs(row.start_date);
                return d.isAfter(from.subtract(1, "day")) && d.isBefore(to.add(1, "day"));
            },
        },
        {
            title: "End Date",
            dataIndex: "end_date",
            key: "end_date",
            align: "center",
            render: (value: string | null) => value ? dayjs(value).format(DATE_FORMAT) : "—",
            filterDropdown: (props) => <DateRangeFilter {...props} />,
            onFilter: (value, row) => {
                if (!row.end_date) return false;
                const [from, to] = value as unknown as [Dayjs, Dayjs];
                const d = dayjs(row.end_date);
                return d.isAfter(from.subtract(1, "day")) && d.isBefore(to.add(1, "day"));
            },
        },
        {
            title: "Offers",
            key: "offer_count",
            align: "center",
            sorter: (a, b) => (offerCounts[a.id] ?? 0) - (offerCounts[b.id] ?? 0),
            render: (_: unknown, row: Contract) => offerCounts[row.id] ?? 0,
        },
        {
            key: "actions",
            fixed: "right",
            width: 72,
            render: (_: unknown, row: Contract) => (
                <Space size={0} style={{opacity: hoveredId === row.id ? 1 : 0, transition: "opacity 0.15s"}}>
                    <Tooltip title="Compare Offers">
                        <Button type="text" icon={<SwapOutlined/>} onClick={() => onCompare(row)}/>
                    </Tooltip>
                    <Button type="text" icon={<EditOutlined/>} onClick={() => onEdit(row)}/>
                </Space>
            ),
        },
    ];

    const activeContracts = data.filter((row) => !isEnded(row.end_date));
    const endedContracts = data.filter((row) => isEnded(row.end_date));

    const rowProps = (row: Contract) => ({
        onMouseEnter: () => setHoveredId(row.id),
        onMouseLeave: () => setHoveredId(null),
    });

    return (
        <>
            <Divider titlePlacement="start" style={{marginTop: 0}}>Active</Divider>
            <DataTable<Contract>
                rowKey="id"
                columns={columns}
                dataSource={activeContracts}
                loading={loading}
                onRow={rowProps}
            />

            <Divider titlePlacement="start">Ended</Divider>
            <DataTable<Contract>
                rowKey="id"
                columns={columns}
                dataSource={endedContracts}
                loading={loading}
                onRow={rowProps}
            />
        </>
    );
}

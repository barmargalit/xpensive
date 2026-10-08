"use client";

import {useEffect, useState} from "react";
import {Card, Checkbox, Divider, Skeleton, Tooltip, Typography} from "antd";
import dayjs from "dayjs";
import {Bill, BillType, ElectricBillData, WaterBillData} from "@xpensive/types";
import {useBillsStore} from "@/store/billsStore";
import {BILL_TYPE_LABEL, BillTypeTag} from "@/lib/billTypes";
import {billDurationMonths, fmtPrice} from "@/lib/billUtils";
import {useTheme} from "@/components/layout/ThemeProvider";
import {colors} from "@/globals";
import styles from "./LastBillsCard.module.css";

const {Text} = Typography;

interface BillGroup {
    type: BillType;
    bills: Bill[];
    totalPrice: number;
    startDate: Date;
    endDate: Date;
    period: string | null;
}

function getPeriodLabel(bill: Bill): string | null {
    const d = bill.data as Partial<ElectricBillData & WaterBillData>;
    if (d.year != null && d.period != null) return `${d.year} P${d.period}`;
    if (d.year != null) return String(d.year);
    return null;
}

function groupDurationMonths(group: BillGroup): number {
    return billDurationMonths(group.startDate, group.endDate, group.bills[0].data);
}

function groupBillsByType(bills: Bill[]): BillGroup[] {
    const map = new Map<BillType, Bill[]>();
    for (const bill of bills) {
        const existing = map.get(bill.type) ?? [];
        map.set(bill.type, [...existing, bill]);
    }
    return Array.from(map.entries()).map(([type, typeBills]) => {
        const sorted = [...typeBills].sort((a, b) => dayjs(a.start_date).valueOf() - dayjs(b.start_date).valueOf());
        const totalPrice = sorted.reduce((sum, b) => sum + Number(b.price), 0);
        return {
            type,
            bills: sorted,
            totalPrice,
            startDate: sorted[0].start_date as unknown as Date,
            endDate: sorted[sorted.length - 1].end_date as unknown as Date,
            period: getPeriodLabel(sorted[0]),
        };
    });
}

export default function LastBillsCard() {
    const {lastBills, lastBillsLoading, fetchLastBills} = useBillsStore();
    const [excluded, setExcluded] = useState<Set<BillType>>(new Set());
    const {isDark} = useTheme();
    const metaColor = isDark ? colors.text.secondaryDark : colors.text.secondaryLight;

    useEffect(() => {
        fetchLastBills();
    }, [fetchLastBills]);

    const groups = groupBillsByType(lastBills);
    const activeGroups = groups.filter((g) => !excluded.has(g.type));
    const totalPerMonth = activeGroups.reduce((sum, g) => sum + g.totalPrice / groupDurationMonths(g), 0);

    const toggleType = (type: BillType) => {
        setExcluded((prev) => {
            const next = new Set(prev);
            if (next.has(type)) next.delete(type);
            else next.add(type);
            return next;
        });
    };

    const tooltipContent = (
        <>
            {activeGroups.map((g) => {
                const months = groupDurationMonths(g);
                const rate = g.totalPrice / months;
                return (
                    <div key={g.type}>
                        {BILL_TYPE_LABEL[g.type]}: {fmtPrice(g.totalPrice)} ÷ {Number(months).toFixed(0)}mo
                        = {fmtPrice(rate)}/mo
                    </div>
                );
            })}
        </>
    );

    return (
        <Card title="Last Bills" style={{flex: 1, minWidth: 0}}>
            {lastBillsLoading ? (
                <Skeleton active paragraph={{rows: 4}}/>
            ) : groups.length === 0 ? (
                <Text type="secondary">No bills recorded yet.</Text>
            ) : (
                <>
                    <div className={styles.table}>
                        {groups.map((group) => {
                            const dateRange = `${dayjs(group.startDate).format("DD/MM/YY")} – ${dayjs(group.endDate).format("DD/MM/YY")}`;
                            const billsTooltip = (
                                <div style={{display: "flex", flexDirection: "column", gap: 8}}>
                                    {group.bills.map((b) => (
                                        <div key={b.id} style={{display: "flex", gap: 16, alignItems: "baseline"}}>
                                            <span style={{whiteSpace: "nowrap"}}>
                                                {dayjs(b.start_date).format("DD/MM/YY")} – {dayjs(b.end_date).format("DD/MM/YY")}
                                            </span>
                                            <span style={{whiteSpace: "nowrap"}}>{fmtPrice(Number(b.price))}</span>
                                            {b.comment && <span style={{opacity: 0.75}}>{b.comment}</span>}
                                        </div>
                                    ))}
                                </div>
                            );
                            return (
                                <Tooltip key={group.type} title={billsTooltip} placement="right" destroyOnHidden
                                         styles={{container: {minWidth: 320}}}>
                                    <div className={styles.row}>
                                        <Checkbox
                                            checked={!excluded.has(group.type)}
                                            onChange={() => toggleType(group.type)}
                                            className={styles.checkbox}
                                        />
                                        <div className={styles.typeCell}>
                                            <BillTypeTag type={group.type} style={{margin: 0}}/>
                                        </div>
                                        <span className={styles.meta} style={{color: metaColor}}>
                                            {group.period ? `${group.period} · ` : ""}{dateRange}
                                            {group.bills.length > 1 ? ` (${group.bills.length} bills)` : ""}
                                        </span>
                                        {group.bills.length === 1 && group.bills[0].comment && (
                                            <span className={styles.meta} style={{color: metaColor}}>{group.bills[0].comment}</span>
                                        )}
                                        <span className={styles.price}>{fmtPrice(group.totalPrice)}</span>
                                    </div>
                                </Tooltip>
                            );
                        })}
                    </div>
                    <Divider className={styles.divider}/>
                    <div className={styles.sumRow}>
                        <Typography.Title level={5} className={styles.sumLabel} style={{cursor: "default", margin: 0, color: metaColor}}>Avg
                            / month</Typography.Title>
                        <Tooltip title={tooltipContent} styles={{container: {width: "max-content"}}}>
                            <span className={styles.sumValue}
                                  style={{borderBottom: "1px dashed"}}>{fmtPrice(totalPerMonth)}</span>
                        </Tooltip>
                    </div>
                </>
            )}
        </Card>
    );
}

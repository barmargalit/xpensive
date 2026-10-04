"use client";

import {useEffect, useState} from "react";
import {Button, Divider, Tabs} from "antd";
import {
    PlusOutlined,
    ReloadOutlined,
    ThunderboltOutlined,
    ExperimentOutlined,
    WifiOutlined,
    FireOutlined,
    HomeOutlined,
    BuildOutlined,
    LineChartOutlined,
    BarChartOutlined,
    MobileOutlined,
    DollarOutlined,
    MedicineBoxOutlined
} from "@ant-design/icons";
import {usePageHeader} from "@/components/layout/PageHeaderContext";
import PageTabs from "@/components/layout/PageTabs";
import BillsTable from "@/components/bills/BillsTable";
import UsageChart from "@/components/bills/UsageChart";
import PriceChart from "@/components/bills/PriceChart";
import BillModal from "@/components/bills/BillModal";
import {useBillsStore} from "@/store/billsStore";
import {useResidencesStore} from "@/store/residencesStore";
import {useResidentsStore} from "@/store/residentsStore";
import {Bill, BillType} from "@xpensive/types";
import {useModal} from "@/components/layout/ThemeProvider";
import styles from "./bills.module.css";

interface BillTabProps {
    type: BillType;
    showUsage?: boolean;
    groupByResidence?: boolean;
    onEdit: (bill: Bill) => void;
    onDelete: (bill: Bill) => void;
}

function BillTab({type, showUsage, groupByResidence, onEdit, onDelete}: BillTabProps) {
    const {bills, loading, fetchByType} = useBillsStore();
    const {residences, fetchAll: fetchResidences} = useResidencesStore();
    const {residents, fetchAll: fetchResidents} = useResidentsStore();
    const data = bills[type] ?? [];

    useEffect(() => {
        fetchByType(type);
        fetchResidences();
        fetchResidents();
    }, [type]);

    const chartPane = (
        <Tabs
            tabPlacement={"start"}
            size="small"
            className={styles.chartTabs}
            items={[
                ...(showUsage ? [{
                    key: "usage",
                    label: <span><BarChartOutlined/> Usage</span>,
                    children: <div className={styles.chartPane}><UsageChart data={data}/></div>,
                }] : []),
                {
                    key: "price",
                    label: <span><LineChartOutlined/> Price</span>,
                    children: <div className={styles.chartPane}><PriceChart data={data}/></div>,
                },
            ]}
        />
    );

    return (
        <div className={styles.splitLayout}>
            {chartPane}
            <Divider/>
            <div className={styles.tablePane}>
                <BillsTable
                    data={data}
                    loading={loading[type]}
                    showUsage={showUsage}
                    type={type}
                    groupByResidence={groupByResidence}
                    residences={residences}
                    residents={residents}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            </div>
        </div>
    );
}

export default function BillsPage() {
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [activeTab, setActiveTab] = useState<BillType>(BillType.Electric);
    const {deleteBill, fetchByType, loading} = useBillsStore();
    const modal = useModal();

    const handleEdit = (bill: Bill) => {
        setSelectedBill(bill);
        setEditModalOpen(true);
    };

    const handleDelete = (bill: Bill) => {
        modal.confirm({
            title: "Delete Bill",
            content: "Are you sure you want to delete this bill? This action cannot be undone.",
            okText: "Delete",
            okButtonProps: {danger: true},
            onOk: () => deleteBill(bill.id, bill.type),
        });
    };

    const handleClose = () => {
        setEditModalOpen(false);
        setSelectedBill(null);
    };

    usePageHeader({
        title: "Bills",
        actions: (
            <>
                <Button
                    type="text"
                    icon={<ReloadOutlined/>}
                    loading={loading[activeTab]}
                    onClick={() => fetchByType(activeTab)}
                />
                <Button type="primary" icon={<PlusOutlined/>} onClick={() => {
                    setSelectedBill(null);
                    setEditModalOpen(true);
                }}>
                    New
                </Button>
            </>
        ),
    });

    const tabs = [
        {
            key: BillType.Electric,
            label: "Electric",
            icon: <ThunderboltOutlined/>,
            content: <BillTab type={BillType.Electric} showUsage onEdit={handleEdit} onDelete={handleDelete}/>,
        },
        {
            key: BillType.Water,
            label: "Water",
            icon: <ExperimentOutlined/>,
            content: <BillTab type={BillType.Water} showUsage onEdit={handleEdit} onDelete={handleDelete}/>,
        },
        {
            key: BillType.Internet,
            label: "Internet",
            icon: <WifiOutlined/>,
            content: <BillTab type={BillType.Internet} onEdit={handleEdit} onDelete={handleDelete}/>,
        },
        {
            key: BillType.Gas,
            label: "Gas",
            icon: <FireOutlined/>,
            content: <BillTab type={BillType.Gas} onEdit={handleEdit} onDelete={handleDelete}/>,
        },
        {
            key: BillType.PropertyTax,
            label: "Property Tax",
            icon: <HomeOutlined/>,
            content: <BillTab type={BillType.PropertyTax} groupByResidence onEdit={handleEdit}
                              onDelete={handleDelete}/>,
        },
        {
            key: BillType.BuildingFee,
            label: "Building Fee",
            icon: <BuildOutlined/>,
            content: <BillTab type={BillType.BuildingFee} onEdit={handleEdit} onDelete={handleDelete}/>,
        },
        {
            key: BillType.Cellular,
            label: "Cellular",
            icon: <MobileOutlined/>,
            content: <BillTab type={BillType.Cellular} onEdit={handleEdit} onDelete={handleDelete}/>,
        },
        {
            key: BillType.Rent,
            label: "Rent",
            icon: <DollarOutlined/>,
            content: <BillTab type={BillType.Rent} onEdit={handleEdit} onDelete={handleDelete}/>,
        },
        {
            key: BillType.HealthCare,
            label: "Health Care",
            icon: <MedicineBoxOutlined/>,
            content: <BillTab type={BillType.HealthCare} onEdit={handleEdit} onDelete={handleDelete}/>,
        },
    ];

    return (
        <>
            <PageTabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as BillType)}
                items={tabs.map(({key, label, icon, content}) => ({
                    key,
                    label: (
                        <span style={{display: "flex", alignItems: "center", gap: 6}}>
              {icon}
                            {label}
            </span>
                    ),
                    children: content,
                }))}
            />

            <BillModal
                open={editModalOpen}
                bill={selectedBill}
                defaultType={activeTab}
                onClose={handleClose}
            />
        </>
    );
}

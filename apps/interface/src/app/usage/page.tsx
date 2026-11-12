"use client";

import { useState } from "react";
import { Button, ConfigProvider, Segmented, theme as antTheme } from "antd";
import {
  ImportOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  FireOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import ImportModal from "@/components/usage/ImportModal";
import SimulatorModal from "@/components/usage/SimulatorModal";
import PageTabs from "@/components/layout/PageTabs";
import UsageAreaChart, { ChartMode } from "@/components/usage/UsageAreaChart";
import { useUsagesStore } from "@/store/usagesStore";
import { BillType } from "@xpensive/types";

export default function UsagePage() {
  const [importOpen, setImportOpen] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BillType>(BillType.Electric);
  const [chartMode, setChartMode] = useState<ChartMode>("chart");
  const { usages } = useUsagesStore();
  const { token } = antTheme.useToken();

  usePageHeader({
    title: "Usage",
    actions: (
      <>
        <ConfigProvider
          theme={{
            components: {
              Segmented: {
                itemSelectedBg: token.colorPrimary,
                itemSelectedColor: token.colorWhite,
                trackBg: token.colorPrimaryBg,
              },
            },
          }}
        >
          <Segmented
            value={chartMode}
            onChange={(val) => setChartMode(val as ChartMode)}
            options={[
              { label: "Single", value: "chart" },
              { label: "Compare", value: "compare" },
            ]}
          />
        </ConfigProvider>
        <Button
          icon={<LineChartOutlined />}
          onClick={() => setSimulatorOpen(true)}
        >
          Simulator
        </Button>
        <Button
          type="primary"
          icon={<ImportOutlined />}
          onClick={() => setImportOpen(true)}
        >
          Import
        </Button>
      </>
    ),
  });

  const tabs = [
    {
      key: BillType.Electric,
      label: "Electric",
      icon: <ThunderboltOutlined />,
    },
    { key: BillType.Water, label: "Water", icon: <ExperimentOutlined /> },
    { key: BillType.Gas, label: "Gas", icon: <FireOutlined /> },
  ];

  return (
    <>
      <PageTabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as BillType)}
        items={tabs.map(({ key, label, icon }) => ({
          key,
          label: (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {icon}
              {label}
            </span>
          ),
          children: <UsageAreaChart type={key} chartMode={chartMode} />,
        }))}
      />
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        defaultType={activeTab}
      />
      <SimulatorModal
        open={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        usageData={usages[activeTab]}
      />
    </>
  );
}

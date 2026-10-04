"use client";

import {useState} from "react";
import {useRouter, usePathname} from "next/navigation";
import {ConfigProvider, Layout, Menu, Popover, Switch, Typography} from "antd";
import {
    HomeOutlined,
    AuditOutlined,
    CreditCardOutlined,
    ShopOutlined,
    EnvironmentOutlined,
    SettingOutlined,
    BulbOutlined,
    TeamOutlined,
    EyeOutlined,
    BankOutlined,
    DollarOutlined,
    ThunderboltOutlined,
    StockOutlined,
    FileTextOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined
} from "@ant-design/icons";
import Image from "next/image";
import {useTheme} from "./ThemeProvider";
import {colors} from "@/globals";

const {Sider} = Layout;
const {Text} = Typography;

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const {isDark, toggleTheme} = useTheme();
    const router = useRouter();
    const pathname = usePathname();

    const menuItems = [
        {key: "/", icon: <HomeOutlined/>, label: "Home"},
        {
            key: "bills-group",
            icon: <AuditOutlined/>,
            label: "Household",
            children: [
                {key: "/bills", label: "Bills", icon: <CreditCardOutlined/>},
                {key: "/usage", icon: <ThunderboltOutlined/>, label: "Usage"},
                {key: "/contracts", icon: <FileTextOutlined/>, label: "Contracts"},
                {key: "/prices", icon: <StockOutlined/>, label: "Prices"},
                {key: "/providers", icon: <TeamOutlined/>, label: "Providers"},
            ],
        },
        {
            key: "purchase-group",
            icon: <ShopOutlined/>,
            label: "Purchase",
            children: [
                {key: "/purchase/prospects", icon: <EyeOutlined/>, label: "Prospects"},
                {key: "/purchase/mortgage", icon: <DollarOutlined/>, label: "Mortgage"},
                {key: "/banks", icon: <BankOutlined/>, label: "Banks"},
            ],
        },
    ];

    const settingsContent = (
        <div style={{display: "flex", alignItems: "center", gap: 10}}>
            <BulbOutlined/>
            <Text>Dark mode</Text>
            <Switch checked={isDark} onChange={toggleTheme} size="small"/>
        </div>
    );

    const siderBg = isDark ? colors.sidebar.bgDark : colors.sidebar.bgLight;
    const settingsColor = isDark ? colors.text.secondaryDark : colors.text.secondaryLight;
    const settingsHoverColor = isDark ? colors.text.dark : colors.text.light;

    return (
        <Sider
            collapsible
            collapsed={collapsed}
            collapsedWidth={56}
            onCollapse={setCollapsed}
            style={{background: siderBg, boxShadow: `2px 0 8px 0 ${colors.sidebar.shadow}`}}
            theme={isDark ? "dark" : "light"}
            trigger={
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        background: siderBg,
                        color: settingsColor,
                    }}
                >
                    {collapsed ? <MenuUnfoldOutlined/> : <MenuFoldOutlined/>}
                </div>
            }
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    background: siderBg,
                }}
            >
                <div
                    style={{
                        height: 48,
                        marginLeft: collapsed ? 0 : 24,
                        marginTop: 12,
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: collapsed ? "center" : "flex-start",
                        gap: 10,
                        overflow: "hidden",
                    }}
                >
                    <Image
                        src="/xpensive3.png"
                        alt="XPensive"
                        width={32}
                        height={32}
                        style={{objectFit: "contain"}}
                    />
                    {!collapsed && (
                        <Text style={{fontSize: 18, fontWeight: 600}}>XPensive</Text>
                    )}
                </div>

                <div style={{flex: 1}}>
                    <ConfigProvider
                        theme={{
                            components: {
                                Menu: {
                                    itemSelectedBg: colors.menu.itemSelectedBg,
                                    itemSelectedColor: colors.menu.itemSelectedColor,
                                    itemBg: siderBg,
                                },
                            },
                        }}
                    >
                        <Menu
                            mode="inline"
                            selectedKeys={[pathname]}
                            defaultOpenKeys={["bills-group", "purchase-group"]}
                            items={menuItems}
                            onClick={({key}) => {
                                if (!key.includes("-group")) router.push(key);
                            }}
                            style={{background: siderBg, borderInlineEnd: "none"}}
                        />
                    </ConfigProvider>
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: collapsed ? "center" : undefined,
                        gap: 10,
                        padding: collapsed ? "12px 0" : "12px 24px",
                        cursor: "pointer",
                        color: pathname === "/my-residence" ? colors.menu.itemSelectedColor : settingsColor,
                        transition: "color 0.2s",
                    }}
                    onClick={() => router.push("/my-residence")}
                    onMouseEnter={(e) => (e.currentTarget.style.color = settingsHoverColor)}
                    onMouseLeave={(e) =>
                        (e.currentTarget.style.color =
                            pathname === "/my-residence" ? colors.menu.itemSelectedColor : settingsColor)
                    }
                >
                    <EnvironmentOutlined style={{fontSize: 16}}/>
                    {!collapsed && <span style={{fontSize: 14}}>My Residence</span>}
                </div>

                <Popover
                    content={settingsContent}
                    placement="rightTop"
                    open={settingsOpen}
                    onOpenChange={setSettingsOpen}
                    trigger="click"
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: collapsed ? "center" : undefined,
                            gap: 10,
                            padding: collapsed ? "12px 0" : "12px 24px",
                            cursor: "pointer",
                            color: settingsColor,
                            transition: "color 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = settingsHoverColor)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = settingsColor)}
                    >
                        <SettingOutlined style={{fontSize: 16}}/>
                        {!collapsed && <span style={{fontSize: 14}}>Settings</span>}
                    </div>
                </Popover>
            </div>
        </Sider>
    );
}

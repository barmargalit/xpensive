"use client";

import {useState, useEffect} from "react";
import {ColorPicker, Space, Typography} from "antd";

const DEFAULT_PALETTE = [
    "#1677ff", "#52c41a", "#fa8c16", "#722ed1",
    "#eb2f96", "#13c2c2", "#fadb14", "#f5222d",
];

function loadColors(storageKey: string): Record<string, string> {
    try {
        return JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    } catch {
        return {};
    }
}

function saveColors(storageKey: string, colors: Record<string, string>) {
    localStorage.setItem(storageKey, JSON.stringify(colors));
}

export function colorForYear(year: string, stored: Record<string, string>): string {
    return stored[year] ?? DEFAULT_PALETTE[parseInt(year) % DEFAULT_PALETTE.length];
}

export function useYearColors(storageKey: string) {
    const [yearColors, setYearColors] = useState<Record<string, string>>({});

    useEffect(() => {
        setYearColors(loadColors(storageKey));
    }, [storageKey]);

    const handleColorChange = (year: string, hex: string) => {
        const updated = {...yearColors, [year]: hex};
        setYearColors(updated);
        saveColors(storageKey, updated);
    };

    return {yearColors, handleColorChange};
}

interface Props {
    yearsAsc: string[];
    yearColors: Record<string, string>;
    onColorChange: (year: string, hex: string) => void;
}

export default function YearColorLegend({yearsAsc, yearColors, onColorChange}: Props) {
    return (
        <Space style={{flexWrap: "wrap", justifyContent: "center", width: "100%"}} size={10}>
            {[...yearsAsc].map((year) => (
                <Space key={year} size={4}>
                    <ColorPicker
                        size="small"
                        value={colorForYear(year, yearColors)}
                        onChange={(_, hex) => onColorChange(year, hex)}
                        disabledAlpha
                    />
                    <Typography.Text style={{fontSize: 12}}>{year}</Typography.Text>
                </Space>
            ))}
        </Space>
    );
}

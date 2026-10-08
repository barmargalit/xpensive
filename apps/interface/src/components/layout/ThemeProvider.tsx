"use client";

import { createContext, useContext, useState } from "react";
import { App, ConfigProvider, theme } from "antd";
import { colors } from "@/globals";
type ModalType = ReturnType<typeof App.useApp>["modal"];

const ModalContext = createContext<ModalType>(null as unknown as ModalType);

export function useModal() {
  return useContext(ModalContext);
}

interface ThemeContextValue {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function ModalProvider({ children }: { children: React.ReactNode }) {
  const { modal } = App.useApp();
  return <ModalContext.Provider value={modal}>{children}</ModalContext.Provider>;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  function toggleTheme() {
    setIsDark((prev) => !prev);
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <ConfigProvider
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: isDark ? colors.brand.palette.mid : colors.brand.primary,
            colorBorderSecondary: colors.brand.palette.lighter,
            colorSplit: colors.brand.palette.lighter,
          },
        }}
      >
        <App>
          <ModalProvider>
            {children}
          </ModalProvider>
        </App>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

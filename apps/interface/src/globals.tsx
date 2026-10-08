export const colors = {
  brand: {
    primary: "#325b61",
    palette: {
      lightest: "#f3f3f1",
      lighter: "#d6dee0",
      light: "#b5d2b9",
      mid: "#8cc1b0",
      midDark: "#6eafa6",
      dark: "#325b61",
      darkest: "#313536",
    },
  },
  sidebar: {
    bgLight: "#f3f3f1",
    bgDark: "#313536",
    shadow: "rgba(0, 0, 0, 0.08)",
  },
  menu: {
    itemSelectedBg: "#e6eeef",
    itemSelectedColor: "#325b61",
  },
  table: {
    rowWarningBg: "var(--color-row-warning-bg)",
  },
  drawer: {
    mask: "var(--color-drawer-mask)",
  },
  semantic: {
    pro: "var(--color-pro)",
    con: "var(--color-con)",
  },
  text: {
    secondaryLight: "rgba(0, 0, 0, 0.65)",
    secondaryDark: "rgba(255, 255, 255, 0.65)",
    light: "#000000",
    dark: "#ffffff",
  },
} as const;

import { createTheme } from "@mantine/core";

/** Mantine theme aligned with Aurora CSS tokens in legacy.css + aurora.css */
export const auroraMantineTheme = createTheme({
  fontFamily: "var(--sans), ui-sans-serif, system-ui, sans-serif",
  fontFamilyMonospace: "var(--font), ui-monospace, monospace",
  headings: {
    fontFamily: "var(--serif), Georgia, serif",
  },
  primaryColor: "teal",
  defaultRadius: "md",
  components: {
    Textarea: {
      styles: {
        input: {
          backgroundColor: "var(--surface-2)",
          borderColor: "var(--line)",
          color: "var(--ink)",
          fontFamily: "inherit",
          fontSize: 13,
          "&::placeholder": { color: "var(--ink-3)" },
          "&:focus": {
            borderColor: "var(--ai-line)",
            backgroundColor: "var(--surface)",
          },
        },
      },
    },
    Input: {
      styles: {
        input: {
          backgroundColor: "var(--surface-2)",
          borderColor: "var(--line)",
          color: "var(--ink)",
        },
      },
    },
    Select: {
      styles: {
        input: {
          backgroundColor: "var(--surface-2)",
          borderColor: "var(--line)",
          color: "var(--ink)",
        },
      },
    },
    Tabs: {
      styles: {
        tab: {
          color: "var(--ink-2)",
          borderColor: "transparent",
          fontWeight: 500,
          "&[data-active]": {
            color: "var(--ink)",
            borderColor: "var(--accent)",
          },
        },
        list: {
          borderColor: "var(--line)",
        },
      },
    },
    Alert: {
      styles: {
        root: {
          backgroundColor: "var(--surface-2)",
          borderColor: "var(--line)",
          color: "var(--ink)",
        },
        title: { color: "var(--ink)" },
        message: { color: "var(--ink-2)" },
      },
    },
    Paper: {
      styles: {
        root: {
          backgroundColor: "var(--surface)",
          borderColor: "var(--line)",
          color: "var(--ink)",
        },
      },
    },
  },
});

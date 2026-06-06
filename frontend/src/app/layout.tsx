import type { Metadata } from "next";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@/styles/legacy.css";
import "@/styles/aurora.css";
import { auroraMantineTheme } from "@/lib/mantine-theme";
import { AppProvider } from "@/providers/app-provider";

export const metadata: Metadata = {
  title: "AI Skill Bridge",
  description: "Enterprise AI skills training platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body>
        <MantineProvider theme={auroraMantineTheme} defaultColorScheme="dark">
          <AppProvider>{children}</AppProvider>
        </MantineProvider>
      </body>
    </html>
  );
}

"use client";

import { useEffect } from "react";
import { useMantineColorScheme } from "@mantine/core";

/** Keeps Mantine components in sync with `.app-root` light/dark (useTweaks `dark`). */
export function MantineColorSchemeSync({ dark }: { dark: boolean }) {
  const { setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    setColorScheme(dark ? "dark" : "light");
  }, [dark, setColorScheme]);

  return null;
}

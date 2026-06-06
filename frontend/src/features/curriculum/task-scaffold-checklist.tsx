"use client";

import { useEffect, useState } from "react";
import { Checkbox, Stack } from "@mantine/core";

export type ScaffoldItem = { id: string; label: string };

type Props = {
  storageKey: string;
  items: ScaffoldItem[];
  disabled?: boolean;
};

function loadChecked(key: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function TaskScaffoldChecklist({ storageKey, items, disabled }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setChecked(loadChecked(storageKey));
  }, [storageKey]);

  const toggle = (id: string) => {
    if (disabled) return;
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const done = items.filter((i) => checked[i.id]).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <Stack gap={8}>
      <div className="between" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="lbl">Checklist</span>
        <span className="lbl mono num">{done}/{items.length}</span>
      </div>
      <div className="bar" aria-hidden>
        <i style={{ width: `${pct}%` }} />
      </div>
      <Stack gap={4} mt={4}>
        {items.map((item) => (
          <Checkbox
            key={item.id}
            size="xs"
            label={item.label}
            checked={!!checked[item.id]}
            disabled={disabled}
            onChange={() => toggle(item.id)}
          />
        ))}
      </Stack>
    </Stack>
  );
}

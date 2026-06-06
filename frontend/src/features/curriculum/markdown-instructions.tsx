"use client";

import type { ReactNode } from "react";
import { List, Stack, Text, Title } from "@mantine/core";

type Props = { markdown: string };

/** Lightweight markdown subset for task instructions (no extra deps). */
export function MarkdownInstructions({ markdown }: Props) {
  const blocks = markdown.split(/\n(?=## )/);

  return (
    <Stack gap="md">
      {blocks.map((block, i) => {
        const lines = block.trim().split("\n");
        const heading = lines[0]?.startsWith("## ")
          ? lines[0].replace(/^##\s+/, "")
          : null;
        const body = heading ? lines.slice(1) : lines;

        return (
          <Stack key={i} gap="xs">
            {heading ? <Title order={4}>{heading}</Title> : null}
            {renderBody(body)}
          </Stack>
        );
      })}
    </Stack>
  );
}

function renderBody(lines: string[]) {
  const elements: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    elements.push(
      <List key={`list-${elements.length}`} spacing="xs" size="sm">
        {listItems.map((item, j) => (
          <List.Item key={j}>{formatInline(item)}</List.Item>
        ))}
      </List>,
    );
    listItems = [];
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      flushList();
      continue;
    }
    if (t.startsWith("- ") || t.startsWith("* ")) {
      listItems.push(t.slice(2));
      continue;
    }
    flushList();
    elements.push(
      <Text key={`p-${elements.length}`} size="sm" style={{ whiteSpace: "pre-wrap" }}>
        {formatInline(t)}
      </Text>,
    );
  }
  flushList();
  return elements;
}

function formatInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

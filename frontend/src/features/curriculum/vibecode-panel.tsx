"use client";

import type { ReactNode } from "react";
import { Anchor, List, Paper, Stack, Text, Title } from "@mantine/core";

export function VibecodePanel() {
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Title order={5}>Vibecode → GitHub Pages</Title>
        <Text size="sm" c="dimmed">
          Ship a static single-page app. Document the prompts you used in your notes — peers evaluate
          reasoning, not polish.
        </Text>
        <List spacing="xs" size="sm">
          <List.Item>Scaffold with plain HTML/CSS/JS (no backend).</List.Item>
          <List.Item>
            Two-shot with your coding agent: (1) scaffold + triage UI, (2) refine control checklist
            logic.
          </List.Item>
          <List.Item>
            Enable GitHub Pages on your repo (
            <Anchor href="https://pages.github.com/" target="_blank" rel="noreferrer">
              pages.github.com
            </Anchor>
            ) — use the <CodeInline>gh-pages</CodeInline> branch or Actions workflow.
          </List.Item>
          <List.Item>Submit: Pages URL, repo link, and prompt chain in notes.</List.Item>
        </List>
      </Stack>
    </Paper>
  );
}

function CodeInline({ children }: { children: ReactNode }) {
  return (
    <Text span ff="monospace" size="sm" bg="gray.1" px={4} style={{ borderRadius: 4 }}>
      {children}
    </Text>
  );
}

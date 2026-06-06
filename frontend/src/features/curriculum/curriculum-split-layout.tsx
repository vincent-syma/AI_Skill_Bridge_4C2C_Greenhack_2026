"use client";

import type { ReactNode } from "react";
import { Box, Grid, Stack } from "@mantine/core";

type Props = {
  subject: ReactNode;
  workspace: ReactNode;
  footer?: ReactNode;
};

/** 50/50 workshop layout: subject left, IDE / prompt lab right. */
export function CurriculumSplitLayout({ subject, workspace, footer }: Props) {
  return (
    <Stack gap="md" w="100%">
      <Grid gutter="md" align="stretch">
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Stack gap="md" h="100%">
            {subject}
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Box
            style={{
              position: "sticky",
              top: 12,
              height: "calc(100vh - 120px)",
              minHeight: 480,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {workspace}
          </Box>
        </Grid.Col>
      </Grid>
      {footer}
    </Stack>
  );
}

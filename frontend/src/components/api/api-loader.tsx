"use client";

import type { ReactNode } from "react";

type Props = {
  loading: boolean;
  error: string | null;
  children: ReactNode;
};

export function ApiLoader({ loading, error, children }: Props) {
  if (loading)
    return (
      <div className="dim" style={{ padding: 16, textAlign: "center", fontSize: 13 }}>
        Loading…
      </div>
    );
  if (error)
    return (
      <div
        className="card"
        style={{ padding: 16, color: "var(--err, #f87171)", fontSize: 13 }}
      >
        {error}
      </div>
    );
  return <>{children}</>;
}

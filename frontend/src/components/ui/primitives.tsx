"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";

type AvSize = "" | "sm" | "lg" | "xl";

export function Av({
  children,
  size,
  sm,
  lg,
  xl,
  online,
}: {
  children: ReactNode;
  size?: AvSize;
  sm?: boolean;
  lg?: boolean;
  xl?: boolean;
  online?: boolean;
}) {
  const cls = size ?? (sm ? "sm" : lg ? "lg" : xl ? "xl" : "");
  if (online === undefined) return <div className={"av " + cls}>{children}</div>;
  return (
    <div className={"av-wrap " + cls}>
      <div className={"av " + cls}>{children}</div>
      <span className={"av-status" + (online ? " on" : "")} />
    </div>
  );
}

export function Pill({
  children,
  kind = "",
  as = "span",
  ...p
}: {
  children: ReactNode;
  kind?: string;
  as?: "span" | "button" | "a";
} & ComponentPropsWithoutRef<"span">) {
  const C = as;
  return (
    <C className={"pill " + kind} {...p}>
      {children}
    </C>
  );
}

export function Bar({ p = 60 }: { p?: number }) {
  return (
    <div className="bar">
      <i style={{ width: p + "%" }} />
    </div>
  );
}

export function Stars({ n = 4 }: { n?: number }) {
  return (
    <span className="star">
      {"★".repeat(n)}
      {"☆".repeat(5 - n)}
    </span>
  );
}

export function Badge({ icon = "★", locked }: { icon?: string; locked?: boolean }) {
  return <div className={"badge" + (locked ? " locked" : "")}>{icon}</div>;
}

export function Ring({ p = 62, lvl = 7 }: { p?: number; lvl?: number }) {
  return (
    <div className="ring" style={{ "--p": p } as React.CSSProperties}>
      <b>
        L{lvl}
        <small>{p}%</small>
      </b>
    </div>
  );
}

export function ImgPh({
  label = "image",
  h = 120,
  style,
  className = "",
}: {
  label?: string;
  h?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div className={"img-ph " + className} style={{ height: h, ...style }}>
      {label}
    </div>
  );
}

export function TrustPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="trust-panel">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

export function Mark({ light }: { light?: boolean }) {
  return (
    <svg
      className="mark"
      viewBox="0 0 32 32"
      fill="none"
      stroke={light ? "#fff" : "var(--accent)"}
      strokeWidth="2.1"
      strokeLinecap="round"
    >
      <path d="M3 22c5-9 21-9 26 0" />
      <path d="M3 22v4M29 22v4M11 18v8M21 18v8M16 16v10" />
    </svg>
  );
}

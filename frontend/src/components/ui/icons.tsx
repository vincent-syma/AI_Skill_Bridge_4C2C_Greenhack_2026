"use client";

import { Ic } from "./icon";

export const ICONS = {
  home: (
    <Ic
      paths={
        <>
          <path d="M4 11l8-7 8 7" />
          <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
          <path d="M10 20v-6h4v6" />
        </>
      }
    />
  ),
  projects: (
    <Ic
      paths={
        <>
          <path d="M4 7h6l2 2h8v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
          <path d="M8 13h8M8 16h5" />
        </>
      }
    />
  ),
  peerEvaluation: (
    <Ic
      paths={
        <>
          <circle cx="8" cy="8" r="3" />
          <path d="M3 19a5 5 0 0 1 10 0" />
          <path d="M15 7h6M15 11h4M15 15l2 2 4-5" />
        </>
      }
    />
  ),
  search: (
    <Ic
      size={16}
      paths={
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.4-3.4" />
        </>
      }
    />
  ),
  bell: (
    <Ic
      size={17}
      paths={
        <>
          <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </>
      }
    />
  ),
  sun: (
    <Ic
      size={17}
      paths={
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" />
        </>
      }
    />
  ),
  moon: (
    <Ic size={17} paths={<path d="M21 12.5A8.5 8.5 0 1 1 11.5 3a6.5 6.5 0 0 0 9.5 9.5Z" />} />
  ),
  logout: (
    <Ic
      size={16}
      paths={
        <>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </>
      }
    />
  ),
  check: <Ic size={14} paths={<path d="M5 12l5 5L20 6" />} />,
  x: (
    <Ic
      size={16}
      paths={
        <>
          <path d="M6 6l12 12M18 6 6 18" />
        </>
      }
    />
  ),
  edit: (
    <Ic
      size={14}
      paths={
        <>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </>
      }
    />
  ),
  leaf: (
    <Ic
      size={15}
      paths={
        <>
          <path d="M4 20c8 2 16-4 16-15 0 0-13-2-13 8a5 5 0 0 0 5 5" />
          <path d="M4 20c2-6 6-9 10-11" />
        </>
      }
    />
  ),
  plus: <Ic size={15} paths={<path d="M12 5v14M5 12h14" />} />,
  spark: (
    <Ic size={15} paths={<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />} />
  ),
  chev: <Ic size={15} paths={<path d="m9 6 6 6-6 6" />} />,
  flag: (
    <Ic
      size={15}
      paths={
        <>
          <path d="M5 21V4" />
          <path d="M5 4h11l-2 4 2 4H5" />
        </>
      }
    />
  ),
  diamond: (
    <Ic size={16} paths={<path d="M12 3l4 5-4 13-4-13Z M4 8h16" />} />
  ),
  bolt: (
    <Ic size={16} paths={<path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" />} />
  ),
  users: (
    <Ic
      size={16}
      paths={
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <path d="M16 5.5a3 3 0 0 1 0 5.8" />
          <path d="M17 14a6 6 0 0 1 4 6" />
        </>
      }
    />
  ),
  chat: (
    <Ic
      size={16}
      paths={<path d="M4 5h16v11H9l-5 4V5Z" />}
    />
  ),
  grid: (
    <Ic
      size={16}
      paths={
        <>
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </>
      }
    />
  ),
  clock: (
    <Ic
      size={16}
      paths={
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l3 2" />
        </>
      }
    />
  ),
  swap: (
    <Ic
      size={16}
      paths={
        <>
          <path d="M4 8h13l-3-3" />
          <path d="M20 16H7l3 3" />
        </>
      }
    />
  ),
  cal: (
    <Ic
      size={16}
      paths={
        <>
          <rect x="4" y="5" width="16" height="16" rx="2" />
          <path d="M4 9h16M8 3v4M16 3v4" />
        </>
      }
    />
  ),
  pencil: (
    <Ic
      size={15}
      paths={
        <>
          <path d="M4 20h4L19 9l-4-4L4 16Z" />
          <path d="M14 6l4 4" />
        </>
      }
    />
  ),
  arrowsm: <Ic size={14} paths={<path d="M5 12h12M13 6l6 6-6 6" />} />,
};

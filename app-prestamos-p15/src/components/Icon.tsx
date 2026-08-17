import type { CSSProperties, ReactNode } from "react";

/**
 * Inline SVG icon set. Replaces the emoji that used to live in the UI so the
 * app renders the same on every machine (emoji fonts differ per OS and the
 * printed/exported views did not match the screen).
 *
 * Icons are drawn on a 24x24 grid, stroked with `currentColor`, and sized in
 * `em` so they follow the surrounding text size and color with no extra CSS.
 */
const ICONS = {
  check: <path d="M20 6 9 17l-5-5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  arrowLeft: <path d="M19 12H5M12 19l-7-7 7-7" />,
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9.5 21v-6h5v6" />,
  search: <path d="M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0zM16 16l4.5 4.5" />,
  package: <path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" />,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  users: (
    <path d="M12.5 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zM2 20c0-3.3 2.7-5.5 7-5.5s7 2.2 7 5.5M16 5.2a3.5 3.5 0 0 1 0 5.6M17.5 15c2.7.5 4.5 2.2 4.5 5" />
  ),
  clipboard: (
    <path d="M8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2M8 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3H8zM9 12h6M9 16h6" />
  ),
  settings: (
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9M16.5 7a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0zM10.5 17a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0z" />
  ),
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3" />,
  save: <path d="M4 6a2 2 0 0 1 2-2h9l5 5v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM8 4v5h6V4M8 20v-6h8v6" />,
  refresh: <path d="M3.5 12a8.5 8.5 0 1 0 2.7-6.2M3 4.5V10h5.5" />,
  spinner: <path d="M12 3a9 9 0 1 0 9 9" />,
  alert: <path d="M12 4 2.5 20h19zM12 10v4M12 17.4v.2" />,
  alertCircle: <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 7.5v5M12 16.4v.2" />,
  checkCircle: <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM8.5 12.5 11 15l4.5-5" />,
  inbox: <path d="M5.5 5h13l2.5 8v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5zM3 13h5l1.5 3h5L16 13h5" />,
  smile: <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM8.5 14.5a5 5 0 0 0 7 0M9 9.4v.2M15 9.4v.2" />,
  dot: <circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  /** Any CSS length. Defaults to `1em` so the icon matches the text around it. */
  size?: string | number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
  /** Set only when the icon is the sole content of a control. */
  title?: string;
};

export function Icon({ name, size = "1em", strokeWidth = 2, className, style, title }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, verticalAlign: "-0.125em", ...style }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {ICONS[name]}
    </svg>
  );
}

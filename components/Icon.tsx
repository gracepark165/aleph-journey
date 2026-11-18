import type { SVGProps } from 'react'

/** One hand-drawn icon set: 24px grid, 2px round strokes, currentColor. Filled shapes use `--icon-fill`. */
const PATHS = {
  star: <path d="M12 3.6l2.5 5.2 5.6.7-4.1 3.9 1 5.6L12 16.3 7 19l1-5.6-4.1-3.9 5.6-.7z" fill="var(--icon-fill, none)" />,
  flame: <path d="M12 21c-3.7 0-6.3-2.6-6.3-6 0-3.3 2.4-5 3.4-8 .3-.9 1.5-1 1.9-.2.5 1 .7 2.2 1.6 2.9.4-1.1 1-2 1.8-2.7.6-.5 1.5-.2 1.6.6.6 3.4 2.3 4.6 2.3 7.4 0 3.4-2.6 6-6.3 6z" fill="var(--icon-fill, none)" />,
  candle: <><path d="M9 11h6v9.5H9z" fill="var(--icon-fill, none)" /><path d="M12 11V8.6" /><path d="M12 3.4c1.3 1.4 1.8 2.4 1.8 3.2a1.8 1.8 0 01-3.6 0c0-.8.5-1.8 1.8-3.2z" /></>,
  compass: <><circle cx="12" cy="12" r="8.6" /><path d="M15.4 8.6l-1.9 4.9-4.9 1.9 1.9-4.9z" fill="var(--icon-fill, none)" /></>,
  scroll: <><path d="M7 4.5h10.2a2 2 0 012 2v0a2 2 0 01-2 2H17" /><path d="M7 4.5a2 2 0 00-2 2v11a2 2 0 002 2h8.5a2 2 0 002-2V8.5" /><path d="M8.7 11h5.6M8.7 14.6h4" /></>,
  pencil: <><path d="M15.3 4.9l3.8 3.8L8.6 19.2l-4.5.7.7-4.5z" /><path d="M13.3 6.9l3.8 3.8" /></>,
  crown: <path d="M4.2 8.2l3.9 3.2L12 5.6l3.9 5.8 3.9-3.2-1.5 9.6H5.7z" fill="var(--icon-fill, none)" />,
  trophy: <><path d="M8 4.5h8v4.8a4 4 0 01-8 0z" fill="var(--icon-fill, none)" /><path d="M8 6.5H5.2c0 2.6 1.2 3.9 3.2 4.3M16 6.5h2.8c0 2.6-1.2 3.9-3.2 4.3M12 13.3v3.4M8.8 19.5h6.4M10 16.7h4" /></>,
  calendar: <><rect x="4.5" y="5.8" width="15" height="13.7" rx="3" /><path d="M4.5 10.2h15M9 4v3.4M15 4v3.4" /></>,
  lock: <><rect x="5.6" y="10.6" width="12.8" height="9.2" rx="2.6" /><path d="M8.6 10.6V8a3.4 3.4 0 016.8 0v2.6" /></>,
  check: <path d="M5.4 12.6l4.3 4.2 8.9-9.4" />,
  arrow: <path d="M5 12h13.4M13.4 7l5 5-5 5" />,
  pin: <><path d="M12 20.6s-6.2-5.6-6.2-10.4a6.2 6.2 0 0112.4 0c0 4.8-6.2 10.4-6.2 10.4z" /><circle cx="12" cy="10.2" r="2.2" /></>,
  book: <><path d="M12 6.7c-1.7-1.4-4.4-2-7.4-1.7v13.3c3-.3 5.7.3 7.4 1.7 1.7-1.4 4.4-2 7.4-1.7V5c-3-.3-5.7.3-7.4 1.7z" /><path d="M12 6.7v12.6" /></>,
  puzzle: <path d="M5 8.6h3.3a2.2 2.2 0 114.4 0H16v3.3a2.2 2.2 0 110 4.4v3.3H5v-3.6a2.2 2.2 0 100-4.4z" />,
  chat: <><path d="M5.2 6.2h13.6a1.8 1.8 0 011.8 1.8v7.6a1.8 1.8 0 01-1.8 1.8h-7.4L7 20.6v-3.2H5.2a1.8 1.8 0 01-1.8-1.8V8a1.8 1.8 0 011.8-1.8z" /><path d="M8.2 11.8h.01M12 11.8h.01M15.8 11.8h.01" /></>,
  friend: <><circle cx="9.6" cy="8.6" r="3.4" /><path d="M3.6 19.4c.6-3.2 3-5 6-5s5.4 1.8 6 5M18 8.4v5.4M15.3 11.1h5.4" /></>,
  sparkle: <path d="M12 3.8c.6 3.9 2.3 5.6 6.2 6.2-3.9.6-5.6 2.3-6.2 6.2-.6-3.9-2.3-5.6-6.2-6.2 3.9-.6 5.6-2.3 6.2-6.2zM18.4 15.4c.3 1.6.9 2.2 2.4 2.4-1.5.3-2.1.9-2.4 2.4-.3-1.5-.9-2.1-2.4-2.4 1.5-.2 2.1-.8 2.4-2.4z" />,
  lamp: <><path d="M3.6 13.2c2.6 0 4.5-.8 6.3-2h7.3c1.4 0 2.6-.5 3.3-1.4-.1 3.9-3.3 6.9-7.4 6.9H9c-2.6 0-4.6-1.4-5.4-3.5z" fill="var(--icon-fill, none)" /><path d="M9.6 19.5h5" /><path className="icon-flame" d="M6 5c1.1 1.3 1.6 2.2 1.6 3a1.6 1.6 0 01-3.2 0c0-.8.5-1.7 1.6-3z" /></>,
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={`icon icon-${name}`} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false" {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}

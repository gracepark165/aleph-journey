/** Static illustration from public/illustrations. Plain <img> keeps it portable (app and preview build). */
export function Illustration({ src, alt, className }: { src: string; alt: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />
}

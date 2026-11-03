export function HebrewText({ text, className }: { text: string; className?: string }) {
  return (
    <span lang="he" dir="rtl" className={['hebrew', className].filter(Boolean).join(' ')}>
      {text}
    </span>
  )
}

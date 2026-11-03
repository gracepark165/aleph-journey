const CANTILLATION = /[֑-֯]/g
const SOF_PASUQ_PASEQ = /[׃׀]/g
const MAQAF = /־/g
const NIQQUD = /[ְ-ׇֽֿׁׂׅׄ]/g

export function normalizeHebrew(s: string, opts: { stripNiqqud?: boolean } = {}): string {
  let out = s.normalize('NFD').replace(CANTILLATION, '').replace(SOF_PASUQ_PASEQ, '').replace(MAQAF, ' ')
  if (opts.stripNiqqud) out = out.replace(NIQQUD, '')
  return out.normalize('NFC').replace(/\s+/g, ' ').trim()
}

import { VocabPage } from '@/components/VocabPage'
import { loadLexicon } from '@/lib/content/load'

export default function Vocab() {
  return (
    <>
      <h1 className="page-title">단어장</h1>
      <VocabPage lexicon={loadLexicon()} />
    </>
  )
}

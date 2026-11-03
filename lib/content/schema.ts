import { z } from 'zod'

const LemmaId = z.string().regex(/^H\d+$/, 'lemmaId must look like H1234')
const Id = z.string().min(1)
/** Illustrations ship with the app under public/illustrations. */
const IllustrationSrc = z.string().regex(/^\/illustrations\/[a-z0-9-]+\.(webp|png|jpg)$/, 'image must live in /illustrations/')

export const HebrewLineSchema = z.object({
  he: z.string().min(1),
  translit: z.string(),
  ko: z.string(),
  lemmaIds: z.array(LemmaId),
})

export const LexemeSchema = z.object({
  id: LemmaId,
  lemma: z.string().min(1),
  translit: z.string(),
  glossKo: z.string().min(1),
  posKo: z.string(),
})
export const LexiconSchema = z.record(LemmaId, LexemeSchema)

export const UnitSchema = z.object({
  id: Id,
  titleKo: z.string(),
  refKo: z.string().optional(),
  mapLabelKo: z.string(),
  lessonIds: z.array(Id).min(1),
  imageSrc: IllustrationSrc.optional(),
  imageAltKo: z.string().optional(),
})
export const CourseSchema = z.object({ id: Id, titleKo: z.string(), units: z.array(UnitSchema).min(1) })

export const ReadingLessonSchema = z.object({
  id: Id,
  type: z.literal('reading'),
  titleKo: z.string(),
  verses: z.array(z.object({
    refKo: z.string(),
    translationKo: z.string(),
    words: z.array(z.object({
      surface: z.string().min(1),
      lemmaId: LemmaId,
      translit: z.string(),
      glossKo: z.string(),
      grammarKo: z.string().optional(),
    })).min(1),
  })).min(1),
})

export const ChoiceQuestionSchema = z.object({
  kind: z.literal('choice'),
  prompt: z.object({ he: z.string().optional(), ko: z.string() }),
  choices: z.array(z.string()).min(2),
  answerIndex: z.number().int().nonnegative(),
  lemmaId: LemmaId.optional(),
}).refine(q => q.answerIndex < q.choices.length, { message: 'answerIndex out of range', path: ['answerIndex'] })

export const OrderQuestionSchema = z.object({
  kind: z.literal('order'),
  promptKo: z.string(),
  tokens: z.array(z.string().min(1)).min(2),
  answer: z.array(z.string().min(1)).min(1),
  lemmaIds: z.array(LemmaId),
})

export const QuizLessonSchema = z.object({
  id: Id,
  type: z.literal('quiz'),
  titleKo: z.string(),
  questions: z.array(z.union([ChoiceQuestionSchema, OrderQuestionSchema])).min(1),
})

export const ChoiceReplySchema = z.object({
  mode: z.literal('choice'),
  options: z.array(z.object({
    id: Id,
    line: HebrewLineSchema,
    correct: z.boolean(),
    next: Id.optional(),
    feedbackKo: z.string().optional(),
  }).refine(o => !o.correct || o.next !== undefined, { message: 'correct option needs next' })).min(2),
})

export const BlocksReplySchema = z.object({
  mode: z.literal('blocks'),
  promptKo: z.string(),
  tokens: z.array(z.string().min(1)).min(2),
  accepted: z.array(z.string().min(1)).min(1),
  next: Id,
  lemmaIds: z.array(LemmaId),
})

export const ScriptNodeSchema = z.object({
  id: Id,
  narrationKo: z.string().optional(),
  npc: HebrewLineSchema.optional(),
  reply: z.discriminatedUnion('mode', [ChoiceReplySchema, BlocksReplySchema]).optional(),
  end: z.literal(true).optional(),
}).refine(n => (n.reply !== undefined) !== (n.end === true), { message: 'node needs exactly one of reply or end' })

export const RoleplayLessonSchema = z.object({
  id: Id,
  type: z.literal('roleplay'),
  titleKo: z.string(),
  setupKo: z.string(),
  character: z.object({ nameKo: z.string(), nameHe: z.string(), avatarSrc: IllustrationSrc.optional() }),
  startNodeId: Id,
  nodes: z.record(Id, ScriptNodeSchema),
})

export const LessonSchema = z.discriminatedUnion('type', [ReadingLessonSchema, QuizLessonSchema, RoleplayLessonSchema])

export type HebrewLine = z.infer<typeof HebrewLineSchema>
export type Lexeme = z.infer<typeof LexemeSchema>
export type Lexicon = z.infer<typeof LexiconSchema>
export type Unit = z.infer<typeof UnitSchema>
export type Course = z.infer<typeof CourseSchema>
export type ReadingLesson = z.infer<typeof ReadingLessonSchema>
export type ChoiceQuestion = z.infer<typeof ChoiceQuestionSchema>
export type OrderQuestion = z.infer<typeof OrderQuestionSchema>
export type QuizLesson = z.infer<typeof QuizLessonSchema>
export type ChoiceReply = z.infer<typeof ChoiceReplySchema>
export type BlocksReply = z.infer<typeof BlocksReplySchema>
export type ScriptNode = z.infer<typeof ScriptNodeSchema>
export type RoleplayLesson = z.infer<typeof RoleplayLessonSchema>
export type Lesson = z.infer<typeof LessonSchema>
export type LessonType = Lesson['type']

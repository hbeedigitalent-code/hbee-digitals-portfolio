import { cn } from '@/lib/cn'
import styles from './work.module.css'

/**
 * Renders CMS long-text fields (brief, challenge, solution, results) as editorial
 * copy. Authors write these in a plain textarea, so lists arrive as lines that
 * start with a marker (•, -, *, ✓). Without this the markers and line breaks
 * collapse into one run-on paragraph. Nothing is added, reworded or reordered:
 * lines are only grouped into paragraphs and lists.
 */

const MARKER = /^\s*([•·▪●◦✓✔☑*-])\s+/
const CHECKS = new Set(['✓', '✔', '☑'])
/**
 * The CMS text helper collapses line breaks to single spaces before the copy
 * reaches the page, so a list arrives as "intro • one • two". Bullet and check
 * glyphs (unlike "-" or "·", which appear in ordinary prose) are unambiguous, so
 * they also start a new line when they follow whitespace and precede a space.
 */
const INLINE_MARKER = /\s+(?=[•▪●◦✓✔☑]\s)/

export type StoryBlock = { type: 'p'; text: string } | { type: 'list'; items: string[]; check: boolean }

export function parseStory(raw: string): StoryBlock[] {
  const blocks: StoryBlock[] = []
  const lines = raw
    .split(/\r?\n/)
    .flatMap((l) => l.trim().split(INLINE_MARKER))
    .map((l) => l.trim())
    .filter(Boolean)
  for (const line of lines) {
    const marker = MARKER.exec(line)
    if (!marker) {
      blocks.push({ type: 'p', text: line })
      continue
    }
    const item = line.slice(marker[0].length).trim()
    if (!item) continue
    const check = CHECKS.has(marker[1])
    const last = blocks[blocks.length - 1]
    if (last?.type === 'list' && last.check === check) last.items.push(item)
    else blocks.push({ type: 'list', items: [item], check })
  }
  return blocks
}

export function StoryText({ text, variant = 'body', className }: { text: string; variant?: 'body' | 'result'; className?: string }) {
  const blocks = parseStory(text)
  if (!blocks.length) return null
  const result = variant === 'result'
  return (
    <div className={cn(styles.story, result && styles.storyResult, className)}>
      {blocks.map((block, i) =>
        block.type === 'p' ? (
          <p key={i} className={result ? styles.storyLead : styles.storyP}>
            {block.text}
          </p>
        ) : (
          <ul key={i} className={cn(styles.storyList, block.check && styles.storyChecks, result && styles.storyResultList)}>
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  )
}

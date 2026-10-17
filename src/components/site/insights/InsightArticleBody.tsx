import styles from './insights.module.css'

/** Only accept HTML returned by the existing server-side Insights sanitizer. */
export function InsightArticleBody({ html, labelledBy = 'insight-title' }: { html: string; labelledBy?: string }) {
  return <article className={styles.prose} aria-labelledby={labelledBy} dangerouslySetInnerHTML={{ __html: html }} />
}

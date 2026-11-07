import styles from './insights.module.css'

/** Only accept HTML returned by the existing server-side Insights sanitizer. */
export function InsightArticleBody({ html, labelledBy = 'insight-title', id }: { html: string; labelledBy?: string; id?: string }) {
  return <article id={id} className={styles.prose} aria-labelledby={labelledBy} dangerouslySetInnerHTML={{ __html: html }} />
}

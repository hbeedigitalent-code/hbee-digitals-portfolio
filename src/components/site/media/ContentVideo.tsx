import { cn } from '@/lib/cn'
import styles from './site-video.module.css'

export interface ContentVideoProps {
  src: string
  mimeType: 'video/mp4' | 'video/webm'
  /** Names the player for assistive technology. */
  title: string
  poster?: string | null
  caption?: string
  /** WebVTT captions file. */
  captionsUrl?: string | null
  transcript?: string | null
  className?: string
  /** Override how much is fetched before play. Default: nothing when there is a poster, otherwise metadata. */
  preload?: 'none' | 'metadata'
}

/**
 * Foreground video (case study, UGC, explainer): native controls, never autoplays, loads nothing until asked when a poster
 * exists. Captions and a transcript are shown when the content provides them. Not placed on any page yet.
 */
export function ContentVideo({ src, mimeType, title, poster, caption, captionsUrl, transcript, className, preload }: ContentVideoProps) {
  return <figure className={cn(styles.content, className)}>
    <video className={styles.player} controls playsInline preload={preload ?? (poster ? 'none' : 'metadata')} poster={poster ?? undefined} aria-label={title} crossOrigin={captionsUrl ? 'anonymous' : undefined}>
      <source src={src} type={mimeType} />
      {captionsUrl && <track kind="captions" src={captionsUrl} srcLang="en" label="English" default />}
      <a href={src}>Download the video: {title}</a>
    </video>
    {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    {transcript && <details className={styles.transcript}><summary>Transcript</summary><p>{transcript}</p></details>}
  </figure>
}

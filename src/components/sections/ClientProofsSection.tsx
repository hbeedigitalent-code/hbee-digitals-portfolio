'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'

interface ClientProof {
  id: string
  title?: string
  subtitle?: string
  description?: string
  video_url?: string
  videoUrl?: string
  poster_url?: string
  thumbnail_url?: string
  image_url?: string
  client_name?: string
  result?: string
  is_active?: boolean
  display_order?: number
}

export default function ClientProofsSection() {
  const reducedMotion = useReducedMotion()
  const [proofs, setProofs] = useState<ClientProof[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProofs() {
      const { data } = await supabase.from('client_proofs').select('*')

      const cleaned = (data || [])
        .filter((item) => item.is_active !== false)
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

      setProofs(cleaned)
      setLoading(false)
    }

    fetchProofs()
  }, [])

  if (loading || proofs.length === 0) return null

  return (
    <section className="relative overflow-hidden bg-[var(--bg-page)] py-16 text-[var(--text-primary)] sm:py-20 lg:py-24">
      {/* Background decorative elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-0 top-20 h-[320px] w-[420px] rounded-full bg-[var(--accent)]/7 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[380px] rounded-full bg-[var(--accent-lime)]/5 blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.015)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        {/* Header */}
        <div className="mb-12 max-w-4xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
            <SvgIcon name="play" size={14} color="var(--accent)" />
            Client Proofs
          </div>

          <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] text-[var(--text-primary)] sm:text-5xl md:text-6xl">
            Real proof from real project{' '}
            <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-lime)] bg-clip-text text-transparent">
              outcomes.
            </span>
          </h2>

          <p className="mt-6 max-w-2xl text-sm leading-8 text-[var(--text-secondary)] sm:text-base">
            Watch client proof videos, results, and project feedback without the distracting hover blur.
          </p>
        </div>

        {/* Proofs Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {proofs.map((proof, index) => (
            <VideoProofCard
              key={proof.id || index}
              proof={proof}
              index={index}
              reducedMotion={Boolean(reducedMotion)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function VideoProofCard({
  proof,
  index,
  reducedMotion,
}: {
  proof: ClientProof
  index: number
  reducedMotion: boolean
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const videoUrl = proof.video_url || proof.videoUrl
  const poster = proof.poster_url || proof.thumbnail_url || proof.image_url

  const togglePlay = async () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      await video.play()
      setPlaying(true)
    } else {
      video.pause()
      setPlaying(false)
    }
  }

  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: index * 0.05 }}
      viewport={{ once: true }}
      className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-lg)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-xl)]"
    >
      {/* Video / Image Container */}
      <div className="relative aspect-video overflow-hidden bg-[var(--bg-section)]">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            poster={poster}
            controls
            playsInline
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            className="h-full w-full bg-[var(--bg-section)] object-contain"
          />
        ) : poster ? (
          <img
            src={poster}
            alt={proof.title || 'Client proof'}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--bg-section)]">
            <SvgIcon name="play" size={54} color="var(--accent)" />
          </div>
        )}

        {/* Play Button Overlay */}
        {videoUrl && !playing && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--accent)]/30 bg-[var(--bg-page)]/88 text-[var(--accent)] shadow-[0_0_45px_rgba(57,217,122,0.2)] transition hover:scale-105 hover:bg-[var(--bg-card-hover)]"
            aria-label="Play client proof video"
          >
            <SvgIcon name="play" size={24} color="var(--accent)" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="mb-4 flex flex-wrap gap-3">
          {proof.client_name && (
            <span className="rounded-full border border-[var(--accent)]/18 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">
              {proof.client_name}
            </span>
          )}

          {proof.result && (
            <span className="rounded-full border border-[var(--border)] bg-[var(--bg-card-hover)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {proof.result}
            </span>
          )}
        </div>

        <h3 className="text-2xl font-black tracking-[-0.035em] text-[var(--text-primary)]">
          {proof.title || 'Client Proof Video'}
        </h3>

        {(proof.subtitle || proof.description) && (
          <p className="mt-3 line-clamp-3 text-sm leading-7 text-[var(--text-secondary)]">
            {proof.subtitle || proof.description}
          </p>
        )}
      </div>
    </motion.article>
  )
}
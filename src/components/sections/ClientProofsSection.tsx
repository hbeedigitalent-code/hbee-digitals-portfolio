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
    <section className="relative overflow-hidden bg-[#07111F] py-16 text-white sm:py-20 lg:py-24">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-0 top-20 h-[320px] w-[420px] rounded-full bg-[#39D97A]/7 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[380px] rounded-full bg-[#C6F135]/5 blur-[110px]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="mb-12 max-w-4xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
            <SvgIcon name="play" size={14} color="#39D97A" />
            Client Proofs
          </div>

          <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] sm:text-5xl md:text-6xl">
            Real proof from real project{' '}
            <span className="bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
              outcomes.
            </span>
          </h2>

          <p className="mt-6 max-w-2xl text-sm leading-8 text-white/60 sm:text-base">
            Watch client proof videos, results, and project feedback without the distracting hover blur.
          </p>
        </div>

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
      className="overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] shadow-[0_28px_90px_rgba(0,0,0,0.24)]"
    >
      <div className="relative aspect-video overflow-hidden bg-black">
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
            className="h-full w-full bg-black object-contain"
          />
        ) : poster ? (
          <img src={poster} alt={proof.title || 'Client proof'} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#07111F]">
            <SvgIcon name="play" size={54} color="#39D97A" />
          </div>
        )}

        {videoUrl && !playing && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#39D97A]/30 bg-[#07111F]/88 text-[#39D97A] shadow-[0_0_45px_rgba(57,217,122,0.2)] transition hover:scale-105 hover:bg-[#13233A]"
            aria-label="Play client proof video"
          >
            <SvgIcon name="play" size={24} color="#39D97A" />
          </button>
        )}
      </div>

      <div className="p-6">
        <div className="mb-4 flex flex-wrap gap-3">
          {proof.client_name && (
            <span className="rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#39D97A]">
              {proof.client_name}
            </span>
          )}

          {proof.result && (
            <span className="rounded-full border border-[#1E314A] bg-[#13233A] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/55">
              {proof.result}
            </span>
          )}
        </div>

        <h3 className="text-2xl font-black tracking-[-0.035em] text-white">
          {proof.title || 'Client Proof Video'}
        </h3>

        {(proof.subtitle || proof.description) && (
          <p className="mt-3 line-clamp-3 text-sm leading-7 text-white/58">
            {proof.subtitle || proof.description}
          </p>
        )}
      </div>
    </motion.article>
  )
}
'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface Proof {
  id: string
  title: string
  image_url: string
  media_type: string
}

function CurvedUnderlineText({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
        {children}
      </span>

      <svg
        className="absolute -bottom-2 left-0 h-4 w-full text-[#39D97A]/75 sm:-bottom-3 sm:h-5"
        viewBox="0 0 220 18"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M4 13C50 2 142 2 216 11"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

function VideoProof({ proof, featured = false }: { proof: Proof; featured?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState(false)

  const togglePlay = async () => {
    const video = videoRef.current
    if (!video) return

    try {
      if (video.paused) {
        await video.play()
        setPlaying(true)
      } else {
        video.pause()
        setPlaying(false)
      }
    } catch {
      setError(true)
    }
  }

  if (error) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center bg-gradient-to-br from-[#0B1E38] to-[#132847] p-6 text-center">
        <div>
          <SvgIcon name="play" size={38} color="#39D97A" className="mx-auto mb-3" />
          <p className="text-sm font-bold text-white">Video preview unavailable</p>

          <a
            href={proof.image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#39D97A]"
          >
            Open video
            <SvgIcon name="arrow-diagonal" size={13} color="#39D97A" />
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <video
        ref={videoRef}
        src={proof.image_url}
        preload="metadata"
        playsInline
        muted
        controls={false}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setError(true)}
        className="h-full w-full object-cover transition duration-700 group-hover/card:scale-[1.03]"
      />

      <button
        type="button"
        onClick={togglePlay}
        className="absolute inset-0 z-10 flex items-center justify-center bg-[#060E1C]/10 transition hover:bg-[#060E1C]/20"
        aria-label={playing ? 'Pause video proof' : 'Play video proof'}
      >
        <span
          className={`flex items-center justify-center rounded-full border border-[#39D97A]/30 bg-[#06101F]/70 shadow-[0_0_40px_rgba(57,217,122,0.25)] backdrop-blur-xl transition hover:scale-105 ${
            featured ? 'h-16 w-16' : 'h-12 w-12'
          }`}
        >
          <SvgIcon
            name={playing ? 'pause' : 'play'}
            size={featured ? 28 : 20}
            color="#39D97A"
          />
        </span>
      </button>

      <div className="pointer-events-none absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/25 bg-[#06101F]/65 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#39D97A] backdrop-blur-xl">
        <SvgIcon name="play" size={14} color="#39D97A" />
        Video Proof
      </div>
    </div>
  )
}

function ImageProof({ proof }: { proof: Proof }) {
  return (
    <div className="relative h-full w-full">
      <img
        src={proof.image_url}
        alt={proof.title}
        className="h-full w-full object-cover transition duration-700 group-hover/card:scale-[1.03]"
      />

      <div className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/25 bg-[#06101F]/65 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#39D97A] backdrop-blur-xl">
        <SvgIcon name="image" size={14} color="#39D97A" />
        Screenshot Proof
      </div>
    </div>
  )
}

function ProofMedia({ proof, featured = false }: { proof: Proof; featured?: boolean }) {
  const isVideo = proof.media_type?.toLowerCase() === 'video'
  return isVideo ? <VideoProof proof={proof} featured={featured} /> : <ImageProof proof={proof} />
}

export default function ClientProofsSection() {
  const [proofs, setProofs] = useState<Proof[]>([])
  const [loading, setLoading] = useState(true)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    supabase
      .from('video_testimonials')
      .select('*')
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        setProofs(data || [])
        setLoading(false)
      })
  }, [])

  if (loading || proofs.length === 0) return null

  const featuredProof = proofs[0]
  const otherProofs = proofs.slice(1, 4)

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#060E1C] via-[#0B1E38] to-[#060E1C] py-14 text-white sm:py-16 lg:py-20">
      <div className="absolute inset-0 -z-0">
        <div className="absolute left-0 top-20 h-[300px] w-[400px] rounded-full bg-[#39D97A]/8 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-[260px] w-[340px] rounded-full bg-[#C6F135]/7 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.026)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="mb-10 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              viewport={{ once: true }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#39D97A] sm:text-[11px]"
            >
              <SvgIcon name="precision" size={14} color="#39D97A" />
              Real Client Evidence
            </motion.div>

            <h2 className="max-w-4xl text-4xl font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-5xl md:text-6xl">
              Real proof from
              <br />
              <CurvedUnderlineText>client conversations.</CurvedUnderlineText>
            </h2>

            <p className="mt-6 max-w-2xl text-sm leading-7 text-white/62 sm:text-base md:text-lg md:leading-8">
              Visual receipts from client feedback, project conversations, and results-driven work.
              These proof moments support the trust behind the Hbee Digitals process.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              { label: 'Verified Proofs', icon: 'verified' },
              { label: 'Client Messages', icon: 'message' },
              { label: 'Trust Signals', icon: 'security' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"
              >
                <SvgIcon name={item.icon} size={20} color="#39D97A" className="mb-3" />
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55 sm:text-xs">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <motion.article
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            viewport={{ once: true }}
            className="group/card relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#071427]/85 shadow-[0_30px_85px_rgba(0,0,0,0.3)] backdrop-blur-2xl sm:rounded-[2rem]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.12),transparent_36%),linear-gradient(135deg,rgba(57,217,122,0.07),rgba(198,241,53,0.025)_42%,rgba(6,14,28,0)_80%)]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#39D97A]/55 to-transparent" />

            <div className="relative h-[240px] overflow-hidden sm:h-[300px] lg:h-[360px]">
              <ProofMedia proof={featuredProof} featured />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#060E1C] via-transparent to-transparent" />
            </div>

            <div className="relative p-5 sm:p-6">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#39D97A]">
                Featured Proof
              </div>

              <h3 className="text-lg font-black leading-tight tracking-[-0.035em] text-white sm:text-xl md:text-2xl">
                {featuredProof.title}
              </h3>
            </div>
          </motion.article>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            {otherProofs.map((proof, index) => (
              <motion.article
                key={proof.id}
                initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.07 }}
                viewport={{ once: true }}
                className="group/card overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04] backdrop-blur-xl transition hover:border-[#39D97A]/25 hover:bg-white/[0.06]"
              >
                <div className="relative h-44 overflow-hidden sm:h-48 lg:h-40 xl:h-44">
                  <ProofMedia proof={proof} />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#060E1C] via-transparent to-transparent" />
                </div>

                <div className="relative p-4">
                  <h3 className="line-clamp-2 text-sm font-black leading-tight tracking-[-0.025em] text-white sm:text-base">
                    {proof.title}
                  </h3>

                  <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#39D97A]">
                    Verified Proof
                    <SvgIcon name="arrow-diagonal" size={13} color="#39D97A" />
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        {proofs.length > 4 && (
          <div className="mt-9 flex justify-center">
            <Link
              href="/portfolio"
              className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-bold text-white/80 backdrop-blur-xl transition hover:border-[#39D97A]/30 hover:bg-[#39D97A]/10 hover:text-white"
            >
              View More Results
              <SvgIcon name="arrow-diagonal" size={16} color="#39D97A" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
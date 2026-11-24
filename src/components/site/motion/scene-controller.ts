import { formatProgress, sceneProgress, shouldWriteProgress, type SceneRange } from './scene-progress'

/**
 * One scroll pipeline for every reversible scene on the page.
 *
 *  - A scene is registered once; its document position is measured then and re-measured only when its
 *    own size, the document size or the viewport changes (ResizeObserver / resize). Nothing is measured
 *    per frame: a frame reads scrollY and does arithmetic against cached numbers, then writes `--hb-p`.
 *  - Only scenes near the viewport are processed (IntersectionObserver); data-scene-active marks them so
 *    CSS can apply will-change only while a scene is in play.
 *  - One passive scroll listener is attached while at least one scene exists, and frames are rAF-throttled.
 *  - Reduced motion is authoritative: nothing registers, and any live scene is released to its final state.
 */

const QUERY = '(prefers-reduced-motion: reduce)'
const VAR = '--hb-p'

interface Scene {
  el: HTMLElement
  range: SceneRange
  docTop: number
  height: number
  last: number | null
  active: boolean
}

const scenes = new Map<HTMLElement, Scene>()
let io: IntersectionObserver | null = null
let ro: ResizeObserver | null = null
let frame = 0
let attached = false
let viewportHeight = 0
let documentHeight = 0
let media: MediaQueryList | null = null

function reducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches
}

function measure(scene: Scene) {
  const rect = scene.el.getBoundingClientRect()
  scene.docTop = rect.top + window.scrollY
  scene.height = rect.height
}

function measureViewport() {
  viewportHeight = window.innerHeight
  documentHeight = document.documentElement.scrollHeight
}

function write(scene: Scene, value: number) {
  scene.last = value
  scene.el.style.setProperty(VAR, formatProgress(value))
}

function update(scene: Scene, force = false) {
  const value = sceneProgress(
    scene,
    { scrollY: window.scrollY, viewportHeight, documentHeight },
    scene.range,
  )
  if (force || shouldWriteProgress(scene.last, value)) write(scene, value)
}

function tick() {
  frame = 0
  for (const scene of scenes.values()) if (scene.active) update(scene)
}

function schedule() {
  if (!frame) frame = window.requestAnimationFrame(tick)
}

function remeasureAll() {
  measureViewport()
  for (const scene of scenes.values()) {
    measure(scene)
    update(scene, true)
  }
}

let remeasureFrame = 0
function scheduleRemeasure() {
  if (remeasureFrame) return
  remeasureFrame = window.requestAnimationFrame(() => {
    remeasureFrame = 0
    remeasureAll()
  })
}

function attach() {
  if (attached) return
  attached = true
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', scheduleRemeasure, { passive: true })
  io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const scene = scenes.get(entry.target as HTMLElement)
        if (!scene) continue
        scene.active = entry.isIntersecting
        if (entry.isIntersecting) scene.el.setAttribute('data-scene-active', '')
        else scene.el.removeAttribute('data-scene-active')
        // A fast scroll can skip the active window entirely: always settle an inactive scene to the correct end.
        update(scene, true)
      }
    },
    { rootMargin: '25% 0px 25% 0px' },
  )
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(scheduleRemeasure)
    ro.observe(document.body)
  }
  media = window.matchMedia(QUERY)
  media.addEventListener('change', onPreference)
}

function detach() {
  if (!attached) return
  attached = false
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', scheduleRemeasure)
  io?.disconnect()
  ro?.disconnect()
  io = null
  ro = null
  media?.removeEventListener('change', onPreference)
  media = null
  if (frame) window.cancelAnimationFrame(frame)
  if (remeasureFrame) window.cancelAnimationFrame(remeasureFrame)
  frame = 0
  remeasureFrame = 0
}

/** Reduced motion switched on mid-session: release every scene to its static final state. */
function onPreference() {
  if (!reducedMotion()) return
  for (const scene of scenes.values()) release(scene)
  scenes.clear()
  detach()
}

function release(scene: Scene) {
  scene.el.style.removeProperty(VAR)
  scene.el.removeAttribute('data-scene-active')
  scene.el.setAttribute('data-scene-static', '')
}

/**
 * Register a scene. Returns a cleanup. Under reduced motion (or without IntersectionObserver) the scene is
 * marked static and the controller never starts: CSS renders the final state.
 */
export function registerScene(el: HTMLElement, range: SceneRange): () => void {
  if (reducedMotion() || typeof IntersectionObserver === 'undefined') {
    el.setAttribute('data-scene-static', '')
    return () => {}
  }
  el.removeAttribute('data-scene-static')
  attach()
  measureViewport()
  const scene: Scene = { el, range, docTop: 0, height: 0, last: null, active: false }
  measure(scene)
  scenes.set(el, scene)
  update(scene, true)
  io?.observe(el)
  ro?.observe(el)
  return () => {
    io?.unobserve(el)
    ro?.unobserve(el)
    scenes.delete(el)
    el.removeAttribute('data-scene-active')
    // Leave the last written value in place: the element is being removed or re-registered.
    if (scenes.size === 0) detach()
  }
}

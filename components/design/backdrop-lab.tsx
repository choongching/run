'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUp, Check, Copy, Link2, RotateCcw } from 'lucide-react'

import { FlipWord } from '@/components/home/flip-word'
import { Greeting } from '@/components/home/greeting'
import { JobRail } from '@/components/home/job-rail'
import {
  PLACEHOLDER_EXAMPLES,
  RESTING_PLACEHOLDER,
} from '@/components/home/prompt-composer'
import { Button } from '@/components/ui/button'
import { useTypedPlaceholder } from '@/lib/use-typed-placeholder'

// A bench for the home backdrop, not a page of the product.
//
// The picture behind the home composer has about a dozen numbers in it and no
// two of them are independent: raising the veil kills the grain, blurring the
// leaves lets you push the opacity, a green tint that looks right at full
// strength turns to sludge at half. Guessing one at a time through a code
// edit and a screenshot is the slow way to find the combination, and the
// founder's eye is the instrument that has to read it.
//
// So this is the same hero, at the same size, with the same components in it,
// and every number on a slider. Whatever it lands on prints as the CSS to
// paste, and the URL carries the settings, so a link is a decision.
//
// The route is dev-only (see the page beside this file). It is a tool, and
// tools that ship become surfaces nobody meant to support.

// ---------------------------------------------------------------------------

type Settings = {
  // The picture itself
  opacity: number
  blur: number
  saturate: number
  brightness: number
  contrast: number
  hue: number
  sepia: number
  grayscale: number
  zoom: number
  posX: number
  posY: number
  // The sheet of canvas colour over it
  veilToken: string
  veilAmount: number
  veilBlend: string
  // A colour cast, for turning the wall toward the brand
  tintToken: string
  tintAmount: number
  tintBlend: string
  // Treatments
  grain: number
  vignette: number
}

// What ships today, so the bench opens on the current answer rather than on
// somebody's idea of a neutral one.
const SHIPPED: Settings = {
  opacity: 100,
  blur: 0,
  saturate: 100,
  brightness: 100,
  contrast: 100,
  hue: 0,
  sepia: 0,
  grayscale: 0,
  zoom: 106,
  posX: 50,
  posY: 50,
  veilToken: 'sidebar',
  veilAmount: 22,
  veilBlend: 'normal',
  tintToken: 'primary',
  tintAmount: 0,
  tintBlend: 'soft-light',
  grain: 0,
  vignette: 0,
}

// Starting points worth arguing with, each one a different answer to "how
// much of the app should this picture be".
const PRESETS: { name: string; note: string; value: Settings }[] = [
  {
    name: 'As shipped',
    note: 'The photograph at full strength under a light sheet of canvas.',
    value: SHIPPED,
  },
  {
    name: 'Paper',
    note: 'Pulled most of the way back to the app canvas. The leaves are a suggestion.',
    value: {
      ...SHIPPED,
      opacity: 55,
      saturate: 70,
      brightness: 104,
      veilAmount: 46,
    },
  },
  {
    name: 'Deep',
    note: 'The brand green pushed through the wall with a soft-light cast.',
    value: {
      ...SHIPPED,
      saturate: 118,
      contrast: 104,
      tintAmount: 26,
      tintBlend: 'soft-light',
      veilAmount: 12,
    },
  },
  {
    name: 'Frosted',
    note: 'Out of focus, so the box floats over depth rather than over detail.',
    value: { ...SHIPPED, blur: 18, zoom: 118, veilAmount: 30, saturate: 92 },
  },
  {
    name: 'Quiet grain',
    note: 'Almost monochrome, with the wall texture carrying it instead of colour.',
    value: {
      ...SHIPPED,
      saturate: 22,
      brightness: 103,
      contrast: 104,
      grain: 26,
      veilAmount: 30,
    },
  },
  {
    name: 'Vignette',
    note: 'Darkened at the corners, which lifts the centre where the box sits.',
    value: { ...SHIPPED, vignette: 34, veilAmount: 16, saturate: 106 },
  },
]

const TOKENS = [
  { id: 'sidebar', label: 'Canvas (warm paper)' },
  { id: 'background', label: 'Card white' },
  { id: 'primary', label: 'Brand green' },
  { id: 'foreground', label: 'Ink' },
  { id: 'muted', label: 'Muted' },
]

// Only the modes that do something legible over a pale photograph. The full
// list is longer and most of it is indistinguishable here.
const BLENDS = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'soft-light',
  'hard-light',
  'color',
  'luminosity',
  'hue',
  'saturation',
]

// A grain plate. feTurbulence rather than a noise image: it costs no request,
// scales to any screen, and the alpha is the only thing that has to change.
// Two things had to be true before it textured instead of fogging. The noise
// is desaturated, because raw fractal noise is COLOURED static and laying that
// over a green wall pulls the colour straight out of it. And the plate is
// opaque mid grey with the noise on top, because overlay leaves mid grey
// alone: a semi transparent plate averages lighter than that, so the slider
// was really washing the picture out. Now it moves the light and dark and
// leaves the hue where it was.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='180' height='180' fill='%23808080'/%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.42'/%3E%3C/svg%3E\")"

const LAB_CSS = `
.run-lab-shot { transform: scale(var(--lab-zoom, 1.06)); }
`

// ---------------------------------------------------------------------------

function filterCss(s: Settings) {
  const parts = [
    s.blur ? `blur(${s.blur}px)` : '',
    s.saturate !== 100 ? `saturate(${s.saturate}%)` : '',
    s.brightness !== 100 ? `brightness(${s.brightness}%)` : '',
    s.contrast !== 100 ? `contrast(${s.contrast}%)` : '',
    s.hue ? `hue-rotate(${s.hue}deg)` : '',
    s.sepia ? `sepia(${s.sepia}%)` : '',
    s.grayscale ? `grayscale(${s.grayscale}%)` : '',
  ].filter(Boolean)
  return parts.length ? parts.join(' ') : 'none'
}

function mix(token: string, amount: number) {
  return `color-mix(in oklch, var(--${token}) ${amount}%, transparent)`
}

// What to paste back into the app. Printed rather than described, because a
// number read off a slider and retyped by hand is a number that arrives wrong.
function cssFor(s: Settings) {
  const lines = [
    '/* app/globals.css */',
    '.run-backdrop {',
    `  transform: scale(${(s.zoom / 100).toFixed(2)});`,
    `  object-position: ${s.posX}% ${s.posY}%;`,
    s.opacity !== 100 ? `  opacity: ${(s.opacity / 100).toFixed(2)};` : null,
    filterCss(s) !== 'none' ? `  filter: ${filterCss(s)};` : null,
    '}',
    '.run-backdrop-veil {',
    `  background: ${mix(s.veilToken, s.veilAmount)};`,
    s.veilBlend !== 'normal' ? `  mix-blend-mode: ${s.veilBlend};` : null,
    '}',
  ].filter((l): l is string => l !== null)

  if (s.tintAmount > 0) {
    lines.push(
      '.run-backdrop-tint {',
      `  background: ${mix(s.tintToken, s.tintAmount)};`,
      `  mix-blend-mode: ${s.tintBlend};`,
      '}'
    )
  }
  if (s.grain > 0) {
    lines.push(
      '.run-backdrop-grain {',
      `  background-image: ${GRAIN};`,
      '  background-size: 180px 180px;',
      '  mix-blend-mode: overlay;',
      `  opacity: ${(s.grain / 100).toFixed(2)};`,
      '}'
    )
  }
  if (s.vignette > 0) {
    lines.push(
      '.run-backdrop-vignette {',
      `  background: radial-gradient(120% 90% at 50% 45%, transparent 42%, color-mix(in oklch, var(--foreground) ${s.vignette}%, transparent) 100%);`,
      '}'
    )
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------

export function BackdropLab({ name }: { name: string }) {
  const [s, setS] = useState<Settings>(SHIPPED)
  const [panel, setPanel] = useState(true)
  const [copied, setCopied] = useState<'css' | 'link' | null>(null)

  const set = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) =>
      setS((prev) => ({ ...prev, [key]: value })),
    []
  )

  // The URL is the save file. Read it on mount and again whenever the hash
  // changes, so sending someone the link sends them the settings, and so does
  // pasting one into a tab that is already here. Without the listener that
  // second case silently does nothing: the browser treats a hash-only address
  // as a scroll, not a navigation, and the page you are looking at is the one
  // you had before. It cost me a round of chasing a colour bug that was only
  // ever the previous preset still on screen.
  useEffect(() => {
    const read = () => {
      const raw = window.location.hash.slice(1)
      if (!raw) return
      try {
        setS({ ...SHIPPED, ...JSON.parse(decodeURIComponent(raw)) })
      } catch {
        // A hand-edited hash is not worth an error state on a bench.
      }
    }
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])

  useEffect(() => {
    const hash = encodeURIComponent(JSON.stringify(s))
    window.history.replaceState(null, '', `#${hash}`)
  }, [s])

  const copy = useCallback(async (what: 'css' | 'link', text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(what)
  }, [])

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(null), 1600)
    return () => clearTimeout(t)
  }, [copied])

  const css = useMemo(() => cssFor(s), [s])

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <HeroStage settings={s} name={name} />

      {panel ? (
        <Panel
          s={s}
          set={set}
          css={css}
          copied={copied}
          onCopyCss={() => copy('css', css)}
          onCopyLink={() => copy('link', window.location.href)}
          onReset={() => setS(SHIPPED)}
          onPreset={(v) => setS(v)}
          onHide={() => setPanel(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setPanel(true)}
          className="absolute right-4 bottom-4 z-30 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium shadow-md"
        >
          Show controls
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// The stage: the home hero, at its real size, with the real components in it.
// The composer is the one thing rebuilt rather than imported, because the real
// one is a form wired to an action that creates an agent, and a tuning bench
// should not be able to spend a run.

function HeroStage({
  settings: s,
  name,
}: {
  settings: Settings
  name: string
}) {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden rounded-shell px-4 py-16 sm:px-6 md:px-8">
      {/* The bench's own CSS lives here rather than in globals.css, so globals
          never carries a rule the product does not use. */}
      <style>{LAB_CSS}</style>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-shell"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- the bench points at the same static file the app does */}
        <img
          src="/home-backdrop-2200.webp"
          alt=""
          className="run-lab-shot absolute inset-0 size-full object-cover"
          style={
            {
              opacity: s.opacity / 100,
              filter: filterCss(s),
              objectPosition: `${s.posX}% ${s.posY}%`,
              '--lab-zoom': (s.zoom / 100).toFixed(3),
            } as React.CSSProperties
          }
        />
        <span
          className="absolute inset-0"
          style={{
            background: mix(s.veilToken, s.veilAmount),
            mixBlendMode: s.veilBlend as React.CSSProperties['mixBlendMode'],
          }}
        />
        {s.tintAmount > 0 && (
          <span
            className="absolute inset-0"
            style={{
              background: mix(s.tintToken, s.tintAmount),
              mixBlendMode: s.tintBlend as React.CSSProperties['mixBlendMode'],
            }}
          />
        )}
        {s.grain > 0 && (
          <span
            className="absolute inset-0"
            style={{
              backgroundImage: GRAIN,
              backgroundSize: '180px 180px',
              opacity: s.grain / 100,
              // Overlay rather than a plain layer. Grey noise laid straight on
              // top fogs the picture toward grey as it gets stronger, so the
              // slider was really a desaturate control wearing a hat; overlay
              // keeps the hue and moves only the light and dark.
              mixBlendMode: 'overlay',
            }}
          />
        )}
        {s.vignette > 0 && (
          <span
            className="absolute inset-0"
            style={{
              background: `radial-gradient(120% 90% at 50% 45%, transparent 42%, color-mix(in oklch, var(--foreground) ${s.vignette}%, transparent) 100%)`,
            }}
          />
        )}
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center">
        <Greeting name={name} />
        <h1 className="mb-6 text-balance text-[24px]/8 font-semibold tracking-tight sm:text-[28px]/9 md:text-[33px]/10">
          Put an agent on your{' '}
          <FlipWord words={['inbox.', 'drafts.', 'reading.', 'research.']} />
        </h1>
        <MockComposer />
      </div>
    </div>
  )
}

function MockComposer() {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const idle = !focused && value.length === 0
  const placeholder = useTypedPlaceholder({
    examples: PLACEHOLDER_EXAMPLES,
    resting: RESTING_PLACEHOLDER,
    active: idle,
  })

  return (
    <div className="w-full">
      <div
        className="run-sheen run-focus-fade relative rounded-[9px] border border-input bg-card focus-within:border-ring focus-within:shadow-focus"
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label="Describe what you need done"
          placeholder={placeholder}
          className="w-full resize-none bg-transparent px-5 pt-4 text-base outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-end px-3.5 pb-3.5">
          <Button
            type="button"
            disabled
            aria-label="Build agent"
            className="size-11 px-0 md:h-9.5 md:w-auto md:px-4.5 md:text-[15px]"
          >
            <span className="max-md:hidden">Build my agent</span>
            <ArrowUp className="size-5 md:size-4" />
          </Button>
        </div>
      </div>
      <JobRail onPick={() => {}} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// The controls.

function Panel({
  s,
  set,
  css,
  copied,
  onCopyCss,
  onCopyLink,
  onReset,
  onPreset,
  onHide,
}: {
  s: Settings
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  css: string
  copied: 'css' | 'link' | null
  onCopyCss: () => void
  onCopyLink: () => void
  onReset: () => void
  onPreset: (v: Settings) => void
  onHide: () => void
}) {
  return (
    <div className="absolute right-4 bottom-4 z-30 flex max-h-[86%] w-[330px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-md">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <span className="text-sm font-medium">Backdrop</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onReset}
            title="Back to what ships today"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onHide}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Hide
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto p-3.5">
        <Group label="Start from">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => onPreset(p.value)}
                title={p.note}
                className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {p.name}
              </button>
            ))}
          </div>
        </Group>

        <Group label="The picture">
          <Slider
            label="Opacity"
            value={s.opacity}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => set('opacity', v)}
          />
          <Slider
            label="Blur"
            value={s.blur}
            min={0}
            max={40}
            unit="px"
            onChange={(v) => set('blur', v)}
          />
          <Slider
            label="Zoom"
            value={s.zoom}
            min={100}
            max={160}
            unit="%"
            onChange={(v) => set('zoom', v)}
          />
          <Slider
            label="Position X"
            value={s.posX}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => set('posX', v)}
          />
          <Slider
            label="Position Y"
            value={s.posY}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => set('posY', v)}
          />
        </Group>

        <Group label="Colour treatment">
          <Slider
            label="Saturation"
            value={s.saturate}
            min={0}
            max={200}
            unit="%"
            onChange={(v) => set('saturate', v)}
          />
          <Slider
            label="Brightness"
            value={s.brightness}
            min={60}
            max={140}
            unit="%"
            onChange={(v) => set('brightness', v)}
          />
          <Slider
            label="Contrast"
            value={s.contrast}
            min={60}
            max={160}
            unit="%"
            onChange={(v) => set('contrast', v)}
          />
          <Slider
            label="Hue shift"
            value={s.hue}
            min={-60}
            max={60}
            unit="deg"
            onChange={(v) => set('hue', v)}
          />
          <Slider
            label="Sepia"
            value={s.sepia}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => set('sepia', v)}
          />
          <Slider
            label="Grayscale"
            value={s.grayscale}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => set('grayscale', v)}
          />
        </Group>

        <Group label="Veil (a sheet of app colour over the picture)">
          <Choice
            label="Colour"
            value={s.veilToken}
            options={TOKENS.map((t) => [t.id, t.label])}
            onChange={(v) => set('veilToken', v)}
          />
          <Slider
            label="Amount"
            value={s.veilAmount}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => set('veilAmount', v)}
          />
          <Choice
            label="Blend"
            value={s.veilBlend}
            options={BLENDS.map((b) => [b, b])}
            onChange={(v) => set('veilBlend', v)}
          />
        </Group>

        <Group label="Tint (a colour cast, for pulling it toward the brand)">
          <Choice
            label="Colour"
            value={s.tintToken}
            options={TOKENS.map((t) => [t.id, t.label])}
            onChange={(v) => set('tintToken', v)}
          />
          <Slider
            label="Amount"
            value={s.tintAmount}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => set('tintAmount', v)}
          />
          <Choice
            label="Blend"
            value={s.tintBlend}
            options={BLENDS.map((b) => [b, b])}
            onChange={(v) => set('tintBlend', v)}
          />
        </Group>

        <Group label="Surface">
          <Slider
            label="Grain"
            value={s.grain}
            min={0}
            max={80}
            unit="%"
            onChange={(v) => set('grain', v)}
          />
          <Slider
            label="Vignette"
            value={s.vignette}
            min={0}
            max={70}
            unit="%"
            onChange={(v) => set('vignette', v)}
          />
        </Group>

        <Group label="What you landed on">
          <pre className="max-h-44 overflow-auto rounded-lg border border-border bg-muted/60 p-2.5 text-[11px]/4 text-muted-foreground">
            {css}
          </pre>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onCopyCss}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-2.5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              {copied === 'css' ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copied === 'css' ? 'Copied' : 'Copy CSS'}
            </button>
            <button
              type="button"
              onClick={onCopyLink}
              title="The link carries the settings"
              className="flex items-center justify-center gap-1.5 rounded-md border border-border px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {copied === 'link' ? (
                <Check className="size-3.5" />
              ) : (
                <Link2 className="size-3.5" />
              )}
              Link
            </button>
          </div>
        </Group>
      </div>
    </div>
  )
}

function Group({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
      />
    </label>
  )
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: [string, string][]
  onChange: (v: string) => void
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
      >
        {options.map(([id, text]) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )
}

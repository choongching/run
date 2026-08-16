'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// A time picker and a date picker for the schedule editor.
//
// Both replace a native input. The browser's own pickers work, but they are
// the browser's: their own type, their own height, their own blue, and on
// this screen they sat beside our controls looking like something pasted in.
// These wear the SelectTrigger's exact shape, so a row of controls reads as
// one row.
//
// The trigger height is the app's one control height (h-8 on a desktop,
// h-11 on a phone for the tap floor), taken from the Input and SelectTrigger
// primitives rather than reinvented here.

const triggerClass =
  'flex h-11 w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-base whitespace-nowrap run-focus-fade outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/10 md:h-8 md:text-sm dark:bg-input/30'

const optionClass =
  'flex h-8 w-full items-center justify-center rounded-md text-sm tabular-nums run-focus-fade outline-none'

function optionTone(selected: boolean): string {
  return selected
    ? 'bg-primary text-primary-foreground'
    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
}

// Keep the chosen row in view when the popover opens, without a ref read
// during render: the callback runs on mount and positions its own column.
function scrollToIndex(el: HTMLDivElement | null, index: number) {
  if (el) el.scrollTop = Math.max(0, index * 32 - 64)
}

export function timeLabel(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${String(minute).padStart(2, '0')}${hour < 12 ? 'am' : 'pm'}`
}

// Minutes in fives. Fine enough for any schedule a person asks for out loud,
// and short enough to read; an odd minute set from the chat keeps its place
// in the list rather than disappearing from it.
function minuteOptions(minute: number): number[] {
  const fives = Array.from({ length: 12 }, (_, i) => i * 5)
  return fives.includes(minute) ? fives : [...fives, minute].sort((a, b) => a - b)
}

export function TimePicker({
  hour,
  minute,
  onChange,
}: {
  hour: number
  minute: number
  onChange: (hour: number, minute: number) => void
}) {
  const [open, setOpen] = useState(false)
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  const isPm = hour >= 12
  const minutes = minuteOptions(minute)

  function setHour12(h: number) {
    onChange((h % 12) + (isPm ? 12 : 0), minute)
  }
  function setHalf(pm: boolean) {
    onChange((hour % 12) + (pm ? 12 : 0), minute)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button type="button" aria-label="Time of day" className={triggerClass} />
        }
      >
        <span className="tabular-nums">{timeLabel(hour, minute)}</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-0 p-1.5">
        <div className="flex gap-1">
          <div
            ref={(el) => scrollToIndex(el, hour12 - 1)}
            className="h-52 w-14 overflow-y-auto"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
              <button
                key={h}
                type="button"
                aria-pressed={h === hour12}
                onClick={() => setHour12(h)}
                className={`${optionClass} ${optionTone(h === hour12)}`}
              >
                {h}
              </button>
            ))}
          </div>
          <div
            ref={(el) => scrollToIndex(el, minutes.indexOf(minute))}
            className="h-52 w-14 overflow-y-auto"
          >
            {minutes.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={m === minute}
                onClick={() => onChange(hour, m)}
                className={`${optionClass} ${optionTone(m === minute)}`}
              >
                {String(m).padStart(2, '0')}
              </button>
            ))}
          </div>
          <div className="flex h-52 w-14 flex-col gap-0.5">
            <button
              type="button"
              aria-pressed={!isPm}
              onClick={() => setHalf(false)}
              className={`${optionClass} ${optionTone(!isPm)}`}
            >
              AM
            </button>
            <button
              type="button"
              aria-pressed={isPm}
              onClick={() => setHalf(true)}
              className={`${optionClass} ${optionTone(isPm)}`}
            >
              PM
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// YYYY-MM-DD in and out, read as a local calendar date. Never through
// toISOString, which is a UTC instant and turns the 1st into the 31st for
// anyone west of Greenwich.
function toDate(iso: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return undefined
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

export function dateLabel(iso: string): string {
  const date = toDate(iso)
  if (!date) return iso
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function DatePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (iso: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = toDate(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="The date the schedule counts from"
            className={triggerClass}
          />
        }
      >
        <span className="tabular-nums">{dateLabel(value)}</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-0 p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          autoFocus
          onSelect={(date) => {
            if (!date) return
            onChange(toIso(date))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

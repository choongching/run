'use client'

import { useState } from 'react'
import {
  Check,
  Ellipsis,
  FileText,
  Loader2,
  Paperclip,
  Upload,
} from 'lucide-react'

import {
  AgentsIcon,
  ConnectorsIcon,
  KnowledgeIcon,
  RoutinesIcon,
  SettingsIcon,
} from '@/components/nav-icons'
import {
  EmptyBox,
  Row,
  RowBox,
  RowTile,
  SectionCard,
  SectionCount,
} from '@/components/section-card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { HelpTip } from '@/components/ui/help-tip'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { TruncatedLabel } from '@/components/ui/truncated-label'

// The library's vocabulary. An Entry is one component, fully explained: the
// name, where it lives, what it is for, when to reach for it (and when not),
// and how to use it. The specimens under it are the REAL component with the
// REAL recipe classes; nothing on this page is a picture of a component.
// Every "when" line here is a rule from the styleguide or one earned in this
// repo; if an Entry and the styleguide ever disagree, one of them is a bug.

function Entry({
  name,
  path,
  use,
  when,
  how,
  children,
}: {
  name: string
  path: string
  use: string
  when: string
  how: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-sm font-semibold">{name}</h3>
          <span className="font-mono text-xs text-muted-foreground">
            {path}
          </span>
        </div>
        <dl className="mt-2 flex flex-col gap-1 text-xs">
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 font-medium text-muted-foreground">
              Use for
            </dt>
            <dd className="text-muted-foreground">{use}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 font-medium text-muted-foreground">
              When
            </dt>
            <dd className="text-muted-foreground">{when}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 font-medium text-muted-foreground">
              How
            </dt>
            <dd className="text-muted-foreground">{how}</dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-col gap-4 px-4 py-4">{children}</div>
    </div>
  )
}

// One state of the component, labelled in mono so the page doubles as a
// reference card.
function Specimen({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-9 flex-wrap items-center gap-3">
        {children}
      </div>
      <p className="font-mono text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

// ---------- foundations ----------

const COLOR_TOKENS = [
  'background',
  'foreground',
  'card',
  'muted',
  'muted-foreground',
  'border',
  'primary',
  'secondary',
  'destructive',
  'sidebar',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
] as const

function FoundationsSection() {
  return (
    <SectionCard title="Foundations" className="mb-5">
      <div className="flex flex-col gap-4">
        <Entry
          name="Color tokens"
          path="app/globals.css"
          use="Every color in the app. A component names a token, never a value."
          when="Always. A hex or oklch value outside globals.css is a bug, and a token without a line in the .dark block is half a token."
          how="Tailwind utilities carry them: bg-card, text-muted-foreground, border-border. Meters use bg-border for the rail and bg-foreground/70 for the fill, because bg-muted vanishes against the sidebar."
        >
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {COLOR_TOKENS.map((t) => (
              <div key={t} className="flex flex-col gap-1.5">
                <span
                  className="h-10 rounded-md border border-border"
                  style={{ background: `var(--${t})` }}
                />
                <span className="font-mono text-xs text-muted-foreground">
                  {t}
                </span>
              </div>
            ))}
          </div>
        </Entry>
        <Entry
          name="Typography"
          path="docs/styleguide.md §3"
          use="One family (Geist), one body size, a short ladder above it."
          when="Body is text-sm and is never retuned; 24px (text-2xl) is the page maximum. The home hero and the chat surface are the two sanctioned exceptions, and a whole surface rescales through a scope class overriding the --text-* variables, never by editing utilities."
          how="Page title text-2xl font-semibold; subtitle text-base text-muted-foreground; detail lines text-xs with middle dots. Weights: 500 for labels and active states, 600 for titles, 700 rarely."
        >
          <Specimen label="text-2xl font-semibold (page title, the cap)">
            <span className="text-2xl font-semibold">Knowledge</span>
          </Specimen>
          <Specimen label="text-base text-muted-foreground (page subtitle)">
            <span className="text-base text-muted-foreground">
              What your agents always know.
            </span>
          </Specimen>
          <Specimen label="text-sm (body, 14/20)">
            <span className="text-sm">
              Reads are free. Anything that changes something needs your
              approval.
            </span>
          </Specimen>
          <Specimen label="text-xs text-muted-foreground (detail line)">
            <span className="text-xs text-muted-foreground">
              Document · 12 KB · Updated yesterday
            </span>
          </Specimen>
        </Entry>
        <Entry
          name="Radii"
          path="app/globals.css (@theme inline)"
          use="Corners between 4 and 6px, everywhere."
          when="rounded-lg on buttons, inputs and menu items; rounded-md on badges and tiles; rounded-xl on cards (renders 6px). Never raw rounded-[Npx]; rounded-full only on true circles. The landing page runs its own one-step-up ladder and is the one sanctioned departure."
          how="The scale is @theme inline, so utilities compile to values: a scoped token override does nothing here. To change a scope's radii you scope the utility classes themselves, the way landing.css does."
        >
          <div className="flex flex-wrap items-end gap-4">
            {(
              [
                ['rounded-sm', '4px'],
                ['rounded-md', '5px'],
                ['rounded-lg', '6px'],
                ['rounded-xl', '6px, cards'],
              ] as const
            ).map(([cls, note]) => (
              <div key={cls} className="flex flex-col items-start gap-1.5">
                <span
                  className={`size-12 border border-border bg-muted ${cls}`}
                />
                <span className="font-mono text-xs text-muted-foreground">
                  {cls}
                </span>
                <span className="text-xs text-muted-foreground">{note}</span>
              </div>
            ))}
          </div>
        </Entry>
        <Entry
          name="Nav icons"
          path="components/nav-icons.tsx"
          use="The app's five destination icons, re-exported once so every use agrees."
          when="Anywhere a destination is named. Add or swap icons in that file, never inline a new icon style in a page. Icons are monochrome Lucide only."
          how="size-4.5 stroke-[1.75] in the nav, size-4 in dense contexts. Tint muted at rest, full ink on hover or active, via stacked [&_svg] variants."
        >
          <div className="flex flex-wrap gap-5">
            {(
              [
                ['AgentsIcon', AgentsIcon],
                ['ConnectorsIcon', ConnectorsIcon],
                ['KnowledgeIcon', KnowledgeIcon],
                ['RoutinesIcon', RoutinesIcon],
                ['SettingsIcon', SettingsIcon],
              ] as const
            ).map(([name, Icon]) => (
              <div key={name} className="flex flex-col items-center gap-1.5">
                <Icon className="size-4.5 stroke-[1.75] text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </Entry>
      </div>
    </SectionCard>
  )
}

// ---------- controls ----------

function ControlsSection() {
  return (
    <SectionCard title="Controls" className="mb-5">
      <div className="flex flex-col gap-4">
        <Entry
          name="Button"
          path="components/ui/button.tsx"
          use="One action the person takes, named with a verb."
          when="default for the surface's primary action; outline for the safe exit beside it; ghost for row and toolbar actions; destructive only when something is deleted. To make a control recede, drop its outline before its size: a border competes at any scale."
          how="Pick variant and size, never restyle with one-off classes. asChild is not supported here; a link that looks like a button is a Link wearing buttonVariants(). A working action keeps its button mounted and disabled with the spinner where the icon was, so the row never resizes under the pointer."
        >
          <Specimen label="variant: default · outline · secondary · ghost · destructive">
            <Button>Create</Button>
            <Button variant="outline">Cancel</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Delete</Button>
          </Specimen>
          <Specimen label="size: sm · default · icon-sm">
            <Button size="sm">Save changes</Button>
            <Button>Save changes</Button>
            <Button variant="ghost" size="icon-sm" aria-label="Actions">
              <Ellipsis className="size-4" />
            </Button>
          </Specimen>
          <Specimen label="disabled · spinner inside the button it replaces">
            <Button disabled>Save changes</Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled
              aria-label="Working"
            >
              <Loader2 className="size-4 animate-spin" />
            </Button>
          </Specimen>
        </Entry>
        <Entry
          name="Input & Textarea"
          path="components/ui/input.tsx · textarea.tsx"
          use="Free text, one line or many."
          when="Fields in a form section sit directly on the card, never in a RowBox: a hairline between two inputs reads as a table of inputs. Inputs are 16px on mobile (the primitive carries it) or iOS zooms on focus."
          how="Pair with Label; a fact about the machinery that nobody can deduce gets a HelpTip beside the label, never a prompting tip."
        >
          <div className="flex max-w-md flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="lib-input">
                Name
                <HelpTip>
                  A HelpTip states a fact about the machinery. It never coaches
                  prompt writing.
                </HelpTip>
              </Label>
              <Input id="lib-input" placeholder="Morning Inbox Triage" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lib-textarea">Instructions</Label>
              <Textarea
                id="lib-textarea"
                placeholder="Read my inbox each morning and tell me what needs a reply."
              />
            </div>
          </div>
        </Entry>
        <Entry
          name="Select"
          path="components/ui/select.tsx"
          use="One choice from a short, known list."
          when="Bounded choices with more options than fit as radios. For two or three visible choices that benefit from descriptions, use pressed buttons the way the model picker does."
          how="SelectTrigger + SelectValue, items in SelectContent. The routine pickers wear this trigger's exact shape so a row of mixed controls reads as one family."
        >
          <Specimen label="Select, defaultValue">
            <Select defaultValue="daily">
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Every weekday</SelectItem>
                <SelectItem value="weekly">Once a week</SelectItem>
              </SelectContent>
            </Select>
          </Specimen>
        </Entry>
        <Entry
          name="Switch"
          path="components/ui/switch.tsx"
          use="An on/off that commits the moment it is clicked."
          when="Only for settings that are safe to flip instantly, with no Save button and no dirty state: Telegram delivery is the precedent, because half-committed pairing is worse than instant commit. A choice that belongs to a form is not a switch."
          how="Always give it an aria-label naming the thing it switches."
        >
          <Specimen label="checked · unchecked">
            <Switch defaultChecked aria-label="Send reports to Telegram" />
            <Switch aria-label="Send reports to Telegram" />
          </Specimen>
        </Entry>
      </div>
    </SectionCard>
  )
}

// ---------- overlays ----------

function OverlaysSection() {
  const [dialogOpen, setDialogOpen] = useState(false)
  return (
    <SectionCard title="Overlays" className="mb-5">
      <div className="flex flex-col gap-4">
        <Entry
          name="Tooltip"
          path="components/ui/tooltip.tsx"
          use="One dark line naming an icon's action or a control's consequence."
          when="Icon-only controls always carry one. Content is the action or the consequence, once, no period. A hover-only affordance is a phone-only omission: say so where you use it. For anything richer than one line, hand-roll a hover card instead."
          how="TooltipProvider delay={300}, TooltipTrigger render={<Button .../>}. One element cannot be two base-nova triggers: to put a tooltip on a DialogTrigger, control the dialog with state and let the tooltip own the button."
        >
          <Specimen label="icon control + tooltip">
            <TooltipProvider delay={300}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Attach"
                    />
                  }
                >
                  <Paperclip className="size-4" />
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  Attach a file
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Specimen>
        </Entry>
        <Entry
          name="DropdownMenu"
          path="components/ui/dropdown-menu.tsx"
          use="The overflow actions behind a row's kebab."
          when="The row itself is the door to the record; the kebab holds what does not fit on the row. Destructive items are labelled words, never a bare red icon near Save."
          how="Trigger via render prop. The content sizes to itself, min-w-[max(8rem,anchor)]: never patch a width locally, that smell means the primitive is wrong. Stop click propagation so the menu does not open the row."
        >
          <Specimen label="kebab menu">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" aria-label="Actions" />
                }
              >
                <Ellipsis className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>Rename</DropdownMenuItem>
                <DropdownMenuItem>Use only where attached</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Specimen>
        </Entry>
        <Entry
          name="Dialog"
          path="components/ui/dialog.tsx"
          use="One record or one confirmation, centred over the page."
          when="A record opens in a dialog, not a side drawer: the founder picked the centred card after seeing both. Below md it becomes a full-screen takeover (inset-0, h-svh, centring transform reset)."
          how="Seed form state in an inner body keyed by the record id, so reopening re-seeds fresh without effects. Keep the selected record in state after close (open drives visibility alone) so the exit animation has content."
        >
          <Specimen label="record dialog">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger render={<Button variant="outline" />}>
                Open a record
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>A record</DialogTitle>
                  <DialogDescription>
                    The keyed inner body re-seeds its state each open; the
                    record survives close for the exit animation.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Specimen>
        </Entry>
        <Entry
          name="HelpTip"
          path="components/ui/help-tip.tsx"
          use="The one help affordance: a small circled question mark carrying a fact."
          when="Only for facts about Run's machinery nobody can deduce by looking ('your setup answers are added underneath what you type'). Never to coach prompt writing, and never invent a second help affordance."
          how="Sits inline beside the label of the thing it explains."
        >
          <Specimen label="label + HelpTip">
            <span className="flex items-center text-sm font-medium">
              Instructions
              <HelpTip>
                Run adds your setup answers underneath what you write here.
              </HelpTip>
            </span>
          </Specimen>
        </Entry>
        <Entry
          name="Skeleton & TruncatedLabel"
          path="components/ui/skeleton.tsx · truncated-label.tsx"
          use="Waiting, and names that outgrow their slot."
          when="Loading and empty share one min-height box so the surface never jumps when the answer arrives. TruncatedLabel reveals the full name on hover only when something is actually hidden."
          how="Skeleton bars roughly the shape of the answer. TruncatedLabel takes text and a max-width class."
        >
          <Specimen label="Skeleton">
            <div className="flex w-56 flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </Specimen>
          <Specimen label="TruncatedLabel (hover it)">
            <span className="flex max-w-40 text-sm">
              <TruncatedLabel
                text="A very long agent name that cannot fit here"
                className="max-w-40"
              />
            </span>
          </Specimen>
        </Entry>
      </div>
    </SectionCard>
  )
}

// ---------- the page shape ----------

function ContainersSection() {
  return (
    <SectionCard
      title={
        <>
          The page shape
          <SectionCount>7a</SectionCount>
        </>
      }
      className="mb-5"
    >
      <div className="flex flex-col gap-4">
        <Entry
          name="PageShell & PageHeader"
          path="components/page-shell.tsx · page-header.tsx"
          use="The one centred column every standard page lives in, and its title."
          when="Every page except chat, which owns its layout. Never give a page or a card its own width cap: two caps on one page is how Settings got mismatched edges. The route's loading.tsx wraps in the same shell."
          how="PageShell wraps header and body; PageHeader takes title, description, and an optional trailing action. This page you are reading sits in one."
        >
          <Specimen label="you are inside one now">
            <span className="text-xs text-muted-foreground">
              max-w-thread, px-4 on a phone, md:p-8, run-settle entrance.
            </span>
          </Specimen>
        </Entry>
        <Entry
          name="SectionCard & SectionCount"
          path="components/section-card.tsx"
          use="A page is a stack of these; each one holds one section under one heading."
          when="Every section of every standard page. The card says nothing beyond its heading: supporting prose was cut app-wide on 2026-08-25. Never hand-roll rounded-xl border bg-card, and never use a raw shadcn Card (its ring made Settings the odd page out; the primitive is deleted)."
          how="title takes text or a fragment with SectionCount for a tally. Lists go in a RowBox inside; form fields sit directly on the card."
        >
          <Specimen label="SectionCount beside a heading">
            <span className="flex items-baseline text-sm font-medium">
              Sources
              <SectionCount>4</SectionCount>
            </span>
          </Specimen>
        </Entry>
        <Entry
          name="RowBox, Row & RowTile"
          path="components/section-card.tsx"
          use="The list inside a card: one bordered box, hairlines between rows."
          when="Any list of records. Never hand-roll a row: Knowledge and Routines both did and both drifted within a week. The detail line carries what the thing is (kind, size, when), middle dots between; the trailing edge carries state that lines up down the list plus the kebab; nothing floats between them. All rows clickable or none."
          how="RowBox list renders a ul; Row item renders the li. lead takes a RowTile (size-10 with a size-5 icon when the row has two lines), title takes the name plus an optional status chip, trailing stops click propagation."
        >
          <RowBox list>
            <Row
              item
              lead={
                <RowTile>
                  <FileText className="size-5" />
                </RowTile>
              }
              title={
                <>
                  <span className="truncate">Voice guide</span>
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <Check className="size-3" />
                    Attached
                  </span>
                </>
              }
              detail="Document · 12 KB · Updated yesterday"
              trailing={
                <Button variant="ghost" size="icon-sm" aria-label="Actions">
                  <Ellipsis className="size-4" />
                </Button>
              }
            />
            <Row
              item
              lead={
                <RowTile>
                  <KnowledgeIcon className="size-5" />
                </RowTile>
              }
              title={<span className="truncate">Pricing facts</span>}
              detail="Note · Added last week"
              trailing={
                <Button variant="ghost" size="icon-sm" aria-label="Actions">
                  <Ellipsis className="size-4" />
                </Button>
              }
            />
          </RowBox>
        </Entry>
        <Entry
          name="Status chip"
          path="recipe (styleguide §7)"
          use="A state of the thing, sitting beside its title."
          when="Beside the title, never under it: a chip is a state, not a second line. In history lists, status speaks only for the exception: no 'Done' on every finished row. One icon, colour carries the state: the same Check in text-primary (on) or muted (off), tooltip holds the word."
          how="flex items-center gap-2 on the title row; chip is text-xs text-primary with a Check size-3."
        >
          <Specimen label="on · off">
            <span className="flex items-center gap-1 text-xs text-primary">
              <Check className="size-3" />
              Connected
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground/40">
              <Check className="size-3" />
              Off
            </span>
          </Specimen>
        </Entry>
        <Entry
          name="EmptyBox & empty states"
          path="components/section-card.tsx · recipe (styleguide §7)"
          use="Nothing here yet, said in the slot the rows would fill."
          when="Empty states are dashed boxes app-wide, never a floating sentence, and never instead of the card: the box fills the rows' slot so the page keeps its shape. The body carries the action only; what the thing is belongs to the page subtitle."
          how="EmptyBox inside a card (icon, title, one line). Page-level FULL empty states centre at py-12 with a size-11 tile; COMPACT (sidebar, docked panels) is one muted line in a dashed box, no icon."
        >
          <EmptyBox
            icon={<KnowledgeIcon className="size-5" />}
            title="No sources yet"
          >
            Add notes or files to any of your agents. They all end up here.
          </EmptyBox>
        </Entry>
        <Entry
          name="Drop zone"
          path="recipe (components/chat/knowledge-section.tsx)"
          use="Files arrive here, by drag or by click."
          when="The zone IS the empty state: never stack a drop zone beside an empty-state strip. Drops feed the same handler as the picker."
          how="A dashed box that is a real button, so click-to-browse and keyboard come free. The size keeps a non-breaking space."
        >
          <button
            type="button"
            className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border px-5 py-8 text-center hover:bg-muted/40"
          >
            <Upload className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">
              Drop a file, or click to browse
            </span>
            <span className="text-xs text-muted-foreground">
              Up to 15&nbsp;MB
            </span>
          </button>
        </Entry>
        <Entry
          name="Meter track"
          path="recipe (components/usage/usage-meter.tsx)"
          use="How much of an allowance is spent."
          when="Any meter or progress track. bg-muted is indistinguishable from the sidebar canvas, so the rail is bg-border; the fill escalates to bg-chart-4 then bg-destructive at thresholds."
          how="A rounded-full track with a width-percentage fill."
        >
          <Specimen label="rail bg-border · fill bg-foreground/70">
            <div className="h-1.5 w-56 overflow-hidden rounded-full bg-border">
              <div className="h-full w-2/3 rounded-full bg-foreground/70" />
            </div>
          </Specimen>
        </Entry>
      </div>
    </SectionCard>
  )
}

export function LibraryBody() {
  return (
    <>
      <FoundationsSection />
      <ControlsSection />
      <OverlaysSection />
      <ContainersSection />
    </>
  )
}

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

// The library's own vocabulary: a specimen is one thing shown in one state,
// with the name under it in mono so the page doubles as a reference card.
// Every specimen renders the REAL component with the REAL recipe classes;
// nothing here is a picture of a component.

function Specimen({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-11 flex-wrap items-center gap-3">
        {children}
      </div>
      <p className="font-mono text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function SpecimenGrid({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-5">{children}</div>
}

// ---------- tokens ----------

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

function ColorSection() {
  return (
    <SectionCard title="Color tokens" className="mb-5">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {COLOR_TOKENS.map((t) => (
          <div key={t} className="flex flex-col gap-1.5">
            <span
              className="h-10 rounded-md border border-border"
              style={{ background: `var(--${t})` }}
            />
            <span className="font-mono text-xs text-muted-foreground">{t}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Style only through tokens. A hex color outside globals.css is a bug;
        so is a color that has no line in the .dark block.
      </p>
    </SectionCard>
  )
}

// ---------- typography ----------

function TypeSection() {
  return (
    <SectionCard title="Typography" className="mb-5">
      <SpecimenGrid>
        <Specimen label="text-2xl font-semibold (page title, the 24px cap)">
          <span className="text-2xl font-semibold">Knowledge</span>
        </Specimen>
        <Specimen label="text-base text-muted-foreground (page subtitle)">
          <span className="text-base text-muted-foreground">
            What your agents always know.
          </span>
        </Specimen>
        <Specimen label="text-sm (body, 14/20; the app never retunes it)">
          <span className="text-sm">
            Reads are free. Anything that changes something needs your
            approval.
          </span>
        </Specimen>
        <Specimen label="text-xs text-muted-foreground (detail line, middle dots)">
          <span className="text-xs text-muted-foreground">
            Document · 12 KB · Updated yesterday
          </span>
        </Specimen>
        <Specimen label="weights: 500 labels · 600 titles · 700 rare">
          <span className="text-sm font-medium">Medium 500</span>
          <span className="text-sm font-semibold">Semibold 600</span>
          <span className="text-sm font-bold">Bold 700</span>
        </Specimen>
      </SpecimenGrid>
    </SectionCard>
  )
}

// ---------- radii ----------

function RadiiSection() {
  return (
    <SectionCard title="Radii" className="mb-5">
      <div className="flex flex-wrap items-end gap-4">
        {(
          [
            ['rounded-sm', '4px · tiny chips'],
            ['rounded-md', '5px · badges, tiles'],
            ['rounded-lg', '6px · buttons, inputs, menu items'],
            ['rounded-xl', '6px · cards'],
          ] as const
        ).map(([cls, note]) => (
          <div key={cls} className="flex flex-col items-start gap-1.5">
            <span className={`size-14 border border-border bg-muted ${cls}`} />
            <span className="font-mono text-xs text-muted-foreground">
              {cls}
            </span>
            <span className="text-xs text-muted-foreground">{note}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Everything sits between 4 and 6px; never raw rounded-[Npx], and
        rounded-full only on true circles. The landing page runs its own
        one-step-up ladder and is the one sanctioned departure.
      </p>
    </SectionCard>
  )
}

// ---------- icons ----------

function IconSection() {
  const icons = [
    ['AgentsIcon', AgentsIcon],
    ['ConnectorsIcon', ConnectorsIcon],
    ['KnowledgeIcon', KnowledgeIcon],
    ['RoutinesIcon', RoutinesIcon],
    ['SettingsIcon', SettingsIcon],
  ] as const
  return (
    <SectionCard title="Icons" className="mb-5">
      <div className="flex flex-wrap gap-5">
        {icons.map(([name, Icon]) => (
          <div key={name} className="flex flex-col items-center gap-1.5">
            <Icon className="size-4.5 stroke-[1.75] text-muted-foreground" />
            <span className="font-mono text-xs text-muted-foreground">
              {name}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Monochrome Lucide only. Nav icons are re-exported from nav-icons.tsx,
        never restyled inline; size-4.5 stroke-[1.75] in nav, size-4 in dense
        contexts.
      </p>
    </SectionCard>
  )
}

// ---------- buttons ----------

function ButtonSection() {
  return (
    <SectionCard title="Buttons" className="mb-5">
      <SpecimenGrid>
        <Specimen label='variant: default · outline · secondary · ghost · destructive'>
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
        <Specimen label="disabled, and the spinner INSIDE the button it replaces">
          <Button disabled>Save changes</Button>
          <Button variant="ghost" size="icon-sm" disabled aria-label="Working">
            <Loader2 className="size-4 animate-spin" />
          </Button>
        </Specimen>
      </SpecimenGrid>
    </SectionCard>
  )
}

// ---------- form ----------

function FormSection() {
  return (
    <SectionCard title="Form" className="mb-5">
      <div className="flex max-w-md flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="lib-input">
            Name
            <HelpTip>
              A HelpTip states a fact about the machinery nobody can deduce by
              looking. It never coaches prompting.
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
        <Specimen label="Select">
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
        <Specimen label="Switch (commits on click, no Save; the delivery rule)">
          <Switch defaultChecked aria-label="Send reports to Telegram" />
        </Specimen>
        <Specimen label="Skeleton (loading shares the box the answer will fill)">
          <div className="flex w-full flex-col gap-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-2/5" />
          </div>
        </Specimen>
      </div>
    </SectionCard>
  )
}

// ---------- overlays ----------

function OverlaySection() {
  const [dialogOpen, setDialogOpen] = useState(false)
  return (
    <SectionCard title="Overlays" className="mb-5">
      <SpecimenGrid>
        <Specimen label="Tooltip: TooltipProvider delay={300}, content is action or consequence, no period">
          <TooltipProvider delay={300}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="ghost" size="icon-sm" aria-label="Attach" />
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
        <Specimen label="DropdownMenu: min-width from content, never the anchor">
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
              <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Specimen>
        <Specimen label="Dialog: one record opens centred, never a side drawer">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button variant="outline" />}>
              Open a record
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>A record</DialogTitle>
                <DialogDescription>
                  Overlay forms seed state in a keyed inner body, so reopening
                  re-seeds fresh; the record stays in state through the exit
                  animation.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Specimen>
      </SpecimenGrid>
    </SectionCard>
  )
}

// ---------- containers: the page shape ----------

function ContainerSection() {
  return (
    <SectionCard
      title={
        <>
          Containers
          <SectionCount>7a</SectionCount>
        </>
      }
      className="mb-5"
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 font-mono text-xs text-muted-foreground">
            SectionCard + RowBox list + Row (lead / title / detail / trailing)
          </p>
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
          <p className="mt-2 text-xs text-muted-foreground">
            The detail line says what the thing is; the trailing edge carries
            state that lines up down the list. Nothing floats between them.
          </p>
        </div>
        <div>
          <p className="mb-2 font-mono text-xs text-muted-foreground">
            EmptyBox (fills the slot the rows would take, inside the card)
          </p>
          <EmptyBox
            icon={<KnowledgeIcon className="size-5" />}
            title="No sources yet"
          >
            Add notes or files to any of your agents. They all end up here.
          </EmptyBox>
        </div>
        <div>
          <p className="mb-2 font-mono text-xs text-muted-foreground">
            Drop zone: a dashed box that is a real button
          </p>
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
        </div>
        <div>
          <p className="mb-2 font-mono text-xs text-muted-foreground">
            Meter track: bg-border rail, bg-foreground/70 fill (bg-muted
            vanishes on the sidebar canvas)
          </p>
          <div className="h-1.5 w-56 overflow-hidden rounded-full bg-border">
            <div className="h-full w-2/3 rounded-full bg-foreground/70" />
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

export function LibraryBody() {
  return (
    <>
      <ColorSection />
      <TypeSection />
      <RadiiSection />
      <IconSection />
      <ButtonSection />
      <FormSection />
      <OverlaySection />
      <ContainerSection />
    </>
  )
}

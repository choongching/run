import { Globe } from 'lucide-react'

import { GmailIcon } from '@/components/icons/gmail'
import { GoogleDriveIcon } from '@/components/icons/google-drive'

// The README's capability tables, verbatim. This section stands where a
// page like this usually puts quotes; until real users have said something,
// a list that says "this is everything" is the honest proof.
const GROUPS = [
  {
    title: 'Gmail',
    icon: <GmailIcon className="h-4 w-5" />,
    rows: [
      ['Search your inbox'],
      ['Read an email'],
      ['Write a draft', 'Asks first'],
    ],
    note: 'It cannot send. A draft waits in your drafts folder until you press Send.',
  },
  {
    title: 'Google Drive',
    icon: <GoogleDriveIcon className="size-5" />,
    rows: [
      ['List your files'],
      ['Read a document, sheet or PDF'],
      ['Create a folder', 'Asks first'],
      ['Move a file', 'Asks first'],
      ['Rename a file', 'Asks first'],
    ],
    note: 'It cannot delete. You see the file and where it is going before anything moves.',
  },
  {
    title: 'The web and the chat',
    icon: <Globe className="size-5" strokeWidth={1.75} />,
    rows: [
      ['Search the web'],
      ['Read a page, or a link you paste'],
      ['Write you a document'],
      ['Ask you a question'],
      ['Send a report on a schedule, here or to your phone'],
    ],
    note: 'On a schedule it can only read and report. Anything it would ask about waits for you.',
  },
] as const

export function Capabilities() {
  return (
    <section aria-label="What it can do" className="flex flex-col items-center gap-10 px-4 py-16 md:px-8 md:py-28 lg:gap-12">
      <div data-depth className="flex max-w-[800px] flex-col items-center gap-4 text-center">
        <h2 className="ld-heading">Everything it can do.</h2>
        <p className="ld-lead max-w-[600px] text-muted-foreground">
          If it is not on this list, Run cannot do it.
        </p>
      </div>
      {/* A phone pushes these sideways; a tablet and up sees all three. */}
      <div className="flex w-full max-w-[1200px] snap-x snap-mandatory gap-4 overflow-x-auto no-scrollbar md:grid md:grid-cols-3 md:gap-6 md:overflow-visible">
        {GROUPS.map((g, i) => (
          <div key={g.title} data-reveal style={{ '--reveal-delay': `${i * 90}ms` } as React.CSSProperties} className="ld-card flex w-[300px] shrink-0 snap-start flex-col gap-4 p-5 md:w-auto md:p-6">
            <div className="flex items-center gap-2.5 text-lg font-semibold">
              {g.icon}
              {g.title}
            </div>
            <ul className="rounded-lg border border-border">
              {g.rows.map(([label, mark]) => (
                <li
                  key={label}
                  className="flex items-center justify-between gap-3 border-t border-border px-3.5 py-3 text-[15px] first:border-t-0"
                >
                  <span>{label}</span>
                  {mark && (
                    <span className="rounded-md bg-primary/8 px-2 py-0.5 font-mono text-xs text-primary">{mark}</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground">{g.note}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

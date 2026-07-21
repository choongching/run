import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function base(props: IconProps): IconProps {
  return { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true, ...props }
}

// Indigo bullseye
export function MissionsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" fill="#c7d2fe" />
      <circle cx="12" cy="12" r="5.5" fill="#eef2ff" />
      <circle cx="12" cy="12" r="2.5" fill="#4f46e5" />
    </svg>
  )
}

// Blue area chart
export function UsageIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 20V13l5-4 5 3 8-7v15H3Z" fill="#bfdbfe" />
      <path
        d="M3 13l5-4 5 3 8-7"
        stroke="#2563eb"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Purple CPU chip
export function AgentsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"
        stroke="#a78bfa"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="5" y="5" width="14" height="14" rx="3" fill="#ddd6fe" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="#7c3aed" />
    </svg>
  )
}

// Slate building
export function CompanyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="3" width="12" height="18" rx="1.5" fill="#cbd5e1" />
      <rect x="16" y="9" width="4" height="12" rx="1" fill="#94a3b8" />
      <path
        d="M7 7h2M11 7h2M7 11h2M11 11h2M7 15h2M11 15h2"
        stroke="#475569"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <rect x="9" y="18" width="3" height="3" fill="#475569" />
    </svg>
  )
}

// Teal people
export function UsersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3.5" fill="#0d9488" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0Z" fill="#0d9488" />
      <circle cx="16.5" cy="9" r="2.8" fill="#99f6e4" />
      <path d="M12.5 20a5.5 5.5 0 0 1 9 0Z" fill="#99f6e4" />
    </svg>
  )
}

// Orange linked nodes
export function IntegrationsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 12h8" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" />
      <circle cx="6" cy="12" r="3.5" fill="#fed7aa" stroke="#f97316" strokeWidth="1.6" />
      <circle cx="18" cy="12" r="3.5" fill="#f97316" />
    </svg>
  )
}

// Slate gear
export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M12 2.5l1.8 1.2 2.1-.5 1 1.9 2 .7v2.2l1.6 1.5-1 1.9 1 1.9-1.6 1.5V17l-2 .7-1 1.9-2.1-.5L12 20.3l-1.8 1.2-2.1-.5-1-1.9-2-.7v-2.2L3.5 14.7l1-1.9-1-1.9 1.6-1.5V7.2l2-.7 1-1.9 2.1.5L12 2.5Z"
        fill="#cbd5e1"
        transform="translate(0 0.6)"
      />
      <circle cx="12" cy="12" r="3.4" fill="#475569" />
      <circle cx="12" cy="12" r="1.4" fill="#f1f5f9" />
    </svg>
  )
}

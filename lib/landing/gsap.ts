'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

// One registration for the whole landing page. Every animated component
// imports gsap from here rather than from the package, so the plugin is
// registered before any of them runs and no component has to remember to.
gsap.registerPlugin(ScrollTrigger, useGSAP)

export { gsap, ScrollTrigger, useGSAP }

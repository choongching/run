import { useLayoutEffect, type RefObject } from 'react'

// Grows a textarea to fit what has been typed, and shrinks it back as text is
// removed. Its CSS max-height still caps it, so a very long message stops
// growing and scrolls inside instead of pushing the conversation off screen.
//
// Height is reset to auto before measuring because scrollHeight reports the
// content height only when the element is not already holding itself open at
// the previous value.
//
// This runs in a layout effect rather than an ordinary one so the resize lands
// in the same frame as the keystroke. In a plain effect the browser would paint
// the old height first, which reads as the box lagging a line behind the text.
export function useAutoGrow(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string
) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [ref, value])
}

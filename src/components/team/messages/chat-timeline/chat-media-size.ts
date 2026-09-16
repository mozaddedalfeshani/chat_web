/** Width a media bubble takes: fill the pane up to Signal's 32rem cap.
 *  `50vw` is too narrow on a phone; `100vw - chrome` grows, then the cap. */
export const chatMediaBubbleWidth =
  "w-[min(32rem,calc(100vw-5.5rem))] max-w-full";

/** Solo photo/video: width 100% of the bubble, height from the file.
 *  `max-height` is a ceiling (`70dvh`, hard stop 420px) — never a size to fill. */
export const chatMediaFrame =
  "block h-auto w-full max-h-[min(70dvh,26.25rem)] object-cover";

export const chatMediaPlaceholder =
  "flex h-40 w-full min-h-24 items-center justify-center bg-black/20";

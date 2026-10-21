"use client";

import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { FlocksCard, TasksCard } from "./cards-info";
import { CallsCard, ChatCard, GroupsCard } from "./cards-conversation";
import { FEATURE_COPY, FEATURE_SLIDES, type FeatureSlide } from "./feature-copy";
import { useFeatureRotation } from "./use-feature-rotation";

const CARDS: Record<FeatureSlide, ReactNode> = {
  chat: <ChatCard />,
  calls: <CallsCard />,
  groups: <GroupsCard />,
  tasks: <TasksCard />,
  flocks: <FlocksCard />,
};

/** Front card centred; the previous and next peek out on either side behind it. */
const PLACES: Record<number, { x: number; scale: number; opacity: number; z: number }> = {
  0: { x: 0, scale: 1, opacity: 1, z: 3 },
  1: { x: 42, scale: 0.86, opacity: 0.55, z: 2 },
  [-1]: { x: -42, scale: 0.86, opacity: 0.55, z: 2 },
};
const HIDDEN = { x: 0, scale: 0.72, opacity: 0, z: 1 };

function signedOffset(index: number, active: number, count: number) {
  const d = (index - active + count) % count;
  return d > count / 2 ? d - count : d;
}

/**
 * The sign-in page's feature carousel, beside the QR code. A side card is a
 * pointer shortcut to itself; only the front card reaches assistive tech —
 * the dots are the control.
 */
export default function FeatureCarousel() {
  const [paused, setPaused] = useState(false);
  const { active, show } = useFeatureRotation(FEATURE_SLIDES.length, paused);
  const heading = FEATURE_COPY.headings[FEATURE_SLIDES[active]];

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="min-h-[64px] text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--indigo)]">{heading.label}</p>
        <p className="mt-1 text-[18px] font-semibold leading-snug text-[#111b21]">{heading.title}</p>
      </div>

      <div className="relative mt-3 min-h-0 w-full flex-1 overflow-hidden">
        {FEATURE_SLIDES.map((slide, index) => {
          const offset = signedOffset(index, active, FEATURE_SLIDES.length);
          const place = PLACES[offset] ?? HIDDEN;
          const side = offset === 1 || offset === -1;
          return (
            <div
              key={slide}
              aria-hidden={offset !== 0}
              onClick={side ? () => show(index) : undefined}
              className={cn(
                "absolute left-1/2 top-1/2 aspect-video w-[min(92%,680px)] transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none",
                side ? "cursor-pointer [&>*]:pointer-events-none" : offset !== 0 && "pointer-events-none",
              )}
              style={{
                transform: `translate(calc(-50% + ${place.x}%), -50%) scale(${place.scale})`,
                opacity: place.opacity,
                zIndex: place.z,
              }}
            >
              {CARDS[slide]}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-1.5" role="group">
        {FEATURE_SLIDES.map((slide, index) => (
          <button
            key={slide}
            type="button"
            aria-label={`${FEATURE_COPY.show}: ${FEATURE_COPY.headings[slide].name}`}
            aria-pressed={index === active}
            onClick={() => show(index)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--indigo)]",
              index === active ? "w-6 bg-[var(--indigo)]" : "w-1.5 bg-[#d1d7db] hover:bg-[#aebac1]",
            )}
          />
        ))}
      </div>
    </div>
  );
}

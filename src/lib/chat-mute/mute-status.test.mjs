import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMuteEnd,
  isMentionsOnlyMute,
  isMutedNow,
  muteStatusLabel,
} from "./mute-status.ts";

const now = new Date(2026, 8, 27, 10, 0);
const iso = (d) => d.toISOString();

test("not muted says nothing", () => {
  assert.equal(isMutedNow({}, now), false);
  assert.equal(isMutedNow(null, now), false);
  assert.equal(muteStatusLabel({ muted: false }, now), null);
});

test("always and mentions only", () => {
  assert.equal(muteStatusLabel({ muted: true }, now), "Muted");
  assert.equal(muteStatusLabel({ muted: true, mute_mode: "mentions" }, now), "Only mentions");
  assert.equal(isMentionsOnlyMute({ muted: true, mute_mode: "mentions" }, now), true);
  assert.equal(isMentionsOnlyMute({ muted: true, mute_mode: "all" }, now), false);
});

test("a timed mute reads until its end, then lapses on its own", () => {
  const later = { muted: true, muted_until: iso(new Date(2026, 8, 27, 17, 30)) };
  assert.equal(muteStatusLabel(later, now), "Muted until 5:30 PM");
  const past = { muted: true, muted_until: iso(new Date(2026, 8, 27, 9, 59)), mute_mode: "mentions" };
  assert.equal(isMutedNow(past, now), false);
  assert.equal(isMentionsOnlyMute(past, now), false);
  assert.equal(muteStatusLabel(past, now), null);
});

test("end time wording matches the phone", () => {
  assert.equal(formatMuteEnd(new Date(2026, 8, 27, 17, 30), now), "5:30 PM");
  assert.equal(formatMuteEnd(new Date(2026, 8, 28, 9, 0), now), "tomorrow 9:00 AM");
  assert.equal(formatMuteEnd(new Date(2026, 8, 30, 9, 0), now), "Wed 9:00 AM");
  assert.equal(formatMuteEnd(new Date(2026, 10, 2, 9, 0), now), "2 Nov, 9:00 AM");
  assert.equal(formatMuteEnd(new Date(2027, 0, 2, 9, 0), now), "2 Jan 2027, 9:00 AM");
  assert.equal(formatMuteEnd(new Date(2026, 8, 27, 0, 5), now), "12:05 AM");
  assert.equal(formatMuteEnd(new Date(2026, 8, 27, 12, 0), now), "12:00 PM");
});

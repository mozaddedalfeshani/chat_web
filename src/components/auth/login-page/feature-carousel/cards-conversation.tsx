import { AppBubble, AppCallControls, AppComposer, AppHeader, WebStage } from "./feature-card";
import { FEATURE_COPY } from "./feature-copy";

export function ChatCard() {
  const c = FEATURE_COPY.chat;
  return (
    <WebStage active={c.peer}>
      <AppHeader title={c.peer} />
      <div className="flex min-h-0 flex-1 flex-col justify-end pb-2">
        {c.messages.map((m) => (
          <AppBubble key={m.text} mine={m.mine} text={m.text} />
        ))}
      </div>
      <AppComposer />
    </WebStage>
  );
}

export function CallsCard() {
  const c = FEATURE_COPY.calls;
  return (
    <WebStage active={c.peer}>
      <AppHeader title={c.peer} />
      <div className="flex min-h-0 flex-1 flex-col bg-black">
        <div className="flex flex-1 items-end p-4">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs text-white">{c.sharing}</span>
        </div>
        <div className="bg-[var(--sig-bg)] py-3">
          <AppCallControls />
        </div>
      </div>
    </WebStage>
  );
}

export function GroupsCard() {
  const c = FEATURE_COPY.groups;
  return (
    <WebStage active={c.name}>
      <AppHeader title={c.name} />
      <div className="flex min-h-0 flex-1 flex-col justify-end pb-2">
        <AppBubble mine={false} author="Rafi" text={c.messages[0].text} />
        <AppBubble mine text={c.messages[1].text} />
      </div>
      <AppComposer />
    </WebStage>
  );
}

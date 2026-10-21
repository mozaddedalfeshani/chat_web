import LoginErrorNotice from "./login-error-notice";
import LoginQrPanel from "./login-qr-panel";
import { LOGIN_COPY } from "./login-copy";

/**
 * The only way in is a scan from a signed-in phone (user's call, 2026-10-18):
 * the scan also brings the message key and the chats, which Google or a
 * password never could. This column is the left 45% of the sign-in card.
 */
export default function LoginAuthPanel() {
  return (
    <div className="flex h-full w-full shrink-0 flex-col justify-center gap-5 lg:w-[45%]">
      <div>
        <h1 id="hero-heading" className="text-[28px] font-semibold tracking-tight text-[#111b21]">
          {LOGIN_COPY.title}
        </h1>
        <p className="mt-2 text-[16px] text-[#667781]">{LOGIN_COPY.lead}</p>
      </div>
      <LoginErrorNotice />
      <LoginQrPanel />
      <div>
        <p className="text-[13px] font-semibold text-[#111b21]">{LOGIN_COPY.qrFind}</p>
        <ol className="mt-2 space-y-1.5">
          {LOGIN_COPY.qrSteps.map((step, i) => (
            <li key={step} className="flex items-start gap-2.5 text-[13px] leading-5 text-[#3b4a54]">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#fff1f2] text-[11px] font-semibold text-[var(--indigo)]">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

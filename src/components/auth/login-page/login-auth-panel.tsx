import LoginErrorNotice from "./login-error-notice";
import LoginGoogleButton from "./login-google-button";
import LoginQrPanel from "./login-qr-panel";
import { LOGIN_COPY } from "./login-copy";

/** Both ways in, stacked: scan the code, or fall through to Google. */
export default function LoginAuthPanel() {
  return (
    <div className="flex w-full shrink-0 flex-col items-center gap-4 lg:w-[280px]">
      <LoginErrorNotice />
      <LoginQrPanel />
      <div className="flex w-full items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-[#e9edef]" />
        <span className="text-[13px] text-[#8696a0]">{LOGIN_COPY.or}</span>
        <span className="h-px flex-1 bg-[#e9edef]" />
      </div>
      <LoginGoogleButton />
      <p className="text-center text-[13px] leading-5 text-[#667781]">
        {LOGIN_COPY.googleHint}
      </p>
    </div>
  );
}

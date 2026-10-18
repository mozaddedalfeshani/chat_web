import LoginErrorNotice from "./login-error-notice";
import LoginQrPanel from "./login-qr-panel";

/**
 * The only way in is a scan from a signed-in phone (user's call, 2026-10-18):
 * the scan also brings the message key and the chats, which Google or a
 * password never could.
 */
export default function LoginAuthPanel() {
  return (
    <div className="flex w-full shrink-0 flex-col items-center gap-4 lg:w-[280px]">
      <LoginErrorNotice />
      <LoginQrPanel />
    </div>
  );
}

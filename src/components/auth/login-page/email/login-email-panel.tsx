"use client";

import { useCallback } from "react";
import EmailField from "./email-field";
import { EMAIL_COPY } from "./email-copy";
import { useEmailLogin } from "./use-email-login";

const link =
  "text-[13px] font-medium text-[#008069] hover:underline disabled:opacity-50";

/** Email + password, closed to one button until asked for. */
export default function LoginEmailPanel() {
  const onSignedIn = useCallback(() => {
    window.location.assign("/user/messages");
  }, []);
  const s = useEmailLogin(onSignedIn);
  const { form, update, busy } = s;

  if (s.mode === "closed") {
    return (
      <button
        type="button"
        onClick={() => s.go("signin")}
        className="flex h-11 w-full items-center justify-center rounded-full border border-[#d1d7db] bg-white px-5 text-[15px] font-medium text-[#3b4a54] transition-colors hover:bg-[#f5f6f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25d366]"
      >
        {EMAIL_COPY.open}
      </button>
    );
  }

  const code = s.mode === "code";
  const reset = code && s.purpose === "reset";
  const title = {
    signin: EMAIL_COPY.signinTitle,
    signup: EMAIL_COPY.signupTitle,
    forgot: EMAIL_COPY.forgotTitle,
    code: EMAIL_COPY.codeTitle,
  }[s.mode];
  const action = {
    signin: EMAIL_COPY.signin,
    signup: EMAIL_COPY.continue,
    forgot: EMAIL_COPY.sendCode,
    code: reset ? EMAIL_COPY.savePassword : EMAIL_COPY.verify,
  }[s.mode];

  return (
    <form
      className="flex w-full flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        s.submit();
      }}
    >
      <p className="text-center text-[15px] font-semibold text-[#111b21]">
        {title}
      </p>
      {s.mode === "signup" && <Hint text={EMAIL_COPY.signupHint} />}
      {s.mode === "forgot" && <Hint text={EMAIL_COPY.forgotHint} />}
      {code && <Hint text={EMAIL_COPY.codeHint(s.masked)} />}

      {s.mode === "signup" && (
        <EmailField
          label={EMAIL_COPY.name}
          value={form.name}
          autoComplete="name"
          disabled={busy}
          onChange={(name) => update({ name })}
        />
      )}
      {!code && (
        <EmailField
          label={EMAIL_COPY.email}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={form.email}
          disabled={busy}
          onChange={(email) => update({ email })}
        />
      )}
      {code && (
        <EmailField
          label={EMAIL_COPY.code}
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          value={form.code}
          disabled={busy}
          onChange={(v) => update({ code: v.replace(/\D/g, "").slice(0, 6) })}
        />
      )}
      {(s.mode === "signin" || s.mode === "signup" || reset) && (
        <EmailField
          label={reset ? EMAIL_COPY.newPassword : EMAIL_COPY.password}
          type="password"
          autoComplete={
            s.mode === "signin" ? "current-password" : "new-password"
          }
          value={form.password}
          disabled={busy}
          onChange={(password) => update({ password })}
        />
      )}

      {s.error && (
        <p
          role="alert"
          className="rounded-lg bg-[#fdecea] px-3 py-2 text-center text-[13px] text-[#b3261e]"
        >
          {s.error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="h-11 w-full rounded-full bg-[#008069] text-[15px] font-medium text-white transition-colors hover:bg-[#006e5a] disabled:opacity-60"
      >
        {busy ? "…" : action}
      </button>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        {s.mode === "signin" && (
          <>
            <button
              type="button"
              className={link}
              onClick={() => s.go("forgot")}
            >
              {EMAIL_COPY.forgot}
            </button>
            <button
              type="button"
              className={link}
              onClick={() => s.go("signup")}
            >
              {EMAIL_COPY.createAccount}
            </button>
          </>
        )}
        {(s.mode === "signup" || s.mode === "forgot") && (
          <button type="button" className={link} onClick={() => s.go("signin")}>
            {EMAIL_COPY.haveAccount}
          </button>
        )}
        {code && (
          <>
            <button
              type="button"
              className={link}
              disabled={busy || s.resendIn > 0}
              onClick={s.resend}
            >
              {s.resendIn > 0
                ? EMAIL_COPY.resendIn(s.resendIn)
                : EMAIL_COPY.resend}
            </button>
            <button
              type="button"
              className={link}
              onClick={() => s.go(s.purpose === "reset" ? "forgot" : "signup")}
            >
              {EMAIL_COPY.back}
            </button>
          </>
        )}
      </div>
    </form>
  );
}

function Hint({ text }: { text: string }) {
  return (
    <p className="text-center text-[13px] leading-5 text-[#667781]">{text}</p>
  );
}

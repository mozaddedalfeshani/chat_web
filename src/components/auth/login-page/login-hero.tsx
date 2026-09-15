import { LOGIN_COPY } from "./login-copy";

export default function LoginHero() {
  const steps = [LOGIN_COPY.step1, LOGIN_COPY.step2, LOGIN_COPY.step3];

  return (
    <div className="flex min-w-0 flex-1 flex-col justify-center pr-0 lg:pr-8">
      <h1
        id="hero-heading"
        className="text-[28px] font-semibold tracking-tight text-[#111b21]"
      >
        {LOGIN_COPY.title}
      </h1>
      <p className="mt-2 text-[16px] font-normal text-[#667781]">
        {LOGIN_COPY.lead}
      </p>
      <ol className="mt-8 space-y-4">
        {steps.map((step, i) => (
          <li key={step} className="flex items-start gap-3 text-[15px] text-[#3b4a54]">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#d1d7db] text-[13px] text-[#667781]">
              {i + 1}
            </span>
            <span className="pt-0.5 leading-6">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

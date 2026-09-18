import LoginHero from "./login-hero";
import LoginAuthPanel from "./login-auth-panel";

export default function LoginHeroSection() {
  return (
    <section
      className="flex w-full justify-center px-4 pt-24 pb-8"
      aria-labelledby="hero-heading"
    >
      <div className="flex w-full max-w-[900px] flex-col gap-10 rounded-[12px] bg-white px-8 py-10 shadow-[0_1px_3px_rgba(11,20,26,0.08)] sm:px-12 sm:py-12 lg:flex-row lg:items-center lg:justify-between">
        <LoginHero />
        <LoginAuthPanel />
      </div>
    </section>
  );
}

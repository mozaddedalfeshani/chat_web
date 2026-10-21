import LoginHero from "./login-hero";
import LoginAuthPanel from "./login-auth-panel";

export default function LoginHeroSection() {
  return (
    <section
      className="flex h-full w-full items-center justify-center"
      aria-labelledby="hero-heading"
    >
      <div className="flex h-full w-11/12 flex-col gap-6 overflow-hidden rounded-[12px] bg-white px-6 py-6 shadow-[0_1px_3px_rgba(11,20,26,0.08)] sm:px-10 lg:flex-row lg:items-center lg:justify-between">
        <LoginAuthPanel />
        <LoginHero />
      </div>
    </section>
  );
}

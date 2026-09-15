import { LockIcon } from "hugeicons-react";
import LoginHeroSection from "./login-hero-section";
import LoginNavbar from "./login-navbar";
import LoginRedirect from "./login-redirect";
import LoginTheme from "./login-theme";
import { LOGIN_COPY } from "./login-copy";

export default function LoginPage() {
  return (
    <LoginRedirect>
      <LoginTheme>
        <div
          data-theme="light"
          className="relative min-h-screen overflow-x-hidden"
          style={{ background: "#efeae2", colorScheme: "light" }}
        >
          <LoginNavbar />
          <main id="main-content" className="flex min-h-screen flex-col">
            <div className="flex flex-1 flex-col justify-center">
              <LoginHeroSection />
            </div>
            <footer className="flex flex-col items-center gap-4 px-4 pb-10 text-center">
              <p className="flex items-center gap-1.5 text-[13px] text-[#667781]">
                <LockIcon size={14} aria-hidden />
                {LOGIN_COPY.e2ee}
              </p>
              <section
                aria-labelledby="about-heading"
                className="max-w-xl px-2"
              >
                <h2
                  id="about-heading"
                  className="text-[14px] font-semibold text-[#111b21]"
                >
                  {LOGIN_COPY.aboutTitle}
                </h2>
                <p className="mt-1.5 text-[13px] leading-5 text-[#667781]">
                  {LOGIN_COPY.aboutBody}
                </p>
              </section>
            </footer>
          </main>
        </div>
      </LoginTheme>
    </LoginRedirect>
  );
}

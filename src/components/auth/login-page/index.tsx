import Link from "next/link";
import { LockIcon } from "hugeicons-react";
import { PLAY_STORE_URL } from "@/lib/site";
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
          className="relative flex min-h-screen flex-col overflow-x-hidden"
          style={{ background: "#efeae2", colorScheme: "light" }}
        >
          <LoginNavbar />
          {/* Sign-in only. How each feature works lives in /docs. */}
          <main id="main-content" className="flex flex-1 flex-col justify-center">
            <LoginHeroSection />
          </main>
          <footer className="flex flex-col items-center gap-4 px-4 pb-10 text-center">
            <p className="flex items-center gap-1.5 text-[13px] text-[#667781]">
              <LockIcon size={14} aria-hidden />
              {LOGIN_COPY.e2ee}
            </p>
            <section aria-labelledby="about-heading" className="max-w-xl px-2">
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
            <nav
              aria-label="More"
              className="flex items-center gap-5 text-[13px] font-medium text-[#3b4a54]"
            >
              <Link href="/docs" className="hover:text-[#111b21]">
                {LOGIN_COPY.navDocs}
              </Link>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#111b21]"
              >
                {LOGIN_COPY.getApp}
              </a>
            </nav>
          </footer>
        </div>
      </LoginTheme>
    </LoginRedirect>
  );
}

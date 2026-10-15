import Image from "next/image";
import Link from "next/link";
import { LOGIN_COPY } from "./login-copy";

export default function LoginNavbar() {
  return (
    <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-8 pt-6">
      <span className="flex items-center gap-2">
        <Image
          src="/logo.png"
          alt="AbabilX Chat"
          width={28}
          height={28}
          className="shrink-0 object-contain"
        />
        <span className="text-[15px] font-semibold tracking-tight text-[#e11d48]">
          {LOGIN_COPY.product}
        </span>
      </span>
      <Link
        href="/docs"
        className="text-[14px] font-medium text-[#3b4a54] transition-colors hover:text-[#111b21]"
      >
        {LOGIN_COPY.navDocs}
      </Link>
    </header>
  );
}

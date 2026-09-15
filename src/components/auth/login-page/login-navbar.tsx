import Image from "next/image";
import { LOGIN_COPY } from "./login-copy";

export default function LoginNavbar() {
  return (
    <header className="absolute top-0 left-0 z-10 px-8 pt-6">
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
    </header>
  );
}

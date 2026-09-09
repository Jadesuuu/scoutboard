import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-line bg-surface sticky top-0 z-40 w-full border-b">
      <div className="mx-auto flex h-[62px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="bg-brand flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] text-sm font-black text-white"
          >
            S
          </span>
          <span className="text-ink truncate text-[19px] font-extrabold tracking-[-0.035em]">
            ScoutBoard
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex shrink-0 items-center gap-1 sm:gap-4">
          <Link
            href="/"
            className="text-ink hover:text-brand px-1.5 py-2 text-[13.5px] font-bold whitespace-nowrap transition-colors"
          >
            Browse
          </Link>
          <Link
            href="/create-listing"
            className="bg-brand hover:bg-brand-hover rounded-[9px] px-3 py-2.5 text-[13.5px] font-bold whitespace-nowrap text-white transition-colors sm:px-4"
          >
            Sell a business
          </Link>
        </nav>
      </div>
    </header>
  );
}

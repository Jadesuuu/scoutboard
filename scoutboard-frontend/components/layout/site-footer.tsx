import Link from "next/link";

const LINK =
  "text-[#dceae3] no-underline transition-colors hover:text-white text-[13.5px]";

export default function SiteFooter() {
  return (
    <footer className="bg-brand text-brand-on-dark mt-auto">
      <div className="mx-auto flex max-w-6xl flex-wrap gap-8 px-4 py-8 sm:px-6 sm:py-11 md:gap-14">
        <div className="min-w-0 flex-1 basis-60">
          <div className="mb-2.5 flex items-center gap-2.5">
            <span
              aria-hidden
              className="text-brand flex h-6 w-6 items-center justify-center rounded-md bg-white text-[13px] font-black"
            >
              S
            </span>
            <span className="text-[17px] font-extrabold tracking-[-0.03em] text-white">
              ScoutBoard
            </span>
          </div>
          <p className="m-0 max-w-[34ch] text-[13.5px] leading-relaxed">
            A marketplace for independent main-street businesses, with the books
            open and every offer in view.
          </p>
        </div>

        <div className="min-w-0 basis-40">
          <div className="text-brand-faint mb-3 text-[10.5px] font-extrabold tracking-[0.1em] uppercase">
            Buying
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/" className={LINK}>
              All listings
            </Link>
            <Link href="/credits" className={LINK}>
              Photo credits
            </Link>
          </div>
        </div>

        <div className="min-w-0 basis-40">
          <div className="text-brand-faint mb-3 text-[10.5px] font-extrabold tracking-[0.1em] uppercase">
            Selling
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/create-listing" className={LINK}>
              List a business
            </Link>
            <a
              href="https://github.com/Jadesuuu/scoutboard"
              target="_blank"
              rel="noreferrer"
              className={LINK}
            >
              Source on GitHub
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2.5 px-4 py-4 text-xs sm:px-6">
          <span>© {new Date().getFullYear()} ScoutBoard</span>
          <span>Portfolio demo · seeded listings, simulated offers</span>
        </div>
      </div>
    </footer>
  );
}

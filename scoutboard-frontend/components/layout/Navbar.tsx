import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#c0603a]" />
            <span className="font-serif text-lg text-stone-900">
              Scoutboard
            </span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-6">
          <a href="#" className="text-sm font-medium text-stone-900">
            Browse
          </a>
          <Button className="bg-[#c0603a] text-white hover:bg-[#a85230] rounded-lg">
            List your business
          </Button>
        </nav>
      </div>
    </header>
  );
}

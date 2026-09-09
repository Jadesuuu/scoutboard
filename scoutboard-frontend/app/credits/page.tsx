import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ALL_PHOTOS } from "@/lib/photos";

export const metadata: Metadata = {
  title: "Photo credits — ScoutBoard",
  description:
    "Attribution for the public-domain photography used across ScoutBoard's listings.",
};

export default function CreditsPage() {
  return (
    <div className="animate-sb-fade-in mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/"
        className="text-quiet hover:text-brand mb-4 inline-block text-[13px] font-bold no-underline"
      >
        ← Back to listings
      </Link>

      <h1 className="m-0 mb-2.5 text-[clamp(27px,5.5vw,38px)] leading-tight tracking-[-0.038em]">
        Photo credits
      </h1>
      <p className="text-quiet m-0 mb-2 max-w-[60ch] text-[15.5px] leading-relaxed">
        ScoutBoard is a portfolio demo, so its listings are seeded sample
        businesses rather than real ones. The photography stands in for what
        would be seller-uploaded images.
      </p>
      <p className="text-quiet m-0 mb-8 max-w-[60ch] text-[15.5px] leading-relaxed">
        Every photo below is dedicated to the public domain under{" "}
        <a
          href="https://creativecommons.org/publicdomain/zero/1.0/"
          target="_blank"
          rel="noreferrer"
          className="text-brand font-semibold"
        >
          CC0 1.0
        </a>
        , discovered through the{" "}
        <a
          href="https://openverse.org"
          target="_blank"
          rel="noreferrer"
          className="text-brand font-semibold"
        >
          Openverse
        </a>{" "}
        API. CC0 waives the attribution requirement — these credits are here
        because crediting the photographers is the right thing to do, not
        because the licence compels it.
      </p>

      <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
        {ALL_PHOTOS.map((photo) => (
          <li
            key={photo.src}
            className="border-line bg-surface flex gap-3 overflow-hidden rounded-xl border p-3"
          >
            <div className="bg-line-soft relative h-16 w-24 shrink-0 overflow-hidden rounded-lg">
              <Image
                src={photo.src}
                alt=""
                aria-hidden
                fill
                sizes="96px"
                placeholder="blur"
                blurDataURL={photo.blurDataURL}
                className="object-cover"
              />
            </div>
            <div className="min-w-0 text-[13px]">
              <p className="text-ink m-0 truncate font-bold">
                {photo.title ?? "Untitled"}
              </p>
              <p className="text-quiet m-0 mt-0.5">
                {photo.creator ? (
                  photo.creatorUrl ? (
                    <a
                      href={photo.creatorUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-quiet hover:text-brand"
                    >
                      {photo.creator}
                    </a>
                  ) : (
                    photo.creator
                  )
                ) : (
                  // Some sources publish without a named photographer.
                  <span>Unattributed</span>
                )}
                {" · "}
                <a
                  href={photo.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-quiet hover:text-brand"
                >
                  {photo.source}
                </a>
              </p>
              <p className="text-faint m-0 mt-0.5">
                <a
                  href={photo.licenseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-faint hover:text-brand"
                >
                  {photo.license}
                </a>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

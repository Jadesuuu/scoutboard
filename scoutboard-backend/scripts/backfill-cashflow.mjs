#!/usr/bin/env node
/**
 * Backfill `monthlyCashFlow` on listings that predate the field.
 *
 * The Market UI derives annual cash flow, the cash-flow multiple, and margin
 * from `monthlyCashFlow`; a listing without it renders em dashes. Listings
 * created before the field existed — the ones already sitting in the demo
 * database — all show that gap, so this repairs them in place.
 *
 * Writes straight to MongoDB rather than through the API, because there is no
 * route that edits a listing's financials (deliberately: only the platform
 * touches `verified`, and sellers re-post rather than edit). The browse cache
 * in Redis carries a 60 s TTL, so the change surfaces within a minute without
 * a flush or a redeploy.
 *
 *   # look at what would change (default — writes nothing)
 *   MONGODB_URI="<demo Atlas SRV string>" node scripts/backfill-cashflow.mjs
 *
 *   # apply it
 *   MONGODB_URI="<demo Atlas SRV string>" node scripts/backfill-cashflow.mjs --apply
 *
 * Flags:
 *   --apply      perform the writes (otherwise it is a dry run)
 *   --overwrite  also recompute listings that already carry a cash-flow figure
 *
 * Values come from two places, in order:
 *   1. The seeded demo catalogue, matched on title — the authored figure.
 *   2. An industry-typical margin applied to the listing's monthly revenue,
 *      for anything created through the UI. Deterministic, so re-running
 *      never produces a different number for the same listing.
 */

import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { listings as demoListings } from './seed.mjs';

// Fall back to the API's own .env so the connection string can stay in the file
// that already holds it instead of being pasted onto a command line (where it
// lands in shell history). An explicit MONGODB_URI in the environment wins.
if (!process.env.MONGODB_URI) {
  try {
    process.loadEnvFile(new URL('../.env', import.meta.url));
  } catch {
    // No .env — the missing-URI message below explains what to do.
  }
}

const MONGODB_URI = process.env.MONGODB_URI;
const APPLY = process.argv.includes('--apply');
const OVERWRITE = process.argv.includes('--overwrite');

// A `mongodb+srv://` URI needs a real SRV lookup, and some resolvers (corporate
// DNS, a few home routers) refuse those while ordinary hostname lookups still
// work — the driver then fails with `querySrv ECONNREFUSED`. Setting
// DNS_SERVERS=1.1.1.1,8.8.8.8 routes the lookup somewhere that answers.
if (process.env.DNS_SERVERS) {
  const { setServers } = await import('node:dns');
  setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
}

/**
 * Seller's discretionary earnings as a share of revenue, by industry. Derived
 * from the seeded catalogue so a UI-created listing lands in the same range as
 * the authored ones rather than reading as an outlier.
 */
const MARGIN_BY_INDUSTRY = {
  food: 0.19,
  retail: 0.21,
  services: 0.3,
  tech: 0.33,
  others: 0.27,
};
const DEFAULT_MARGIN = 0.25;

/** Authored figures from the demo catalogue, keyed by title. */
const seeded = new Map(
  demoListings
    .filter((l) => typeof l.monthlyCashFlow === 'number')
    .map((l) => [l.title, l.monthlyCashFlow]),
);

/**
 * Pick a cash-flow figure for one listing, or null when there is nothing
 * defensible to derive it from (no revenue means no basis for a guess, and a
 * wrong number is worse than a missing one).
 */
export function cashFlowFor(listing) {
  const authored = seeded.get(listing.title);
  if (authored) return { value: authored, source: 'seed catalogue' };

  const revenue = Number(listing.monthlyRevenue);
  if (!Number.isFinite(revenue) || revenue <= 0) return null;

  const margin = MARGIN_BY_INDUSTRY[listing.industry] ?? DEFAULT_MARGIN;
  // Round to the nearest 100 so the figure reads like a seller's estimate
  // rather than a computed artefact.
  const value = Math.round((revenue * margin) / 100) * 100;
  if (value <= 0) return null;

  return { value, source: `${Math.round(margin * 100)}% of revenue` };
}

const money = (n) => `$${n.toLocaleString('en-US')}`;

async function main() {
  if (!MONGODB_URI) {
    console.error(
      'MONGODB_URI is required. Point it at the database you want to repair\n' +
        "(the demo one lives in the Render service's MONGODB_URI env var).",
    );
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(MONGODB_URI);
  const collection = mongoose.connection.collection('listingrecords');

  const query = OVERWRITE
    ? {}
    : {
        $or: [
          { monthlyCashFlow: { $exists: false } },
          { monthlyCashFlow: null },
          { monthlyCashFlow: 0 },
        ],
      };
  const docs = await collection.find(query).toArray();

  console.log(
    `${APPLY ? 'Backfilling' : 'Dry run —'} ${docs.length} listing(s) ` +
      `${OVERWRITE ? '(overwriting existing figures)' : 'missing a cash-flow figure'} ` +
      `in ${mongoose.connection.name}\n`,
  );

  let updated = 0;
  const skipped = [];

  for (const doc of docs) {
    const result = cashFlowFor(doc);
    if (!result) {
      skipped.push(doc.title);
      continue;
    }

    const { value, source } = result;
    const multiple =
      doc.askingPrice > 0 ? doc.askingPrice / (value * 12) : null;
    console.log(
      `  ${APPLY ? '✓' : '·'} ${doc.title} → ${money(value)}/mo ` +
        `(${source}${multiple ? `, ${multiple.toFixed(1)}× cash flow` : ''})`,
    );

    if (APPLY) {
      await collection.updateOne(
        { _id: doc._id },
        { $set: { monthlyCashFlow: value } },
      );
    }
    updated += 1;
  }

  if (skipped.length > 0) {
    console.log(
      `\nSkipped ${skipped.length} with no revenue to derive from: ` +
        skipped.join(', '),
    );
  }

  console.log(
    APPLY
      ? `\nDone: ${updated} listing(s) updated. The browse cache expires within 60 s.`
      : `\n${updated} listing(s) would be updated. Re-run with --apply to write.`,
  );

  await mongoose.disconnect();
}

// Only connect when run directly, so `cashFlowFor` can be imported and tested
// without a database.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(async (err) => {
    console.error(err);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
  });
}

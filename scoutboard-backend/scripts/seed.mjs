#!/usr/bin/env node
/**
 * Seed a running ScoutBoard API with realistic demo listings.
 *
 * Goes through the real, validated `POST /listings` endpoint so seeding can't
 * drift from production behaviour (same DTO rules, cache invalidation, and
 * WebSocket broadcast as a user-created listing).
 *
 *   API_URL=https://your-api.onrender.com pnpm --filter scoutboard-backend seed
 *
 * Defaults to http://localhost:3000. Re-running adds another copy of every
 * listing; delete the extras with the admin key if you double-seed.
 *
 * Listings flagged `verified` here get a follow-up call to the admin-guarded
 * PATCH /listings/:id/verify route, because verification is a platform
 * decision and deliberately is not a field POST /listings will accept. Set
 * ADMIN_API_KEY to match the API when its own ADMIN_API_KEY is set.
 */

const API_URL = (process.env.API_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

const listings = [
  {
    title: 'Copper Kettle Café',
    verified: true,
    industry: 'food',
    location: 'Portland, OR',
    askingPrice: 185000,
    monthlyRevenue: 21000,
    monthlyCashFlow: 4200,
    establishedYear: 2014,
    description:
      'Neighborhood espresso bar with a loyal weekday crowd and a wholesale pastry account. Lease runs through 2029 at a fixed rate. Owner is relocating and will train for 30 days.',
  },
  {
    title: 'Northside Bike Works',
    verified: true,
    industry: 'retail',
    location: 'Minneapolis, MN',
    askingPrice: 240000,
    monthlyRevenue: 32000,
    monthlyCashFlow: 6800,
    establishedYear: 2009,
    description:
      'Full-service bicycle shop with repair bays, two brand dealerships, and a strong spring/summer season. Includes $60k of inventory at cost and all fixtures.',
  },
  {
    title: 'Brightline Cleaning Co.',
    verified: true,
    industry: 'services',
    location: 'Austin, TX',
    askingPrice: 320000,
    monthlyRevenue: 41000,
    monthlyCashFlow: 9800,
    establishedYear: 2016,
    description:
      'Commercial janitorial company with 22 recurring contracts across office parks and clinics. Six W-2 staff, two vans, and documented SOPs. Owner works ~10 hrs/week.',
  },
  {
    title: 'Pixel & Pine Studio',
    verified: true,
    industry: 'tech',
    location: 'Remote',
    askingPrice: 410000,
    monthlyRevenue: 28000,
    monthlyCashFlow: 9200,
    establishedYear: 2018,
    description:
      'Shopify theme and app studio with $19k MRR from three published apps plus retainer clients. Fully remote team of contractors. Clean codebase, 4.8★ app store ratings.',
  },
  {
    title: 'Harbor Street Laundromat',
    industry: 'services',
    location: 'Baltimore, MD',
    askingPrice: 275000,
    monthlyRevenue: 18500,
    monthlyCashFlow: 7400,
    establishedYear: 2005,
    description:
      'Unattended 24-hour laundromat with 34 machines converted to card payment in 2022. Real estate not included; favorable 10-year lease. Semi-absentee operation.',
  },
  {
    title: 'Saffron Table',
    verified: true,
    industry: 'food',
    location: 'Jersey City, NJ',
    askingPrice: 350000,
    monthlyRevenue: 58000,
    monthlyCashFlow: 9600,
    establishedYear: 2012,
    description:
      'Well-reviewed 60-seat Indian restaurant with liquor license and strong delivery mix (35% of sales). Fully equipped kitchen, recent hood and walk-in replacement.',
  },
  {
    title: 'Evergreen Pet Supply',
    industry: 'retail',
    location: 'Boise, ID',
    askingPrice: 145000,
    monthlyRevenue: 26000,
    monthlyCashFlow: 5200,
    establishedYear: 2017,
    description:
      'Independent pet store with grooming suite and self-serve dog wash. Loyalty program with 3,400 active members. Growing raw-food segment. Owner financing available.',
  },
  {
    title: 'Ledger Lane Bookkeeping',
    verified: true,
    industry: 'services',
    location: 'Raleigh, NC',
    askingPrice: 190000,
    monthlyRevenue: 15500,
    monthlyCashFlow: 6100,
    establishedYear: 2011,
    description:
      'Bookkeeping practice serving 68 small-business clients on monthly retainers. 96% annual retention. QuickBooks ProAdvisor firm. Owner will stay through one tax season.',
  },
  {
    title: 'Sunset Board Rentals',
    industry: 'others',
    location: 'San Diego, CA',
    askingPrice: 98000,
    monthlyRevenue: 12000,
    monthlyCashFlow: 3400,
    establishedYear: 2019,
    description:
      'Beachfront paddleboard and kayak rental kiosk with city permit through 2027. Highly seasonal but low overhead. 120 boards/boats included. Turnkey summer business.',
  },
  {
    title: 'Redwood Data Backup',
    verified: true,
    industry: 'tech',
    location: 'Sacramento, CA',
    askingPrice: 520000,
    monthlyRevenue: 36000,
    monthlyCashFlow: 12500,
    establishedYear: 2013,
    description:
      'Managed backup and disaster-recovery provider for 140 SMB clients on annual contracts. 82% gross margin, churn under 5%. Two senior engineers willing to stay.',
  },
  {
    title: 'Maple & Main Bakery',
    verified: true,
    industry: 'food',
    location: 'Burlington, VT',
    askingPrice: 165000,
    monthlyRevenue: 19000,
    monthlyCashFlow: 3900,
    establishedYear: 2008,
    description:
      'Scratch bakery with a downtown storefront and farmers-market presence. Wholesale accounts with four local cafés. Recipes, brand, and equipment included.',
  },
  {
    title: 'Ironclad Fitness',
    industry: 'others',
    location: 'Columbus, OH',
    askingPrice: 230000,
    monthlyRevenue: 24000,
    monthlyCashFlow: 6200,
    establishedYear: 2015,
    description:
      'Boutique strength gym with 310 members on auto-pay and small-group coaching programs. 6,000 sq ft space, equipment fully paid off. Strong community and reviews.',
  },
];

const ADMIN_KEY = process.env.ADMIN_API_KEY;

/**
 * Grant the verified badge. Separate from creation on purpose: the seller
 * cannot claim it, so it only moves through the admin-guarded route.
 */
async function verify(id, title) {
  const res = await fetch(`${API_URL}/listings/${id}/verify`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(ADMIN_KEY ? { 'x-admin-key': ADMIN_KEY } : {}),
    },
    body: JSON.stringify({ verified: true }),
  });
  if (!res.ok) {
    console.error(
      `    ! could not verify ${title} → ${res.status} ${await res.text()}`,
    );
    return false;
  }
  return true;
}

async function main() {
  console.log(`Seeding ${listings.length} listings into ${API_URL} ...`);
  let ok = 0;
  let verified = 0;
  for (const { verified: shouldVerify, ...listing } of listings) {
    const res = await fetch(`${API_URL}/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listing),
    });
    if (res.ok) {
      ok += 1;
      const created = await res.json();
      const badge = shouldVerify && (await verify(created._id, listing.title));
      if (badge) verified += 1;
      console.log(`  ✓ ${listing.title}${badge ? ' (verified)' : ''}`);
    } else {
      console.error(`  ✗ ${listing.title} → ${res.status} ${await res.text()}`);
    }
  }
  console.log(`Done: ${ok}/${listings.length} created, ${verified} verified.`);
  if (ok !== listings.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

// Seeds 20 fake Philadelphia profiles so matching can be demoed with a handful of real accounts.
//
//   npm run seed            create (or refresh) the seed profiles and recompute all matches
//   npm run seed -- --reset delete the seed accounts and recompute
//
// Seed accounts use emails ending in @seed.complement.test and the password below, so you can
// also sign in as one of them to see the other side of an intro.

import { createClient } from "@supabase/supabase-js";
import { recomputeAll } from "../src/lib/matching/recompute";
import type { ProfileRow } from "../src/lib/profile";

const DOMAIN = "seed.complement.test";
export const SEED_PASSWORD = "complement-demo-1";

type Seed = Partial<ProfileRow> & { full_name: string };

const DEFAULT_PUBLIC = ["headline", "location", "achievements", "strengths", "looking_for", "proof", "priorities"];

const SEEDS: Seed[] = [
  {
    full_name: "Maya Okafor", headline: "Growth lead, ex-Goldbelly", seeking: ["cofounder"], open_to: ["cofounder", "advising"],
    strengths: ["growth_marketing", "content", "brand", "community"], needs: ["engineering", "ai_ml"], weaknesses: ["finance", "engineering"],
    achievements: "Took a food DTC brand from 2k to 60k customers in 18 months with paid social and creator partnerships.",
    priorities: "Find a technical co-founder for a meal-planning app for busy Philly families.", hours_per_week: 25, compensation: "equity",
    timeline: "now", comm_style: "sync", pace: 4, risk_tolerance: 4, proof_url: "https://example.com/maya", proof_verified: true,
  },
  {
    full_name: "Dev Patel", headline: "Senior engineer at a Philly healthtech", seeking: ["cofounder"], open_to: ["cofounder", "paid_work"],
    strengths: ["engineering", "ai_ml", "data"], needs: ["sales", "growth_marketing", "fundraising"], weaknesses: ["sales", "content"],
    achievements: "Built the scheduling engine used by 40 clinics. Shipped two side projects with paying users.",
    priorities: "Leave my job within six months to build an AI tool for independent clinics.", hours_per_week: 20, compensation: "equity",
    timeline: "1-3m", comm_style: "async", pace: 4, risk_tolerance: 3, proof_url: "https://github.com/example", proof_verified: true,
  },
  {
    full_name: "Rosa Delgado", headline: "Freelance product designer", seeking: ["paid_collaborator"], open_to: ["paid_work", "cofounder"],
    strengths: ["design", "brand", "product"], needs: ["engineering", "sales"], weaknesses: ["finance", "sales"],
    achievements: "Designed apps for SEPTA Key pilots and three seed-stage startups.", priorities: "Pair with an engineer to offer design + build packages.",
    hours_per_week: 15, compensation: "cash", timeline: "now", comm_style: "mixed", pace: 3, risk_tolerance: 2, proof_url: "https://example.com/rosa-portfolio",
  },
  {
    full_name: "James Whitfield", headline: "Ex-VP Sales, B2B SaaS", seeking: ["cofounder", "advisor"], open_to: ["cofounder", "advising", "mentoring"],
    strengths: ["sales", "partnerships", "fundraising", "recruiting"], needs: ["engineering", "product"], weaknesses: ["engineering", "design"],
    achievements: "Grew ARR from $1M to $14M and hired a 30-person sales team. Raised a $6M Series A.",
    priorities: "Find a technical partner for a vertical SaaS idea in construction.", hours_per_week: 30, compensation: "equity",
    timeline: "now", comm_style: "sync", pace: 5, risk_tolerance: 4, proof_url: "https://example.com/james", proof_verified: true,
  },
  {
    full_name: "Priya Raman", headline: "ML researcher, Penn", seeking: ["cofounder", "mentor"], open_to: ["cofounder", "paid_work"],
    strengths: ["ai_ml", "data", "engineering"], needs: ["product", "sales", "fundraising"], weaknesses: ["sales", "operations"],
    achievements: "Published work on medical imaging models; built a prototype that reads chest X-rays with 94% accuracy.",
    priorities: "Turn my research into a product and learn how fundraising works.", hours_per_week: 15, compensation: "equity",
    timeline: "3-6m", comm_style: "async", pace: 3, risk_tolerance: 3, proof_url: "https://example.com/priya-paper", proof_verified: true,
  },
  {
    full_name: "Marcus Bell", headline: "Founder, Fishtown coffee roaster", seeking: ["paid_collaborator", "advisor"], open_to: ["mentoring"],
    strengths: ["operations", "customer_success", "community"], needs: ["growth_marketing", "content", "engineering"], weaknesses: ["growth_marketing", "data"],
    achievements: "Opened two cafes and a wholesale line in 40 local shops. Profitable since year two.",
    priorities: "Launch online subscriptions and grow beyond word of mouth.", hours_per_week: 10, compensation: "cash",
    timeline: "now", comm_style: "sync", pace: 3, risk_tolerance: 2,
  },
  {
    full_name: "Hannah Kim", headline: "Content creator, 120k on TikTok", seeking: ["cofounder", "paid_collaborator"], open_to: ["paid_work", "cofounder"],
    strengths: ["content", "community", "brand"], needs: ["engineering", "operations", "finance"], weaknesses: ["finance", "operations"],
    achievements: "Built an audience of 120k around budget travel; sold out two group trips.", priorities: "Build a product for my audience instead of only doing sponsorships.",
    hours_per_week: 20, compensation: "mix", timeline: "now", comm_style: "mixed", pace: 5, risk_tolerance: 5, proof_url: "https://example.com/hannah",
  },
  {
    full_name: "Tom Brennan", headline: "Fractional CFO for startups", seeking: [], open_to: ["advising", "paid_work", "mentoring"],
    strengths: ["finance", "fundraising", "operations", "legal"], needs: [], weaknesses: ["design", "content"],
    achievements: "CFO for 12 startups; helped close $40M in rounds.", priorities: "Take on two more early-stage clients this quarter.",
    hours_per_week: 8, compensation: "cash", timeline: "now", comm_style: "async", pace: 3, risk_tolerance: 2, proof_url: "https://example.com/tom", proof_verified: true,
  },
  {
    full_name: "Aisha Johnson", headline: "Full-stack developer", seeking: ["paid_collaborator"], open_to: ["paid_work", "cofounder"],
    strengths: ["engineering", "design", "product"], needs: ["sales", "growth_marketing"], weaknesses: ["sales", "partnerships"],
    achievements: "Shipped 15 client web apps; built a Shopify app with 900 installs.", priorities: "Find someone to bring in clients so I can focus on building.",
    hours_per_week: 25, compensation: "cash", timeline: "now", comm_style: "async", pace: 4, risk_tolerance: 3, proof_url: "https://github.com/example-aisha", proof_verified: true,
  },
  {
    full_name: "Luis Moreno", headline: "Operations manager, logistics", seeking: ["cofounder"], open_to: ["cofounder"],
    strengths: ["operations", "recruiting", "customer_success"], needs: ["engineering", "fundraising"], weaknesses: ["engineering", "content"],
    achievements: "Ran a 60-person warehouse team and cut fulfillment time by 35%.", priorities: "Start a last-mile delivery company for Philly restaurants.",
    hours_per_week: 20, compensation: "equity", timeline: "1-3m", comm_style: "sync", pace: 4, risk_tolerance: 3,
  },
  {
    full_name: "Grace Liu", headline: "Product manager, ex-Comcast", seeking: ["cofounder"], open_to: ["cofounder", "advising"],
    strengths: ["product", "data", "design"], needs: ["engineering", "sales"], weaknesses: ["sales", "fundraising"],
    achievements: "Led a product used by 3M Xfinity customers; launched two 0-to-1 features.", priorities: "Validate a B2B idea for property managers.",
    hours_per_week: 20, compensation: "equity", timeline: "now", comm_style: "mixed", pace: 4, risk_tolerance: 3, proof_url: "https://example.com/grace",
  },
  {
    full_name: "Sam Rivera", headline: "Community organizer and event host", seeking: ["paid_collaborator", "mentor"], open_to: ["paid_work"],
    strengths: ["community", "partnerships", "content"], needs: ["engineering", "finance"], weaknesses: ["finance", "data"],
    achievements: "Runs monthly founder meetups with 400 members in Philly.", priorities: "Build a paid membership with an app.",
    hours_per_week: 12, compensation: "mix", timeline: "1-3m", comm_style: "sync", pace: 3, risk_tolerance: 3,
  },
  {
    full_name: "Nora Feld", headline: "Startup lawyer", seeking: [], open_to: ["advising", "mentoring", "paid_work"],
    strengths: ["legal", "fundraising", "finance"], needs: [], weaknesses: ["engineering", "design"],
    achievements: "Advised 80+ startups on formation, SAFEs and priced rounds.", priorities: "Mentor first-time founders.",
    hours_per_week: 5, compensation: "cash", timeline: "now", comm_style: "async", pace: 3, risk_tolerance: 2, proof_url: "https://example.com/nora", proof_verified: true,
  },
  {
    full_name: "Kwame Asante", headline: "Hardware engineer, robotics", seeking: ["cofounder"], open_to: ["cofounder"],
    strengths: ["hardware", "engineering"], needs: ["sales", "fundraising", "operations"], weaknesses: ["sales", "fundraising"],
    achievements: "Built a delivery robot prototype at a Pennovation lab.", priorities: "Find a business co-founder to take robots to warehouses.",
    hours_per_week: 30, compensation: "equity", timeline: "now", comm_style: "mixed", pace: 5, risk_tolerance: 5, proof_url: "https://example.com/kwame", proof_verified: true,
  },
  {
    full_name: "Elena Petrova", headline: "Data analyst, retail", seeking: ["mentor"], open_to: ["paid_work"],
    strengths: ["data", "finance"], needs: ["product", "engineering"], weaknesses: ["sales", "content"],
    achievements: "Built forecasting dashboards that cut inventory waste 20%.", priorities: "Move into product and learn from someone who has done it.",
    hours_per_week: 6, compensation: "cash", timeline: "exploring", comm_style: "async", pace: 2, risk_tolerance: 2,
  },
  {
    full_name: "Chris Duffy", headline: "Serial founder (2 exits)", seeking: [], open_to: ["mentoring", "advising"],
    strengths: ["product", "fundraising", "sales", "recruiting"], needs: [], weaknesses: ["ai_ml"],
    achievements: "Founded and sold two SaaS companies; angel investor in 25 startups.", priorities: "Give back to the Philly scene.",
    hours_per_week: 4, compensation: "mix", timeline: "now", comm_style: "mixed", pace: 4, risk_tolerance: 4, proof_url: "https://example.com/chris", proof_verified: true,
  },
  {
    full_name: "Fatima Noor", headline: "Brand designer", seeking: ["paid_collaborator"], open_to: ["paid_work"],
    strengths: ["brand", "design", "content"], needs: ["sales", "growth_marketing"], weaknesses: ["sales", "finance"],
    achievements: "Rebranded 30 local businesses, including two James Beard restaurants.", priorities: "Find a partner who sells so I can design.",
    hours_per_week: 20, compensation: "cash", timeline: "now", comm_style: "mixed", pace: 3, risk_tolerance: 3, proof_url: "https://example.com/fatima",
  },
  {
    full_name: "Ben Carter", headline: "Sales rep turned founder", seeking: ["cofounder", "paid_collaborator"], open_to: ["cofounder"],
    strengths: ["sales", "partnerships", "customer_success"], needs: ["engineering", "design", "product"], weaknesses: ["engineering", "design"],
    achievements: "Top rep three years running; pre-sold 12 pilots for a scheduling tool I want to build.",
    priorities: "Get an MVP built for the 12 pilot customers waiting.", hours_per_week: 35, compensation: "mix",
    timeline: "now", comm_style: "sync", pace: 5, risk_tolerance: 4,
  },
  {
    full_name: "Olivia Chen", headline: "Growth marketer, fintech", seeking: ["cofounder"], open_to: ["cofounder", "paid_work"],
    strengths: ["growth_marketing", "data", "content"], needs: ["engineering", "legal"], weaknesses: ["engineering", "legal"],
    achievements: "Scaled a fintech app from 10k to 400k users with referral loops.", priorities: "Start a personal finance app for gig workers.",
    hours_per_week: 20, compensation: "equity", timeline: "1-3m", comm_style: "async", pace: 4, risk_tolerance: 4, proof_url: "https://example.com/olivia", proof_verified: true,
  },
  {
    full_name: "Daniel Osei", headline: "Remote-first backend engineer", city: "Pittsburgh", remote_ok: true, seeking: ["cofounder"], open_to: ["cofounder", "paid_work"],
    strengths: ["engineering", "data"], needs: ["sales", "growth_marketing"], weaknesses: ["sales", "brand"],
    achievements: "Scaled payment APIs to 2k requests/second at a Pittsburgh startup.", priorities: "Join a business founder as technical co-founder, remotely.",
    hours_per_week: 20, compensation: "equity", timeline: "now", comm_style: "async", pace: 4, risk_tolerance: 4, proof_url: "https://github.com/example-daniel", proof_verified: true,
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // Find existing seed users.
  const existing = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users) if (u.email?.endsWith(`@${DOMAIN}`)) existing.set(u.email, u.id);
    if (data.users.length < 200) break;
  }

  if (process.argv.includes("--reset")) {
    for (const id of existing.values()) await admin.auth.admin.deleteUser(id);
    const r = await recomputeAll(admin);
    console.log(`Deleted ${existing.size} seed accounts. ${r.pairs} matches remain.`);
    return;
  }

  for (const [i, s] of SEEDS.entries()) {
    const email = `${s.full_name.toLowerCase().replace(/[^a-z]+/g, ".")}@${DOMAIN}`;
    let id = existing.get(email);
    if (!id) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: SEED_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: s.full_name },
      });
      if (error) throw error;
      id = data.user.id;
    }
    const { error } = await admin
      .from("profiles")
      .update({
        city: "Philadelphia",
        remote_ok: false,
        meet_in_person: true,
        strengths_note: "",
        weaknesses_note: "",
        proof_url: "",
        proof_verified: false,
        public_fields: DEFAULT_PUBLIC,
        ...s,
        contact_email: email,
        contact_linkedin: `https://www.linkedin.com/in/demo-${i + 1}`,
        onboarded: true,
      })
      .eq("id", id);
    if (error) throw error;
  }

  const r = await recomputeAll(admin);
  console.log(`Seeded ${SEEDS.length} profiles. ${r.profiles} onboarded profiles, ${r.pairs} mutual matches.`);
  console.log(`Seed logins: <name>@${DOMAIN} / ${SEED_PASSWORD} (e.g. maya.okafor@${DOMAIN})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ScanLine,
  AlarmClock,
  ChefHat,
  Users,
  Check,
  Menu,
  X,
  Github,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Button from "@/components/ui/Button";

/** Inline two-tone fridge logo (red body, gold handle) used in the top nav + footer. */
function FridgeLogo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="6"
        y="3"
        width="20"
        height="26"
        rx="3"
        fill="var(--color-primary)"
      />
      <rect
        x="8"
        y="5"
        width="16"
        height="9"
        rx="1.5"
        fill="var(--color-surface)"
      />
      <rect
        x="8"
        y="16"
        width="16"
        height="11"
        rx="1.5"
        fill="var(--color-surface)"
      />
      <rect
        x="10"
        y="8"
        width="2"
        height="3.5"
        rx="1"
        fill="var(--color-accent)"
      />
      <rect
        x="10"
        y="19"
        width="2"
        height="4"
        rx="1"
        fill="var(--color-accent)"
      />
    </svg>
  );
}

/** Decorative hero SVG — fridge + floating duotone produce + £730 badge. */
function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 500 500"
      className="h-full w-full max-w-[500px]"
      role="img"
      aria-label="Illustration of a fridge saving money on food waste"
    >
      <defs>
        <linearGradient id="fridgeGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>
      </defs>

      {/* Soft backdrop blob */}
      <circle cx="250" cy="250" r="210" fill="#FEF2F2" />
      <circle cx="370" cy="140" r="60" fill="#FDE68A" opacity="0.55" />
      <circle cx="120" cy="380" r="50" fill="#FCA5A5" opacity="0.45" />

      {/* Fridge body */}
      <g>
        <rect
          x="155"
          y="90"
          width="190"
          height="310"
          rx="22"
          fill="url(#fridgeGrad)"
        />
        <rect x="170" y="105" width="160" height="115" rx="10" fill="#FFFFFF" />
        <rect x="170" y="230" width="160" height="155" rx="10" fill="#FFFFFF" />
        {/* Handles */}
        <rect
          x="180"
          y="135"
          width="8"
          height="40"
          rx="4"
          fill="url(#goldGrad)"
        />
        <rect
          x="180"
          y="260"
          width="8"
          height="55"
          rx="4"
          fill="url(#goldGrad)"
        />
        {/* Shelf lines */}
        <line
          x1="180"
          y1="265"
          x2="320"
          y2="265"
          stroke="#FEF2F2"
          strokeWidth="2"
        />
        <line
          x1="180"
          y1="320"
          x2="320"
          y2="320"
          stroke="#FEF2F2"
          strokeWidth="2"
        />
        {/* Contents inside top freezer */}
        <circle cx="210" cy="160" r="10" fill="#F87171" />
        <rect x="235" y="145" width="28" height="30" rx="4" fill="#FDE68A" />
        <circle cx="295" cy="160" r="12" fill="#CA8A04" opacity="0.8" />
        {/* Fridge main compartment items */}
        <rect x="200" y="240" width="22" height="20" rx="3" fill="#F87171" />
        <circle cx="255" cy="248" r="9" fill="#CA8A04" />
        <rect x="280" y="237" width="30" height="24" rx="3" fill="#FCA5A5" />
        <rect x="200" y="290" width="42" height="22" rx="3" fill="#FDE68A" />
        <circle cx="270" cy="300" r="10" fill="#DC2626" opacity="0.75" />
        <rect x="290" y="345" width="26" height="28" rx="3" fill="#F87171" />
      </g>

      {/* £730 badge */}
      <g>
        <circle cx="395" cy="155" r="58" fill="url(#goldGrad)" />
        <circle
          cx="395"
          cy="155"
          r="58"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="4"
        />
        <text
          x="395"
          y="150"
          textAnchor="middle"
          fontFamily="Caveat, cursive"
          fontSize="46"
          fontWeight="700"
          fill="#FFFFFF"
        >
          £730
        </text>
        <text
          x="395"
          y="178"
          textAnchor="middle"
          fontFamily="Quicksand, sans-serif"
          fontSize="11"
          fontWeight="700"
          fill="#FFFFFF"
          letterSpacing="2"
        >
          SAVED/YR
        </text>
      </g>

      {/* Floating apple with label */}
      <g>
        <circle cx="95" cy="200" r="26" fill="#DC2626" />
        <path
          d="M95 176 Q100 168 108 170"
          stroke="#16A34A"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <rect
          x="30"
          y="235"
          width="95"
          height="26"
          rx="13"
          fill="#FFFFFF"
          stroke="#FCA5A5"
          strokeWidth="2"
        />
        <text
          x="77"
          y="253"
          textAnchor="middle"
          fontFamily="Quicksand, sans-serif"
          fontSize="12"
          fontWeight="700"
          fill="#450A0A"
        >
          Apples · 3d
        </text>
      </g>

      {/* Milk carton with label */}
      <g>
        <path
          d="M100 340 L140 340 L140 335 L130 318 L110 318 L100 335 Z"
          fill="#FFFFFF"
          stroke="#CA8A04"
          strokeWidth="2"
        />
        <rect
          x="106"
          y="342"
          width="28"
          height="38"
          fill="#FFFFFF"
          stroke="#CA8A04"
          strokeWidth="2"
        />
        <rect x="110" y="352" width="20" height="6" fill="#CA8A04" />
        <rect
          x="50"
          y="390"
          width="110"
          height="26"
          rx="13"
          fill="#FFFFFF"
          stroke="#FDE68A"
          strokeWidth="2"
        />
        <text
          x="105"
          y="408"
          textAnchor="middle"
          fontFamily="Quicksand, sans-serif"
          fontSize="12"
          fontWeight="700"
          fill="#450A0A"
        >
          Milk · today
        </text>
      </g>

      {/* Floating sparkle */}
      <g opacity="0.9">
        <path
          d="M430 320 L436 335 L451 341 L436 347 L430 362 L424 347 L409 341 L424 335 Z"
          fill="#CA8A04"
        />
      </g>
    </svg>
  );
}

interface FeatureCardProps {
  Icon: typeof ScanLine;
  title: string;
  body: string;
  tint: string;
  iconBg: string;
  iconColor: string;
}

function FeatureCard({
  Icon,
  title,
  body,
  tint,
  iconBg,
  iconColor,
}: FeatureCardProps) {
  return (
    <div
      className={`group rounded-3xl border border-primary/10 ${tint} p-8 shadow-lg transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-xl`}
    >
      <div
        className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full ${iconBg} ${iconColor} transition-transform duration-200 ease-out group-hover:scale-110`}
      >
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="font-display text-4xl leading-none text-text-primary">
        {title}
      </h3>
      <p className="mt-3 text-base text-text-muted">{body}</p>
    </div>
  );
}

interface StepProps {
  number: string;
  title: string;
  body: string;
}

function Step({ number, title, body }: StepProps) {
  return (
    <div className="flex flex-1 flex-col items-start text-left md:items-center md:text-center">
      <span className="font-display text-7xl leading-none text-primary">
        {number}
      </span>
      <h3 className="mt-3 font-display text-4xl leading-none text-text-primary">
        {title}
      </h3>
      <p className="mt-2 max-w-xs text-base text-text-muted">{body}</p>
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = (
    <>
      <a
        href="#features"
        className="text-sm font-semibold text-text-muted transition-colors duration-200 hover:text-primary cursor-pointer"
        onClick={() => setMobileOpen(false)}
      >
        Features
      </a>
      <a
        href="#how-it-works"
        className="text-sm font-semibold text-text-muted transition-colors duration-200 hover:text-primary cursor-pointer"
        onClick={() => setMobileOpen(false)}
      >
        How it works
      </a>
      <Link
        to="/login"
        className="text-sm font-semibold text-text-muted transition-colors duration-200 hover:text-primary cursor-pointer"
        onClick={() => setMobileOpen(false)}
      >
        Log in
      </Link>
    </>
  );

  return (
    <div className="min-h-screen bg-surface text-text-primary">
      {/* A. Top nav */}
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-200 ${
          scrolled
            ? "bg-surface/85 backdrop-blur-md shadow-sm border-b border-border"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3 md:px-8">
          <Link to="/" className="flex items-center gap-2 cursor-pointer">
            <FridgeLogo className="h-8 w-8" />
            <span className="font-display text-3xl leading-none text-primary">
              FridgeCheck
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">{navLinks}</nav>

          <div className="hidden md:block">
            <Link to="/register">
              <Button>Sign up</Button>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-primary transition-colors duration-150 hover:bg-primary/10 md:hidden cursor-pointer focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20"
          >
            {mobileOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile slide-down menu */}
        {mobileOpen && (
          <div className="border-t border-border bg-surface shadow-lg md:hidden">
            <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-5">
              {navLinks}
              <Link to="/register" onClick={() => setMobileOpen(false)}>
                <Button className="w-full">Sign up</Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* B. Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-surface-subtle to-surface">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-16 md:grid-cols-2 md:gap-16 md:px-8 md:py-24">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Stop throwing away money
            </p>
            <h1 className="font-display text-5xl leading-[1.05] text-text-primary sm:text-6xl md:text-7xl">
              Save £730 a year. One fridge at a time.
            </h1>
            <p className="mt-6 max-w-prose text-lg text-text-muted">
              The average UK household bins that much food every year.
              FridgeCheck tracks what you have, warns you before it expires, and
              suggests recipes for what's about to go off.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register">
                <Button size="lg">
                  Start saving — it's free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="secondary">
                  I have an account
                </Button>
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
              {["No credit card", "Works on any device", "Privacy-first"].map(
                (chip) => (
                  <li
                    key={chip}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted"
                  >
                    <Check className="h-4 w-4 text-[color:var(--color-accent)]" />
                    {chip}
                  </li>
                ),
              )}
            </ul>
          </div>

          <div className="flex items-center justify-center">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* C. Problem */}
      <section className="bg-surface py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              The problem
            </p>
            <h2 className="font-display text-5xl leading-none text-text-primary md:text-6xl">
              Food waste is expensive — and invisible.
            </h2>
            <p className="mt-5 text-lg text-text-muted">
              You don't notice the cost because it happens one forgotten
              courgette at a time. The numbers, though, are brutal.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                stat: "£730",
                copy: "wasted per UK household every year",
                source: "Source: WRAP",
              },
              {
                stat: "4.5M tonnes",
                copy: "of edible food binned annually in the UK",
                source: "Source: WRAP, UK Food Waste Report",
              },
              {
                stat: "60%",
                copy: "of that waste is avoidable — mostly expired items",
                source: "Source: WRAP household study",
              },
            ].map((s) => (
              <div
                key={s.stat}
                className="rounded-3xl border border-primary/10 bg-surface-subtle p-8 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <p className="font-display text-6xl leading-none text-[color:var(--color-accent)] md:text-7xl">
                  {s.stat}
                </p>
                <p className="mt-4 text-base font-semibold text-text-primary">
                  {s.copy}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {s.source}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* D. Features */}
      <section id="features" className="bg-surface-subtle py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              What you get
            </p>
            <h2 className="font-display text-5xl leading-none text-text-primary md:text-6xl">
              Less admin. Less guilt. Better dinners.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <FeatureCard
              Icon={ScanLine}
              title="Scan a barcode"
              body="Point your camera at a product, we auto-fill the name, category, and a sensible expiry date. Zero typing."
              tint="bg-surface"
              iconBg="bg-primary/10"
              iconColor="text-primary"
            />
            <FeatureCard
              Icon={AlarmClock}
              title="Expiry warnings"
              body="Colour-coded urgency groups: use today, use this week, still fresh. We tell you in human language, not datetimes."
              tint="bg-[color:var(--color-surface-subtle)]"
              iconBg="bg-[color:var(--color-accent)]/15"
              iconColor="text-[color:var(--color-accent)]"
            />
            <FeatureCard
              Icon={ChefHat}
              title="Rescue Recipes"
              body="Claude-powered recipe ideas that use exactly what's about to expire. No more 'what can I do with a lonely courgette?'"
              tint="bg-primary/5"
              iconBg="bg-primary/10"
              iconColor="text-primary"
            />
            <FeatureCard
              Icon={Users}
              title="Household sharing"
              body="Invite your flatmates or family. Everyone sees the same pantry. One source of truth — less passive-aggressive sticky notes."
              tint="bg-[color:var(--color-accent)]/5"
              iconBg="bg-[color:var(--color-accent)]/15"
              iconColor="text-[color:var(--color-accent)]"
            />
          </div>
        </div>
      </section>

      {/* E. How it works */}
      <section id="how-it-works" className="bg-surface py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              How it works
            </p>
            <h2 className="font-display text-5xl leading-none text-text-primary md:text-6xl">
              Three steps. That's it.
            </h2>
          </div>

          <div className="relative mt-14">
            {/* Dashed connector arrow — desktop only */}
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute left-0 right-0 top-10 hidden h-8 w-full md:block"
              viewBox="0 0 1000 40"
              preserveAspectRatio="none"
            >
              <path
                d="M 150 20 L 850 20"
                stroke="var(--color-primary)"
                strokeWidth="2"
                strokeDasharray="6 8"
                strokeLinecap="round"
                opacity="0.35"
                fill="none"
              />
              <path
                d="M 850 20 L 840 14 M 850 20 L 840 26"
                stroke="var(--color-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.35"
                fill="none"
              />
            </svg>

            <div className="relative flex flex-col gap-12 md:flex-row md:gap-8">
              <Step
                number="1"
                title="Scan"
                body="Open FridgeCheck, tap Add, scan the barcode."
              />
              <Step
                number="2"
                title="Track"
                body="We watch the clock. You just get on with your day."
              />
              <Step
                number="3"
                title="Cook"
                body="When items are about to expire, we pop up recipes."
              />
            </div>
          </div>
        </div>
      </section>

      {/* F. CTA band */}
      <section className="bg-[color:var(--color-primary)] py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-4 text-center md:px-8">
          <Sparkles
            className="mx-auto mb-4 h-8 w-8 text-[color:var(--color-accent)]"
            aria-hidden="true"
          />
          <h2 className="font-display text-5xl leading-[1.05] text-white md:text-7xl">
            Ready to stop throwing money in the bin?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/85">
            Takes 30 seconds to sign up. No credit card. Cancel anytime — though
            you won't want to.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/register">
              <Button size="lg">Create free account</Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                variant="secondary"
                className="border-white bg-transparent text-white hover:bg-white hover:text-primary"
              >
                Log in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* G. Footer */}
      <footer className="bg-surface-subtle">
        <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-8 md:py-16">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2">
                <FridgeLogo className="h-7 w-7" />
                <span className="font-display text-3xl leading-none text-primary">
                  FridgeCheck
                </span>
              </div>
              <p className="mt-3 max-w-xs text-sm text-text-muted">
                A small app fighting a big, invisible problem — one expiry date
                at a time.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-primary">
                Product
              </h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <a
                    href="#features"
                    className="text-text-muted transition-colors duration-150 hover:text-primary cursor-pointer"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="text-text-muted transition-colors duration-150 hover:text-primary cursor-pointer"
                  >
                    How it works
                  </a>
                </li>
                <li>
                  <Link
                    to="/register"
                    className="text-text-muted transition-colors duration-150 hover:text-primary cursor-pointer"
                  >
                    Sign up
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-primary">
                Resources
              </h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <a
                    href="#"
                    className="inline-flex items-center gap-1.5 text-text-muted transition-colors duration-150 hover:text-primary cursor-pointer"
                  >
                    <Github className="h-4 w-4" />
                    GitHub
                  </a>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="text-text-muted transition-colors duration-150 hover:text-primary cursor-pointer"
                  >
                    Log in
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-primary">
                Legal
              </h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <a
                    href="#"
                    className="text-text-muted transition-colors duration-150 hover:text-primary cursor-pointer"
                  >
                    Privacy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-text-muted transition-colors duration-150 hover:text-primary cursor-pointer"
                  >
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 md:flex-row md:items-center">
            <p className="text-xs font-semibold text-text-muted">
              © 2026 FridgeCheck
            </p>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-surface px-3 py-1 text-xs font-semibold text-text-muted">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--color-accent)]" />
              Built with React, Tailwind & Claude
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm text-text-primary">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20 ${
          checked ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [days, setDays] = useState<Record<number, boolean>>({
    1: true,
    3: true,
    7: false,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-4xl sm:text-5xl leading-none text-text-primary">
          Settings
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Tweak FridgeCheck to work how you want it to.
        </p>
      </div>

      {/* Profile */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Profile
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Username</dt>
            <dd className="font-semibold text-text-primary">
              {user?.username}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-text-muted">Email</dt>
            <dd className="min-w-0 truncate font-semibold text-text-primary">
              {user?.email}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Notifications */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Notifications
        </h2>
        <div className="space-y-4">
          <Toggle
            checked={emailEnabled}
            onChange={setEmailEnabled}
            label="Email reminders"
          />
          <div>
            <p className="mb-2 text-sm text-text-primary">
              Remind me before expiry
            </p>
            <div className="flex flex-wrap gap-2">
              {[1, 3, 7].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays((s) => ({ ...s, [d]: !s[d] }))}
                  aria-pressed={days[d]}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    days[d]
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface text-text-muted hover:border-primary/50"
                  }`}
                >
                  {d} {d === 1 ? "day" : "days"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Danger zone */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Account
        </h2>
        <Button
          variant="danger"
          onClick={() => void logout()}
          className="w-full"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserPlus, AlertTriangle } from "lucide-react";
import { useJoinHousehold } from "@/hooks/useHousehold";
import Button from "@/components/ui/Button";

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const joinHousehold = useJoinHousehold();
  const [error, setError] = useState<string | null>(null);

  const handleAccept = () => {
    if (!token) return;
    setError(null);
    joinHousehold.mutate(token, {
      onSuccess: () => navigate("/app/households"),
      onError: (err: unknown) => {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Could not join — the invite may be invalid or expired.";
        setError(message);
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-surface-subtle to-surface p-6">
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-surface p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserPlus className="h-7 w-7" />
        </div>
        <h1 className="font-display text-4xl text-text-primary">
          You're invited
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Someone shared a FridgeCheck household invite with you. Accept to join
          and share the pantry.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-[var(--radius-md)] border border-primary/20 bg-primary/5 p-3 text-left text-sm text-primary"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Button
            variant="primary"
            onClick={handleAccept}
            disabled={joinHousehold.isPending}
            className="w-full"
          >
            {joinHousehold.isPending ? "Joining…" : "Accept invite"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/app/households")}
            disabled={joinHousehold.isPending}
            className="w-full"
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}

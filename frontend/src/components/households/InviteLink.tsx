import { useState } from "react";
import { Copy, Check, RefreshCcw } from "lucide-react";
import Button from "@/components/ui/Button";

interface InviteLinkProps {
  inviteToken: string;
  isOwner: boolean;
  onRegenerate: () => void;
  regenerating?: boolean;
}

export default function InviteLink({
  inviteToken,
  isOwner,
  onRegenerate,
  regenerating,
}: InviteLinkProps) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${window.location.origin}/join/${inviteToken}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">Invite link</h3>
        <p className="mt-0.5 text-xs text-text-muted">
          Share this with people you want in the household.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={inviteUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="block flex-1 rounded-[var(--radius-md)] border border-border bg-surface-subtle px-4 py-3 text-sm text-text-muted focus:outline-none focus:ring-[3px] focus:ring-primary/20"
        />
        <Button variant="secondary" size="md" onClick={() => void handleCopy()}>
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      {isOwner && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          loading={regenerating}
        >
          <RefreshCcw className="h-4 w-4" />
          Regenerate link
        </Button>
      )}
    </div>
  );
}

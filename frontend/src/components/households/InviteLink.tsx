import { useState } from 'react';
import Button from '@/components/ui/Button';

interface InviteLinkProps {
  inviteToken: string;
  isOwner: boolean;
  onRegenerate: () => void;
  regenerating?: boolean;
}

export default function InviteLink({ inviteToken, isOwner, onRegenerate, regenerating }: InviteLinkProps) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${window.location.origin}/join/${inviteToken}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Invite link</label>
      <div className="flex gap-2">
        <input
          readOnly
          value={inviteUrl}
          className="block flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600"
        />
        <Button variant="secondary" size="sm" onClick={() => void handleCopy()}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      {isOwner && (
        <Button variant="ghost" size="sm" onClick={onRegenerate} loading={regenerating}>
          Regenerate link
        </Button>
      )}
    </div>
  );
}

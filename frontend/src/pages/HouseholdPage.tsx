import { useState } from 'react';
import {
  useHouseholds,
  useCreateHousehold,
  useJoinHousehold,
  useHouseholdMembers,
  useInviteLink,
  useRegenerateInvite,
} from '@/hooks/useHousehold';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import InviteLink from '@/components/households/InviteLink';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function HouseholdPage() {
  const { user } = useAuth();
  const { data: households, isLoading } = useHouseholds();
  const createHousehold = useCreateHousehold();
  const joinHousehold = useJoinHousehold();
  const [selectedId, setSelectedId] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newName, setNewName] = useState('');
  const [joinToken, setJoinToken] = useState('');

  const activeId = selectedId || households?.[0]?.id || '';
  const { data: members } = useHouseholdMembers(activeId);
  const { data: invite } = useInviteLink(activeId);
  const regenerateInvite = useRegenerateInvite(activeId);

  const currentMember = members?.find((m) => m.user_id === user?.id);
  const isOwner = currentMember?.role === 'owner';

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const handleCreate = () => {
    if (!newName.trim()) return;
    createHousehold.mutate(newName.trim(), {
      onSuccess: () => {
        setShowCreate(false);
        setNewName('');
      },
    });
  };

  const handleJoin = () => {
    if (!joinToken.trim()) return;
    joinHousehold.mutate(joinToken.trim(), {
      onSuccess: () => {
        setShowJoin(false);
        setJoinToken('');
      },
    });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Households</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowJoin(true)}>
            Join
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            Create
          </Button>
        </div>
      </div>

      {(!households || households.length === 0) ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
          <p className="text-lg font-medium text-gray-600">No households yet</p>
          <p className="mt-1 text-sm text-gray-500">Create one or join using an invite link</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Household list */}
          <div className="space-y-2">
            {households.map((h) => (
              <Card
                key={h.id}
                className={`cursor-pointer transition-all ${
                  activeId === h.id ? 'border-emerald-500 ring-2 ring-emerald-200' : 'hover:border-gray-300'
                }`}
              >
                <button onClick={() => setSelectedId(h.id)} className="w-full text-left">
                  <h3 className="text-sm font-semibold text-gray-900">{h.name}</h3>
                </button>
              </Card>
            ))}
          </div>

          {/* Details */}
          {activeId && (
            <div className="space-y-4 md:col-span-2">
              {/* Invite */}
              <Card>
                {invite && (
                  <InviteLink
                    inviteToken={invite.invite_token}
                    isOwner={isOwner}
                    onRegenerate={() => regenerateInvite.mutate()}
                    regenerating={regenerateInvite.isPending}
                  />
                )}
              </Card>

              {/* Members */}
              <Card>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Members</h3>
                {members ? (
                  <ul className="space-y-2">
                    {members.map((m) => (
                      <li key={m.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{m.username || m.email}</span>
                          {m.email && m.username && (
                            <span className="ml-2 text-xs text-gray-500">{m.email}</span>
                          )}
                        </div>
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium capitalize text-gray-600">
                          {m.role}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <LoadingSpinner size="sm" />
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Household">
        <div className="space-y-4">
          <Input
            label="Household name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. The Smiths Kitchen"
          />
          <Button onClick={handleCreate} loading={createHousehold.isPending} className="w-full">
            Create
          </Button>
        </div>
      </Modal>

      {/* Join modal */}
      <Modal isOpen={showJoin} onClose={() => setShowJoin(false)} title="Join Household">
        <div className="space-y-4">
          <Input
            label="Invite token"
            value={joinToken}
            onChange={(e) => setJoinToken(e.target.value)}
            placeholder="Paste the invite token"
            helperText="Get this from a household member"
          />
          <Button onClick={handleJoin} loading={joinHousehold.isPending} className="w-full">
            Join
          </Button>
        </div>
      </Modal>
    </div>
  );
}

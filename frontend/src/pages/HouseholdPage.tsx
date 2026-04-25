import { useState } from "react";
import { Users, UserPlus, Plus } from "lucide-react";
import {
  useHouseholds,
  useCreateHousehold,
  useJoinHousehold,
  useHouseholdMembers,
  useInviteLink,
  useRegenerateInvite,
} from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import HouseholdCard from "@/components/households/HouseholdCard";
import InviteLink from "@/components/households/InviteLink";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function HouseholdPage() {
  const { user } = useAuth();
  const {
    data: households,
    isLoading,
    isError: householdsError,
    refetch: refetchHouseholds,
  } = useHouseholds();
  const createHousehold = useCreateHousehold();
  const joinHousehold = useJoinHousehold();
  const [selectedId, setSelectedId] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNameError, setNewNameError] = useState("");
  const [createError, setCreateError] = useState("");
  const [joinToken, setJoinToken] = useState("");
  const [joinTokenError, setJoinTokenError] = useState("");
  const [joinError, setJoinError] = useState("");

  const activeId = selectedId || households?.[0]?.id || "";
  const {
    data: members,
    isLoading: membersLoading,
    isError: membersError,
    refetch: refetchMembers,
  } = useHouseholdMembers(activeId);
  const {
    data: invite,
    isError: inviteError,
    refetch: refetchInvite,
  } = useInviteLink(activeId);
  const regenerateInvite = useRegenerateInvite(activeId);

  const currentMember = members?.find((m) => m.user_id === user?.id);
  const isOwner = currentMember?.role === "owner";

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (householdsError) {
    return (
      <EmptyState
        icon={<Users className="h-10 w-10" />}
        title="Couldn't load households"
        description="Something went wrong fetching your households. Try again in a moment."
        action={
          <Button onClick={() => void refetchHouseholds()}>Try again</Button>
        }
      />
    );
  }

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setNewNameError("Please give the household a name.");
      return;
    }
    setNewNameError("");
    setCreateError("");
    createHousehold.mutate(trimmed, {
      onSuccess: () => {
        setShowCreate(false);
        setNewName("");
      },
      onError: () =>
        setCreateError("Couldn't create the household. Please try again."),
    });
  };

  const handleJoin = () => {
    const trimmed = joinToken.trim();
    if (!trimmed) {
      setJoinTokenError("Please paste an invite token.");
      return;
    }
    setJoinTokenError("");
    setJoinError("");
    joinHousehold.mutate(trimmed, {
      onSuccess: () => {
        setShowJoin(false);
        setJoinToken("");
      },
      onError: () =>
        setJoinError("That token didn't work. Double-check it and try again."),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-4xl sm:text-5xl leading-none text-text-primary">
            Households
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Share a fridge with the people you live with.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowJoin(true)}
          >
            <UserPlus className="h-4 w-4" />
            Join
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>
      </div>

      {!households || households.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No households yet"
          description="Create your own fridge or join someone else's with an invite link."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="secondary" onClick={() => setShowJoin(true)}>
                Join one
              </Button>
              <Button onClick={() => setShowCreate(true)}>Create one</Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {/* Household list */}
          <div className="space-y-2">
            {households.map((h) => (
              <HouseholdCard
                key={h.id}
                household={h}
                isSelected={activeId === h.id}
                onClick={() => setSelectedId(h.id)}
              />
            ))}
          </div>

          {/* Details */}
          {activeId && (
            <div className="space-y-4 md:col-span-2 min-w-0">
              {inviteError ? (
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-text-muted">
                      Couldn't load the invite link.
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void refetchInvite()}
                    >
                      Try again
                    </Button>
                  </div>
                </Card>
              ) : (
                invite && (
                  <Card>
                    <InviteLink
                      inviteToken={invite.invite_token}
                      isOwner={isOwner}
                      onRegenerate={() => regenerateInvite.mutate()}
                      regenerating={regenerateInvite.isPending}
                    />
                    {regenerateInvite.isError && (
                      <p
                        role="alert"
                        className="mt-3 text-sm font-semibold text-primary"
                      >
                        Couldn't regenerate the invite link. Please try again.
                      </p>
                    )}
                  </Card>
                )
              )}

              <Card>
                <h3 className="mb-3 text-sm font-semibold text-text-primary">
                  Members
                </h3>
                {membersLoading ? (
                  <LoadingSpinner size="sm" />
                ) : membersError ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-text-muted">
                      Couldn't load members.
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void refetchMembers()}
                    >
                      Try again
                    </Button>
                  </div>
                ) : !members || members.length === 0 ? (
                  <p className="text-sm text-text-muted">No members yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {members.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-surface-subtle px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-text-primary">
                            {m.username || m.email}
                          </p>
                          {m.email && m.username && (
                            <p className="truncate text-xs text-text-muted">
                              {m.email}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold capitalize text-primary">
                          {m.role}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => {
          setShowCreate(false);
          setNewNameError("");
          setCreateError("");
        }}
        title="Create household"
      >
        <div className="space-y-4">
          {createError && (
            <div
              role="alert"
              className="rounded-[var(--radius-md)] border border-primary/20 bg-primary/5 p-3 text-sm font-semibold text-primary"
            >
              {createError}
            </div>
          )}
          <Input
            label="Household name"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              if (newNameError) setNewNameError("");
            }}
            placeholder="e.g. The Smiths' Kitchen"
            error={newNameError}
            autoFocus
          />
          <Button
            onClick={handleCreate}
            loading={createHousehold.isPending}
            disabled={createHousehold.isPending}
            className="w-full"
          >
            Create
          </Button>
        </div>
      </Modal>

      {/* Join modal */}
      <Modal
        isOpen={showJoin}
        onClose={() => {
          setShowJoin(false);
          setJoinTokenError("");
          setJoinError("");
        }}
        title="Join household"
      >
        <div className="space-y-4">
          {joinError && (
            <div
              role="alert"
              className="rounded-[var(--radius-md)] border border-primary/20 bg-primary/5 p-3 text-sm font-semibold text-primary"
            >
              {joinError}
            </div>
          )}
          <Input
            label="Invite token"
            value={joinToken}
            onChange={(e) => {
              setJoinToken(e.target.value);
              if (joinTokenError) setJoinTokenError("");
            }}
            placeholder="Paste the invite token"
            hint="Get this from a household member."
            error={joinTokenError}
            autoFocus
          />
          <Button
            onClick={handleJoin}
            loading={joinHousehold.isPending}
            disabled={joinHousehold.isPending}
            className="w-full"
          >
            Join
          </Button>
        </div>
      </Modal>
    </div>
  );
}

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJoinHousehold } from '@/hooks/useHousehold';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const joinHousehold = useJoinHousehold();

  useEffect(() => {
    if (token && !joinHousehold.isPending && !joinHousehold.isSuccess) {
      joinHousehold.mutate(token, {
        onSuccess: () => navigate('/households'),
        onError: () => navigate('/households'),
      });
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Joining household...</p>
      </div>
    </div>
  );
}

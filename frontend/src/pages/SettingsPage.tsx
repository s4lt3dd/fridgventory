import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function SettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Settings</h1>

      {/* Account */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Account</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Username</span>
            <span className="font-medium text-gray-900">{user?.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="font-medium text-gray-900">{user?.email}</span>
          </div>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Notifications</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Email notifications</span>
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
          </label>
          <div>
            <label className="text-sm text-gray-700">Notify before expiry</label>
            <div className="mt-1 flex gap-2">
              {[1, 3, 7].map((day) => (
                <label key={day} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    defaultChecked={day <= 3}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-600">{day}d</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Logout */}
      <Button variant="danger" onClick={() => void logout()} className="w-full">
        Sign out
      </Button>
    </div>
  );
}

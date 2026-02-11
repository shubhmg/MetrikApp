import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore.js';

export function usePermission() {
  const user = useAuthStore((s) => s.user);
  const currentBusinessId = useAuthStore((s) => s.currentBusinessId);

  return useMemo(() => {
    const membership = user?.businesses?.find(
      (b) => String(b.businessId?._id || b.businessId) === String(currentBusinessId)
    );

    const role = membership?.role || null;
    const permissions = membership?.permissions || [];
    const isOwnerOrAdmin = role === 'owner' || role === 'admin';

    function can(module, action) {
      if (isOwnerOrAdmin) return true;
      return permissions.includes(`${module}:${action}`);
    }

    function canAny(module) {
      if (isOwnerOrAdmin) return true;
      return permissions.some((p) => p.startsWith(`${module}:`));
    }

    return { can, canAny, role, isOwnerOrAdmin, permissions };
  }, [user, currentBusinessId]);
}

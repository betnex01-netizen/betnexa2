import { useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { useBets } from '@/context/BetContext';
import balanceSyncService from '@/lib/balanceSyncService';

/**
 * Global Balance Sync Provider
 * Ensures user balance is always synced from server when logged in
 * This component should wrap the main app content
 */
export function BalanceSyncProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn } = useUser();
  const { syncBalance } = useBets();

  useEffect(() => {
    if (!isLoggedIn || !user?.id) {
      console.log('📊 Balance sync disabled: user not logged in');
      return;
    }

    console.log(`📊 Setting up global balance sync for user: ${user.id}`);

    // Subscribe to balance changes from the sync service
    const unsubscribe = balanceSyncService.subscribe(user.id, (newBalance) => {
      console.log(`💰 Global balance sync triggered: ${newBalance}`);
      syncBalance(newBalance);
    });

    // Start auto-sync every 5 seconds
    balanceSyncService.startAutoSync(user.id, 5000);

    return () => {
      unsubscribe();
      balanceSyncService.stopAutoSync();
    };
  }, [isLoggedIn, user?.id, syncBalance]);

  return <>{children}</>;
}

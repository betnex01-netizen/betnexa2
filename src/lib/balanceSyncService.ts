/**
 * Balance Sync Service
 * Keeps balance synchronized across all parts of the app by using server as source of truth
 */

interface BalanceSyncListener {
  (newBalance: number): void;
}

class BalanceSyncService {
  private listeners: Map<string, BalanceSyncListener[]> = new Map(); // userId -> listeners
  private syncInterval: NodeJS.Timeout | null = null;
  private lastFetchedBalance: Map<string, number> = new Map();
  private isSyncing = false;

  /**
   * Subscribe to balance changes for a specific user
   */
  subscribe(userId: string, callback: BalanceSyncListener): () => void {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, []);
    }
    this.listeners.get(userId)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(userId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Notify all listeners of balance change
   */
  private notifyListeners(userId: string, newBalance: number) {
    const callbacks = this.listeners.get(userId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(newBalance);
        } catch (error) {
          console.error('Error in balance sync listener:', error);
        }
      });
    }
  }

  /**
   * Fetch user's current balance from server
   */
  async fetchBalance(userId: string): Promise<number | null> {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://betnexa-server.vercel.app';
      const response = await fetch(
        `${apiUrl}/api/payments/user-balance/${userId}`
      );
      const data = await response.json();

      if (data.success && data.balance !== null) {
        const balance = parseFloat(data.balance);
        this.lastFetchedBalance.set(userId, balance);
        return balance;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch balance from server:', error);
      return null;
    }
  }

  /**
   * Sync balance from server and notify listeners if changed
   */
  async sync(userId: string): Promise<number | null> {
    if (this.isSyncing) return null;

    this.isSyncing = true;
    try {
      const newBalance = await this.fetchBalance(userId);
      if (newBalance !== null) {
        const lastBalance = this.lastFetchedBalance.get(userId);
        if (lastBalance === undefined || newBalance !== lastBalance) {
          console.log(`💰 Balance synced for ${userId}: ${newBalance}`);
          this.notifyListeners(userId, newBalance);
        }
      }
      return newBalance;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Start automatic balance sync polling
   */
  startAutoSync(userId: string, intervalMs: number = 5000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    console.log(`🔄 Starting auto-sync for ${userId} every ${intervalMs}ms`);
    
    // Initial sync
    this.sync(userId);

    // Then set up interval
    this.syncInterval = setInterval(() => {
      this.sync(userId).catch(err => console.warn('Auto-sync error:', err));
    }, intervalMs);
  }

  /**
   * Stop automatic balance sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('🛑 Auto-sync stopped');
    }
  }

  /**
   * Get the last fetched balance for a user
   */
  getLastBalance(userId: string): number | null {
    return this.lastFetchedBalance.get(userId) || null;
  }

  /**
   * Update balance locally (for optimistic updates)
   */
  updateLocal(userId: string, newBalance: number): void {
    this.lastFetchedBalance.set(userId, newBalance);
    this.notifyListeners(userId, newBalance);
  }

  /**
   * Clear all data
   */
  destroy(): void {
    this.stopAutoSync();
    this.listeners.clear();
    this.lastFetchedBalance.clear();
  }
}

// Create singleton instance
const balanceSyncService = new BalanceSyncService();

export default balanceSyncService;

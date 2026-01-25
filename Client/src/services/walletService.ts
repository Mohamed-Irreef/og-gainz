import type { WalletTransaction } from "@/types";
import { getUserById, getUserWalletTransactions } from "@/data/users";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const walletService = {
  async getBalance(userId: string): Promise<number> {
    await delay(100);
    return getUserById(userId)?.walletBalance ?? 0;
  },

  async getTransactions(userId: string): Promise<WalletTransaction[]> {
    await delay(150);
    return getUserWalletTransactions(userId);
  },
};

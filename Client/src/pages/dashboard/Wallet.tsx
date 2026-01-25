// OG GAINZ - Wallet & Credits
import { useState } from "react";
import { 
  Wallet as WalletIcon, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Gift, 
  RefreshCw,
  ShoppingCart,
  Percent
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/context/UserContext";
import { useWallet } from "@/context/WalletContext";
import { formatCurrency } from "@/utils/formatCurrency";
import type { TransactionReason, TransactionType } from "@/types";

const Wallet = () => {
  const { user } = useUser();
  const { transactions, balance } = useWallet();

  const getTransactionIcon = (reason: TransactionReason) => {
    const icons: Record<TransactionReason, typeof Gift> = {
      signup_bonus: Gift,
      referral: Gift,
      refund: RefreshCw,
      order_payment: ShoppingCart,
      admin_adjustment: RefreshCw,
      cashback: Percent,
    };
    return icons[reason] || Gift;
  };

  const getTransactionColor = (type: TransactionType) => {
    return type === "credit" ? "text-green-600" : "text-red-600";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const userTransactions = transactions.filter((t) => t.userId === user?.id);
  const totalCredits = userTransactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = userTransactions
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-oz-primary to-oz-secondary text-white overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Available Balance</p>
              <p className="text-4xl font-bold mt-1">{formatCurrency(balance)}</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <WalletIcon className="h-8 w-8" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <ArrowDownLeft className="h-4 w-4" />
                Total Credited
              </div>
              <p className="font-semibold mt-1">{formatCurrency(totalCredits)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <ArrowUpRight className="h-4 w-4" />
                Total Used
              </div>
              <p className="font-semibold mt-1">{formatCurrency(totalDebits)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notice - No Cash Withdrawal */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <WalletIcon className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-800 text-sm">About OZ Credits</p>
              <p className="text-sm text-amber-700 mt-1">
                Credits can be used for meal pack subscriptions and add-on purchases. Credits are non-refundable and cannot be withdrawn as cash. They never expire as long as your account is active.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How to Earn */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to Earn Credits</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg text-center hover:border-oz-secondary transition-colors">
            <Gift className="h-8 w-8 mx-auto text-oz-accent mb-2" />
            <h4 className="font-medium">Referrals</h4>
            <p className="text-sm text-muted-foreground">Earn ₹200 for each friend you refer</p>
            <Badge variant="secondary" className="mt-2 text-xs">Most Popular</Badge>
          </div>
          <div className="p-4 border rounded-lg text-center hover:border-oz-secondary transition-colors">
            <RefreshCw className="h-8 w-8 mx-auto text-oz-secondary mb-2" />
            <h4 className="font-medium">Skip Meals</h4>
            <p className="text-sm text-muted-foreground">Get credited when you skip a delivery</p>
          </div>
          <div className="p-4 border rounded-lg text-center hover:border-oz-secondary transition-colors">
            <Percent className="h-8 w-8 mx-auto text-oz-primary mb-2" />
            <h4 className="font-medium">Cashback</h4>
            <p className="text-sm text-muted-foreground">Earn cashback on special promotions</p>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {userTransactions.length === 0 ? (
            <div className="text-center py-8">
              <WalletIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No transactions yet</p>
              <p className="text-sm text-muted-foreground">
                Your credit history will appear here once you earn or use credits.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {userTransactions.map((transaction) => {
                const Icon = getTransactionIcon(transaction.reason);
                return (
                  <div key={transaction.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          transaction.type === "credit" ? "bg-green-100" : "bg-red-100"
                        }`}>
                          <Icon className={`h-4 w-4 ${getTransactionColor(transaction.type)}`} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(transaction.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                          {transaction.type === "credit" ? "+" : "-"}
                          {formatCurrency(transaction.amount)}
                        </p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {transaction.reason.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                    <Separator className="mt-4" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trust Footer */}
      <Card className="bg-oz-neutral/30 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Gift className="h-5 w-5 text-oz-secondary flex-shrink-0" />
            <p>
              <strong className="text-foreground">Pro tip:</strong> Use your credits at checkout by toggling "Apply wallet credits". Credits are automatically applied to reduce your total.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Wallet;

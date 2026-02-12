import type { User, WalletTransaction } from '@/types';

export const users: User[] = [
  {
    id: 'user-001',
    email: 'john.doe@example.com',
    name: 'John Doe',
    phone: '+91 93617 98644',
    avatar: undefined,
    addresses: [
      {
        id: 'addr-001',
        label: 'Home',
        addressLine1: '123, Green Valley Apartments',
        addressLine2: 'Sector 15, Koramangala',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560034',
        landmark: 'Near Forum Mall',
        latitude: 12.9352,
        longitude: 77.6245,
        isDefault: true,
      },
      {
        id: 'addr-002',
        label: 'Office',
        addressLine1: 'WeWork Galaxy',
        addressLine2: '43, Residency Road',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560025',
        landmark: 'Opposite UB City',
        latitude: 12.9716,
        longitude: 77.5946,
        isDefault: false,
      },
    ],
    walletBalance: 450,
    isVerified: true,
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'user-002',
    email: 'jane.smith@example.com',
    name: 'Jane Smith',
    phone: '+91 87654 32109',
    avatar: undefined,
    addresses: [
      {
        id: 'addr-003',
        label: 'Home',
        addressLine1: '456, Sunrise Towers',
        addressLine2: 'HSR Layout',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560102',
        isDefault: true,
      },
    ],
    walletBalance: 200,
    isVerified: true,
    createdAt: '2024-02-20T14:15:00Z',
  },
];

export const walletTransactions: WalletTransaction[] = [
  {
    id: 'txn-001',
    userId: 'user-001',
    type: 'credit',
    amount: 500,
    reason: 'signup_bonus',
    description: 'Welcome bonus for new user signup',
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'txn-002',
    userId: 'user-001',
    type: 'debit',
    amount: 200,
    reason: 'order_payment',
    description: 'Applied to order #ORD-001',
    orderId: 'order-001',
    createdAt: '2024-01-20T12:00:00Z',
  },
  {
    id: 'txn-003',
    userId: 'user-001',
    type: 'credit',
    amount: 150,
    reason: 'refund',
    description: 'Refund for skipped meal on Jan 25',
    createdAt: '2024-01-25T18:30:00Z',
  },
  {
    id: 'txn-004',
    userId: 'user-002',
    type: 'credit',
    amount: 200,
    reason: 'signup_bonus',
    description: 'Welcome bonus for new user signup',
    createdAt: '2024-02-20T14:15:00Z',
  },
];

export const getUserById = (id: string): User | undefined => {
  return users.find(user => user.id === id);
};

export const getUserWalletTransactions = (userId: string): WalletTransaction[] => {
  return walletTransactions.filter(txn => txn.userId === userId);
};

export type Person = { id: number; name: string };

export type ExpenseWithSplits = {
  id: number;
  description: string;
  amount: number;
  paidById: number;
  paidByName: string;
  receiptUrl: string | null;
  createdAt: string;
  splitWith: { id: number; name: string }[];
};

export type Settlement = { fromId: number; fromName: string; toId: number; toName: string; amount: number };
export type NetBalance = { id: number; name: string; net: number };

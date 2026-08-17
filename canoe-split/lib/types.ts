export type Person = { id: number; name: string };

export type ExpenseKind = "expense" | "payment";

export type ExpenseWithSplits = {
  id: number;
  description: string;
  amount: number;
  paidById: number;
  paidByName: string;
  receiptUrl: string | null;
  createdAt: string;
  kind: ExpenseKind;
  splitWith: { id: number; name: string }[];
};

export type Payment = {
  id: number;
  fromId: number;
  fromName: string;
  toId: number;
  toName: string;
  amount: number;
  note: string;
  createdAt: string;
};

export type Settlement = { fromId: number; fromName: string; toId: number; toName: string; amount: number };
export type NetBalance = { id: number; name: string; net: number };
export type TripSettings = { name: string };
export type ImportSkip = { row: number; reason: string };
export type ImportResult = { imported: number; skipped: ImportSkip[] };

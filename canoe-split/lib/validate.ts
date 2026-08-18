export type ValidatedExpense = {
  description: string;
  amount: number;
  paidBy: number;
  splitWith: number[];
  receiptUrl: string | null;
  addedBy: number | null;
};

/** Attribution is best-effort: an unrecognized or missing value is dropped rather than rejected. */
export function parseAddedBy(body: any, validIds: Set<number>): number | null {
  const addedBy = Number(body?.addedBy);
  return Number.isFinite(addedBy) && validIds.has(addedBy) ? addedBy : null;
}

/** Throws a plain Error with a user-facing message on the first invalid field. */
export function validateExpenseInput(body: any, validIds: Set<number>): ValidatedExpense {
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const amount = Number(body?.amount);
  const paidBy = Number(body?.paidBy);
  const splitWith = Array.isArray(body?.splitWith) ? body.splitWith.map((n: unknown) => Number(n)) : [];
  const receiptUrl = typeof body?.receiptUrl === "string" ? body.receiptUrl : null;

  if (!description) throw new Error("Description is required");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be a positive number");
  if (!Number.isFinite(paidBy)) throw new Error("Who paid is required");
  if (splitWith.length === 0 || splitWith.some((n: number) => !Number.isFinite(n))) {
    throw new Error("Pick at least one person to split with");
  }
  if (!validIds.has(paidBy) || splitWith.some((id: number) => !validIds.has(id))) {
    throw new Error("Unknown person in request");
  }

  return {
    description,
    amount: Math.round(amount * 100) / 100,
    paidBy,
    splitWith,
    receiptUrl,
    addedBy: parseAddedBy(body, validIds),
  };
}

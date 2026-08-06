export type NetBalance = { id: number; name: string; net: number };
export type Settlement = { fromId: number; fromName: string; toId: number; toName: string; amount: number };

const EPS = 0.005;

/** Greedily match debtors to creditors so the group needs the fewest possible payments. */
export function simplifyDebts(balances: NetBalance[]): Settlement[] {
  const creditors = balances
    .filter((b) => b.net > EPS)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.net - a.net);
  const debtors = balances
    .filter((b) => b.net < -EPS)
    .map((b) => ({ ...b, net: -b.net }))
    .sort((a, b) => b.net - a.net);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.net, creditor.net);

    if (amount > EPS) {
      settlements.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount: Math.round(amount * 100) / 100,
      });
    }

    debtor.net -= amount;
    creditor.net -= amount;

    if (debtor.net <= EPS) i++;
    if (creditor.net <= EPS) j++;
  }

  return settlements;
}

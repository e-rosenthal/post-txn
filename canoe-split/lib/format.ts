export function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

/** "Added by Alice · Aug 14, 3:42 PM" — drops the name for rows entered before attribution was tracked. */
export function formatAdded(createdAt: string, addedByName: string | null): string {
  const when = new Date(createdAt);
  const date = when.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const stamp = `${date}, ${time}`;
  return addedByName ? `Added by ${addedByName} · ${stamp}` : `Added ${stamp}`;
}

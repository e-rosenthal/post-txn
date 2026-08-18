import postgres from "postgres";

let _sql: postgres.Sql | null = null;

function getSql() {
  if (!_sql) {
    const connectionString =
      process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED;
    if (!connectionString) {
      throw new Error(
        "No database connection string found. In Vercel, add a Postgres store (Storage tab) and connect it " +
          "to this project — that sets DATABASE_URL automatically."
      );
    }
    const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
    _sql = postgres(connectionString, { ssl: isLocal ? false : "require" });
  }
  return _sql;
}

let schemaReady: Promise<void> | null = null;

/** Idempotent, cheap to call from every request — no separate migration step to run. */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    const sql = getSql();
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS people (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS expenses (
          id SERIAL PRIMARY KEY,
          description TEXT NOT NULL,
          amount NUMERIC(10, 2) NOT NULL,
          paid_by INTEGER NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
          receipt_url TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS expense_splits (
          expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
          person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
          PRIMARY KEY (expense_id, person_id)
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS trip_settings (
          id INTEGER PRIMARY KEY DEFAULT 1,
          name TEXT NOT NULL DEFAULT 'Our Trip',
          CONSTRAINT trip_settings_single_row CHECK (id = 1)
        );
      `;
      await sql`INSERT INTO trip_settings (id, name) VALUES (1, 'Our Trip') ON CONFLICT (id) DO NOTHING;`;
      // Additive only: every existing row backfills to 'expense', so nothing already entered changes.
      await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'expense';`;
      // Nullable: rows added before this existed have no attribution, and ON DELETE SET NULL keeps
      // removing a person from blocking on entries they happened to type in.
      await sql`
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS added_by INTEGER
        REFERENCES people(id) ON DELETE SET NULL;
      `;
    })();
  }
  return schemaReady;
}

export type Person = { id: number; name: string };

export async function getPeople(): Promise<Person[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql<Person[]>`SELECT id, name FROM people ORDER BY id ASC;`;
  return rows;
}

export async function addPerson(name: string): Promise<Person> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql<Person[]>`
    INSERT INTO people (name) VALUES (${name})
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, name;
  `;
  return rows[0];
}

export async function renamePerson(id: number, name: string): Promise<Person> {
  await ensureSchema();
  const sql = getSql();
  try {
    const rows = await sql<Person[]>`
      UPDATE people SET name = ${name} WHERE id = ${id} RETURNING id, name;
    `;
    if (rows.length === 0) throw new Error("Person not found");
    return rows[0];
  } catch (err: any) {
    if (err?.code === "23505") throw new Error("Someone already has that name");
    throw err;
  }
}

export async function deletePerson(id: number): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  const [{ count: paidCount }] = await sql<{ count: string }[]>`
    SELECT count(*)::text FROM expenses WHERE paid_by = ${id};
  `;
  const [{ count: splitCount }] = await sql<{ count: string }[]>`
    SELECT count(*)::text FROM expense_splits WHERE person_id = ${id};
  `;
  if (Number(paidCount) > 0 || Number(splitCount) > 0) {
    throw new Error("Can't remove someone who's on existing expenses — edit or delete those expenses first.");
  }
  await sql`DELETE FROM people WHERE id = ${id};`;
}

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
  addedByName: string | null;
  splitWith: { id: number; name: string }[];
};

/** Omit kindFilter to get everything (used for balance math, which must include payments). */
export async function getExpenses(kindFilter?: ExpenseKind): Promise<ExpenseWithSplits[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT
      e.id,
      e.description,
      e.amount,
      e.kind,
      e.paid_by AS paid_by_id,
      p.name AS paid_by_name,
      ab.name AS added_by_name,
      e.receipt_url,
      e.created_at,
      COALESCE(
        json_agg(
          json_build_object('id', sp.id, 'name', sp.name)
          ORDER BY sp.id
        ) FILTER (WHERE sp.id IS NOT NULL),
        '[]'
      ) AS split_with
    FROM expenses e
    JOIN people p ON p.id = e.paid_by
    LEFT JOIN people ab ON ab.id = e.added_by
    LEFT JOIN expense_splits es ON es.expense_id = e.id
    LEFT JOIN people sp ON sp.id = es.person_id
    ${kindFilter ? sql`WHERE e.kind = ${kindFilter}` : sql``}
    GROUP BY e.id, p.name, ab.name
    ORDER BY e.created_at DESC, e.id DESC;
  `;

  return rows.map((r: any) => ({
    id: r.id,
    description: r.description,
    amount: Number(r.amount),
    paidById: r.paid_by_id,
    paidByName: r.paid_by_name,
    receiptUrl: r.receipt_url,
    createdAt: r.created_at,
    kind: r.kind,
    addedByName: r.added_by_name ?? null,
    splitWith: typeof r.split_with === "string" ? JSON.parse(r.split_with) : r.split_with,
  }));
}

export async function addExpense(input: {
  description: string;
  amount: number;
  paidBy: number;
  splitWith: number[];
  receiptUrl?: string | null;
  kind?: ExpenseKind;
  addedBy?: number | null;
}): Promise<number> {
  await ensureSchema();
  const sql = getSql();
  const { description, amount, paidBy, splitWith, receiptUrl, kind, addedBy } = input;

  const rows = await sql`
    INSERT INTO expenses (description, amount, paid_by, receipt_url, kind, added_by)
    VALUES (
      ${description}, ${amount}, ${paidBy}, ${receiptUrl ?? null},
      ${kind ?? "expense"}, ${addedBy ?? null}
    )
    RETURNING id;
  `;
  const expenseId = rows[0].id as number;

  for (const personId of splitWith) {
    await sql`
      INSERT INTO expense_splits (expense_id, person_id)
      VALUES (${expenseId}, ${personId})
      ON CONFLICT DO NOTHING;
    `;
  }

  return expenseId;
}

export async function updateExpense(
  id: number,
  input: {
    description: string;
    amount: number;
    paidBy: number;
    splitWith: number[];
    receiptUrl?: string | null;
  }
): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  const { description, amount, paidBy, splitWith, receiptUrl } = input;

  await sql`
    UPDATE expenses
    SET description = ${description}, amount = ${amount}, paid_by = ${paidBy}, receipt_url = ${receiptUrl ?? null}
    WHERE id = ${id};
  `;
  await sql`DELETE FROM expense_splits WHERE expense_id = ${id};`;
  for (const personId of splitWith) {
    await sql`
      INSERT INTO expense_splits (expense_id, person_id)
      VALUES (${id}, ${personId})
      ON CONFLICT DO NOTHING;
    `;
  }
}

export async function deleteExpense(id: number): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`DELETE FROM expenses WHERE id = ${id};`;
}

export type Payment = {
  id: number;
  fromId: number;
  fromName: string;
  toId: number;
  toName: string;
  amount: number;
  note: string;
  createdAt: string;
  addedByName: string | null;
};

/** A payment is stored as an expense row split with exactly one person — same debt math, different label. */
export async function addPayment(input: {
  fromId: number;
  toId: number;
  amount: number;
  note?: string | null;
  addedBy?: number | null;
}): Promise<number> {
  const { fromId, toId, amount, note, addedBy } = input;
  return addExpense({
    description: note?.trim() ? note.trim() : "Payment",
    amount,
    paidBy: fromId,
    splitWith: [toId],
    receiptUrl: null,
    kind: "payment",
    addedBy,
  });
}

export async function getPayments(): Promise<Payment[]> {
  const rows = await getExpenses("payment");
  return rows.map((r) => ({
    id: r.id,
    fromId: r.paidById,
    fromName: r.paidByName,
    toId: r.splitWith[0]?.id ?? 0,
    toName: r.splitWith[0]?.name ?? "",
    amount: r.amount,
    note: r.description === "Payment" ? "" : r.description,
    createdAt: r.createdAt,
    addedByName: r.addedByName,
  }));
}

export type TripSettings = { name: string };

export async function getTripSettings(): Promise<TripSettings> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql<TripSettings[]>`SELECT name FROM trip_settings WHERE id = 1;`;
  return rows[0] ?? { name: "Our Trip" };
}

export async function updateTripName(name: string): Promise<TripSettings> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql<TripSettings[]>`
    UPDATE trip_settings SET name = ${name} WHERE id = 1 RETURNING name;
  `;
  return rows[0];
}

export async function computeNetBalances(): Promise<{ id: number; name: string; net: number }[]> {
  const people = await getPeople();
  // No kind filter here on purpose — payments must count toward balances just like shared expenses do.
  const expenses = await getExpenses();

  const net = new Map<number, number>(people.map((p) => [p.id, 0]));

  for (const exp of expenses) {
    const participants = exp.splitWith.length > 0 ? exp.splitWith : [{ id: exp.paidById, name: exp.paidByName }];
    const share = exp.amount / participants.length;

    net.set(exp.paidById, (net.get(exp.paidById) ?? 0) + exp.amount);
    for (const person of participants) {
      net.set(person.id, (net.get(person.id) ?? 0) - share);
    }
  }

  return people.map((p) => ({ id: p.id, name: p.name, net: Math.round((net.get(p.id) ?? 0) * 100) / 100 }));
}

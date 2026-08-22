"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Budget = {
  id: string;
  category: string;
  planned_amount: number;
  currency: string;
};

type Expense = {
  id: string;
  description: string;
  category: string | null;
  amount: number;
  currency: string;
  converted_amount: number | null;
  home_currency: string | null;
  expense_date: string;
  paid_by_user_id: string | null;
  receipt_document_id: string | null;
  notes: string | null;
};

type Member = {
  user_id: string;
  display_name: string;
};

type Split = {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  status: string;
};

const categories = [
  "Flights","Accommodation","Cruises","Transport","Tours","Activities",
  "Food","Shopping","Insurance","Other",
];

export function TripBudget({
  tripId,
  userId,
  homeCurrency,
  initialBudgets,
  initialExpenses,
  initialMembers,
  initialSplits,
}: {
  tripId: string;
  userId: string;
  homeCurrency: string;
  initialBudgets: Budget[];
  initialExpenses: Expense[];
  initialMembers: Member[];
  initialSplits: Split[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [budgets, setBudgets] = useState(initialBudgets);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [splits, setSplits] = useState(initialSplits);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(initialMembers.map(m => m.user_id));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const planned = budgets.reduce((sum, b) => sum + Number(b.planned_amount || 0), 0);
  const spent = expenses.reduce((sum, e) => sum + Number(e.converted_amount ?? e.amount ?? 0), 0);
  const remaining = planned - spent;

  async function refresh() {
    const [{ data: b }, { data: e }, { data: s }] = await Promise.all([
      supabase.from("budgets").select("id,category,planned_amount,currency").eq("trip_id", tripId).order("category"),
      supabase.from("expenses").select("id,description,category,amount,currency,converted_amount,home_currency,expense_date,paid_by_user_id,receipt_document_id,notes").eq("trip_id", tripId).order("expense_date", { ascending: false }),
      supabase.from("expense_splits").select("id,expense_id,user_id,amount,status"),
    ]);
    setBudgets((b ?? []) as Budget[]);
    setExpenses((e ?? []) as Expense[]);
    setSplits((s ?? []) as Split[]);
  }

  async function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const category = String(form.get("category") || "");
    const amount = Number(form.get("planned_amount") || 0);

    setBusy(true);
    setMessage("");

    const { error } = await supabase.from("budgets").upsert({
      trip_id: tripId,
      category,
      planned_amount: amount,
      currency: homeCurrency,
    }, { onConflict: "trip_id,category" });

    if (error) setMessage(error.message);
    else {
      formEl.reset();
      await refresh();
      setMessage("Budget category saved.");
    }
    setBusy(false);
  }

  async function convertAmount(amount: number, from: string) {
    if (from === homeCurrency) return amount;
    const response = await fetch(`/api/currency?from=${from}&to=${homeCurrency}&amount=${amount}`);
    const payload = await response.json();
    if (!response.ok || payload.result == null) throw new Error(payload.error || "Currency conversion failed.");
    return Number(payload.result);
  }

  async function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setBusy(true);
    setMessage("");

    try {
      const amount = Number(form.get("amount") || 0);
      const currency = String(form.get("currency") || homeCurrency).toUpperCase();
      const converted = await convertAmount(amount, currency);

      let receiptDocumentId: string | null = null;

      if (receipt) {
        if (receipt.size > 10 * 1024 * 1024) throw new Error("Receipt must be under 10 MB.");
        const safe = receipt.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${tripId}/${userId}/${crypto.randomUUID()}-${safe}`;

        const upload = await supabase.storage.from("receipts").upload(path, receipt, {
          contentType: receipt.type || undefined,
          upsert: false,
        });
        if (upload.error) throw upload.error;

        const doc = await supabase.from("documents").insert({
          trip_id: tripId,
          uploaded_by: userId,
          document_type: "receipt",
          name: receipt.name,
          storage_path: path,
          file_type: receipt.type || null,
          file_size: receipt.size,
          notes: "Expense receipt",
        }).select("id").single();

        if (doc.error || !doc.data) {
          await supabase.storage.from("receipts").remove([path]);
          throw doc.error || new Error("Could not save receipt.");
        }
        receiptDocumentId = doc.data.id;
      }

      const expense = await supabase.from("expenses").insert({
        trip_id: tripId,
        created_by: userId,
        description: String(form.get("description") || "").trim(),
        category: String(form.get("category") || "Other"),
        amount,
        currency,
        converted_amount: converted,
        home_currency: homeCurrency,
        expense_date: String(form.get("expense_date") || new Date().toISOString().slice(0,10)),
        paid_by_user_id: String(form.get("paid_by_user_id") || userId),
        receipt_document_id: receiptDocumentId,
        notes: String(form.get("notes") || "").trim() || null,
      }).select("id").single();

      if (expense.error || !expense.data) throw expense.error || new Error("Could not save expense.");

      const splitUsers = selectedMembers.length ? selectedMembers : [userId];
      const each = amount / splitUsers.length;
      const rows = splitUsers.map((memberId) => ({
        expense_id: expense.data.id,
        user_id: memberId,
        amount: each,
        status: memberId === String(form.get("paid_by_user_id") || userId) ? "paid" : "owed",
      }));

      const splitResult = await supabase.from("expense_splits").insert(rows);
      if (splitResult.error) throw splitResult.error;

      formEl.reset();
      setReceipt(null);
      setSelectedMembers(initialMembers.map(m => m.user_id));
      await refresh();
      setMessage("Expense saved and split.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save expense.");
    } finally {
      setBusy(false);
    }
  }

  async function settleSplit(id: string) {
    const { error } = await supabase.from("expense_splits").update({ status: "settled" }).eq("id", id);
    if (error) setMessage(error.message);
    else await refresh();
  }

  function toggleMember(id: string) {
    setSelectedMembers((current) =>
      current.includes(id) ? current.filter(x => x !== id) : [...current, id]
    );
  }

  function memberName(id: string | null) {
    return initialMembers.find(m => m.user_id === id)?.display_name || "Traveller";
  }

  return (
    <div className="budget-stage5">
      <section className="stats-grid">
        <div className="stat-card"><div className="stat-icon">🎯</div><div><strong>${planned.toLocaleString("en-AU",{maximumFractionDigits:0})}</strong><span>planned</span></div></div>
        <div className="stat-card"><div className="stat-icon">💳</div><div><strong>${spent.toLocaleString("en-AU",{maximumFractionDigits:0})}</strong><span>spent</span></div></div>
        <div className="stat-card"><div className="stat-icon">💰</div><div><strong>${remaining.toLocaleString("en-AU",{maximumFractionDigits:0})}</strong><span>remaining</span></div></div>
        <div className="stat-card"><div className="stat-icon">🧾</div><div><strong>{expenses.length}</strong><span>expenses</span></div></div>
      </section>

      <div className="two-col stage-two-grid">
        <section className="panel">
          <h2>Budget by category</h2>
          <div className="budget-bars">
            {categories.map((category) => {
              const b = budgets.find(x => x.category === category);
              const categorySpent = expenses.filter(e => e.category === category).reduce((s,e) => s + Number(e.converted_amount ?? e.amount),0);
              const max = Math.max(Number(b?.planned_amount || 0), categorySpent, 1);
              const pct = Math.min(100, categorySpent / max * 100);
              return (
                <div className="budget-row" key={category}>
                  <div className="budget-row-head">
                    <strong>{category}</strong>
                    <span>${categorySpent.toFixed(0)} / ${Number(b?.planned_amount || 0).toFixed(0)}</span>
                  </div>
                  <div className="budget-track"><i style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>

          <form className="form-stack compact-form" onSubmit={saveBudget}>
            <h3>Set category budget</h3>
            <div className="form-grid">
              <div className="field">
                <label>Category</label>
                <select name="category">{categories.map(c => <option key={c}>{c}</option>)}</select>
              </div>
              <div className="field">
                <label>Planned amount ({homeCurrency})</label>
                <input name="planned_amount" type="number" min="0" step="0.01" required />
              </div>
            </div>
            <button className="secondary" type="submit" disabled={busy}>Save budget</button>
          </form>
        </section>

        <form className="panel form-stack" onSubmit={addExpense}>
          <div>
            <h2>Add Expense</h2>
            <div className="muted">Add cost, split it between travellers, and attach a receipt.</div>
          </div>

          <div className="field"><label>Description *</label><input name="description" required placeholder="Dinner in Vancouver" /></div>
          <div className="form-grid">
            <div className="field"><label>Category</label><select name="category">{categories.map(c => <option key={c}>{c}</option>)}</select></div>
            <div className="field"><label>Date</label><input name="expense_date" type="date" defaultValue={new Date().toISOString().slice(0,10)} /></div>
            <div className="field"><label>Amount *</label><input name="amount" type="number" min="0" step="0.01" required /></div>
            <div className="field"><label>Currency</label><select name="currency" defaultValue={homeCurrency}>{["AUD","USD","CAD","NZD","EUR","GBP","JPY","FJD","SGD","THB"].map(c => <option key={c}>{c}</option>)}</select></div>
          </div>

          <div className="field">
            <label>Paid by</label>
            <select name="paid_by_user_id" defaultValue={userId}>
              {initialMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Split between</label>
            <div className="member-check-grid">
              {initialMembers.map(m => (
                <label className="member-check" key={m.user_id}>
                  <input type="checkbox" checked={selectedMembers.includes(m.user_id)} onChange={() => toggleMember(m.user_id)} />
                  {m.display_name}
                </label>
              ))}
            </div>
          </div>

          <div className="field"><label>Receipt</label><input type="file" accept="image/*,.pdf" onChange={(e: ChangeEvent<HTMLInputElement>) => setReceipt(e.target.files?.[0] ?? null)} /></div>
          <div className="field"><label>Notes</label><textarea name="notes" /></div>
          <button className="primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save Expense"}</button>
        </form>
      </div>

      <section className="panel">
        <div className="section-title-row"><div><h2>Expenses & Splits</h2><div className="muted">Track who paid and who still owes.</div></div></div>
        {expenses.length ? (
          <div className="expense-stack">
            {expenses.map(expense => {
              const related = splits.filter(s => s.expense_id === expense.id);
              return (
                <article className="expense-card" key={expense.id}>
                  <div className="expense-main">
                    <strong>{expense.description}</strong>
                    <div className="muted">{expense.category} · {expense.expense_date} · Paid by {memberName(expense.paid_by_user_id)}</div>
                    <div className="expense-amount">
                      {Number(expense.amount).toLocaleString("en-AU",{maximumFractionDigits:2})} {expense.currency}
                      {expense.currency !== homeCurrency && expense.converted_amount != null ? <small>≈ {Number(expense.converted_amount).toLocaleString("en-AU",{maximumFractionDigits:2})} {homeCurrency}</small> : null}
                    </div>
                  </div>
                  <div className="split-list">
                    {related.map(s => (
                      <div key={s.id}>
                        <span>{memberName(s.user_id)} · {Number(s.amount).toFixed(2)} {expense.currency}</span>
                        <span className={`split-status ${s.status}`}>{s.status}</span>
                        {s.status === "owed" ? <button type="button" onClick={() => settleSplit(s.id)}>Mark settled</button> : null}
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : <div className="empty-mini">No expenses yet.</div>}
      </section>

      {message ? <div className={message.includes("saved") ? "success" : "error"}>{message}</div> : null}
    </div>
  );
}

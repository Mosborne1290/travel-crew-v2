"use client";

import { FormEvent, useState } from "react";

const currencies = ["AUD","USD","CAD","NZD","EUR","GBP","JPY","FJD","CHF","SGD","HKD","THB","IDR"];

export function CurrencyConverter({
  defaultFrom = "AUD",
  defaultTo = "USD",
}: {
  defaultFrom?: string;
  defaultTo?: string;
}) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [amount, setAmount] = useState("100");
  const [result, setResult] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function convert(event?: FormEvent) {
    event?.preventDefault();
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric < 0) {
      setMessage("Enter a valid amount.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/currency?from=${from}&to=${to}&amount=${numeric}`,
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Currency conversion failed.");
      setResult(payload.result);
      setRate(payload.rate);
      setDate(payload.date || "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Currency conversion failed.");
    } finally {
      setBusy(false);
    }
  }

  function swap() {
    setFrom(to);
    setTo(from);
    setResult(null);
    setRate(null);
  }

  return (
    <section className="currency-card">
      <div>
        <div className="eyebrow">Travel Money</div>
        <h2>Currency Converter</h2>
        <p>Live reference rates from Frankfurter.</p>
      </div>

      <form className="currency-form" onSubmit={convert}>
        <div className="field">
          <label>Amount</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
        </div>

        <div className="currency-row">
          <div className="field">
            <label>From</label>
            <select value={from} onChange={(e) => setFrom(e.target.value)}>
              {currencies.map((c) => <option value={c} key={c}>{c}</option>)}
            </select>
          </div>

          <button className="currency-swap" type="button" onClick={swap} aria-label="Swap currencies">⇄</button>

          <div className="field">
            <label>To</label>
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              {currencies.map((c) => <option value={c} key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <button className="primary" type="submit" disabled={busy}>
          {busy ? "Converting…" : "Convert"}
        </button>
      </form>

      {result != null ? (
        <div className="currency-result">
          <div className="currency-result-main">
            {Number(amount || 0).toLocaleString("en-AU")} {from}
            <span>=</span>
            <strong>{Number(result).toLocaleString("en-AU", { maximumFractionDigits: 2 })} {to}</strong>
          </div>
          {rate != null ? <small>1 {from} = {rate.toFixed(4)} {to}{date ? ` · ${date}` : ""}</small> : null}
        </div>
      ) : null}

      {message ? <div className="error">{message}</div> : null}
    </section>
  );
}

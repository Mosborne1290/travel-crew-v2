import { CurrencyConverter } from "@/components/currency-converter";

export default function MoneyPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <h1>Travel Money</h1>
          <div className="muted">Quick currency conversion for your trips.</div>
        </div>
      </header>
      <CurrencyConverter defaultFrom="AUD" defaultTo="USD" />
    </>
  );
}

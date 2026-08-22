import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ padding: 40 }}>
      <h1>That page could not be found.</h1>
      <p><Link href="/dashboard">Return to Travel Crew</Link></p>
    </main>
  );
}

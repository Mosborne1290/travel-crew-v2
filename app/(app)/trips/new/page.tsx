import { NewTripForm } from "@/components/new-trip-form";
import { requireUser } from "@/lib/auth";

export default async function NewTripPage() {
  const user = await requireUser();

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Create a New Trip</h1>
          <div className="muted">
            Start with the destination, dates and a free Pexels cover photo.
          </div>
        </div>
      </header>

      <NewTripForm userId={user.id} />
    </>
  );
}

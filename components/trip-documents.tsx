"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DocumentRow = {
  id: string;
  document_type: string;
  name: string;
  storage_path: string;
  file_type: string | null;
  file_size: number | null;
  booking_reference: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  uploaded_by: string;
};

function prettyBytes(value: number | null) {
  if (!value) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function TripDocuments({
  tripId,
  userId,
  initialDocuments,
}: {
  tripId: string;
  userId: string;
  initialDocuments: DocumentRow[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [documents, setDocuments] = useState(initialDocuments);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data } = await supabase
      .from("documents")
      .select("id,document_type,name,storage_path,file_type,file_size,booking_reference,expiry_date,notes,created_at,uploaded_by")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });

    setDocuments((data ?? []) as DocumentRow[]);
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setMessage("");
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setMessage("");

    if (!file) {
      setMessage("Choose a document first.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setMessage("Document must be under 25 MB.");
      return;
    }

    const form = new FormData(formElement);
    setBusy(true);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${tripId}/${userId}/${crypto.randomUUID()}-${safeName}`;

    const upload = await supabase.storage.from("trip-documents").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

    if (upload.error) {
      setMessage(upload.error.message);
      setBusy(false);
      return;
    }

    const insert = await supabase.from("documents").insert({
      trip_id: tripId,
      uploaded_by: userId,
      document_type: String(form.get("document_type") || "other"),
      name: String(form.get("name") || "").trim() || file.name,
      storage_path: path,
      file_type: file.type || null,
      file_size: file.size,
      booking_reference: String(form.get("booking_reference") || "").trim() || null,
      expiry_date: String(form.get("expiry_date") || "") || null,
      notes: String(form.get("notes") || "").trim() || null,
    });

    if (insert.error) {
      await supabase.storage.from("trip-documents").remove([path]);
      setMessage(insert.error.message);
      setBusy(false);
      return;
    }

    formElement.reset();
    setFile(null);
    await refresh();
    setMessage("Document uploaded.");
    setBusy(false);
  }

  async function openDocument(row: DocumentRow) {
    const result = await supabase.storage
      .from("trip-documents")
      .createSignedUrl(row.storage_path, 60 * 10);

    if (result.error || !result.data?.signedUrl) {
      setMessage(result.error?.message || "Could not open the document.");
      return;
    }

    window.open(result.data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteDocument(row: DocumentRow) {
    if (!confirm("Delete this document?")) return;

    const record = await supabase.from("documents").delete().eq("id", row.id);
    if (record.error) {
      setMessage(record.error.message);
      return;
    }

    await supabase.storage.from("trip-documents").remove([row.storage_path]);
    await refresh();
  }

  return (
    <div className="two-col stage-two-grid">
      <section className="panel">
        <div className="section-title-row">
          <div>
            <h2>Documents</h2>
            <div className="muted">Private trip documents stored securely in Supabase.</div>
          </div>
          <span className="badge">{documents.length} saved</span>
        </div>

        {documents.length ? (
          <div className="document-stack">
            {documents.map((doc) => (
              <article className="document-card" key={doc.id}>
                <div className="document-icon">
                  {doc.document_type === "flight" ? "✈️" :
                   doc.document_type === "hotel" ? "🏨" :
                   doc.document_type === "cruise" ? "🚢" :
                   doc.document_type === "insurance" ? "🛡️" :
                   doc.document_type === "passport" ? "🛂" :
                   doc.document_type === "receipt" ? "🧾" : "📄"}
                </div>
                <div className="document-copy">
                  <strong>{doc.name}</strong>
                  <div className="document-meta">
                    <span>{doc.document_type}</span>
                    {doc.file_size ? <span>{prettyBytes(doc.file_size)}</span> : null}
                    {doc.booking_reference ? <span>Ref: {doc.booking_reference}</span> : null}
                    {doc.expiry_date ? <span>Expires: {doc.expiry_date}</span> : null}
                  </div>
                  {doc.notes ? <p>{doc.notes}</p> : null}
                  <button className="text-link-button" type="button" onClick={() => openDocument(doc)}>
                    Open document ↗
                  </button>
                </div>
                {doc.uploaded_by === userId ? (
                  <button className="icon-danger" type="button" onClick={() => deleteDocument(doc)}>×</button>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-mini">No documents uploaded yet.</div>
        )}
      </section>

      <form className="panel form-stack" onSubmit={uploadDocument}>
        <div>
          <h3>Upload document</h3>
          <div className="muted">PDFs, booking confirmations, insurance, visas and receipts.</div>
        </div>

        <div className="field">
          <label htmlFor="doc-file">File *</label>
          <input
            id="doc-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            onChange={chooseFile}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="doc-name">Document name</label>
          <input id="doc-name" name="name" placeholder="Royal Caribbean confirmation" />
        </div>

        <div className="field">
          <label htmlFor="doc-type">Type</label>
          <select id="doc-type" name="document_type" defaultValue="other">
            <option value="flight">Flight</option>
            <option value="hotel">Hotel</option>
            <option value="cruise">Cruise</option>
            <option value="insurance">Insurance</option>
            <option value="passport">Passport</option>
            <option value="visa">Visa</option>
            <option value="tour">Tour</option>
            <option value="transport">Transport</option>
            <option value="receipt">Receipt</option>
            <option value="medical">Medical</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="doc-ref">Booking reference</label>
          <input id="doc-ref" name="booking_reference" />
        </div>

        <div className="field">
          <label htmlFor="doc-expiry">Expiry date</label>
          <input id="doc-expiry" name="expiry_date" type="date" />
        </div>

        <div className="field">
          <label htmlFor="doc-notes">Notes</label>
          <textarea id="doc-notes" name="notes" />
        </div>

        {message ? <div className={message.includes("uploaded") ? "success" : "error"}>{message}</div> : null}

        <button className="primary" type="submit" disabled={busy || !file}>
          {busy ? "Uploading…" : "Upload Document"}
        </button>
      </form>
    </div>
  );
}

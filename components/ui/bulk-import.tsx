"use client";

import { useRef, useState } from "react";
import { X, Upload, Download, CheckCircle, AlertCircle, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

export interface BulkImportRow {
  [key: string]: string;
}

interface ColumnDef {
  key: string;
  label: string;
  required?: boolean;
}

interface BulkImportProps {
  title: string;
  description: string;
  columns: ColumnDef[];
  onImport: (rows: BulkImportRow[]) => Promise<{ success: number; errors: string[] }>;
  onClose: () => void;
}

function parseCsv(text: string, columns: ColumnDef[]): BulkImportRow[] {
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: BulkImportRow = {};
    columns.forEach((col) => {
      const idx = headers.indexOf(col.key.toLowerCase());
      row[col.key] = idx >= 0 ? values[idx] ?? "" : "";
    });
    return row;
  }).filter((row) => columns.some((c) => c.required && row[c.key]));
}

function downloadTemplate(columns: ColumnDef[]) {
  const header = columns.map((c) => c.key).join(",");
  const example = columns.map((c) => `Example ${c.label}`).join(",");
  const blob = new Blob([`${header}\n${example}\n`], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: "template.csv" });
  a.click();
  URL.revokeObjectURL(url);
}

export function BulkImportModal({ title, description, columns, onImport, onClose }: BulkImportProps) {
  const fileRef             = useRef<HTMLInputElement>(null);
  const [rows,    setRows]  = useState<BulkImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<{ success: number; errors: string[] } | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) { toast.error("Please upload a .csv file"); return; }
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCsv(text, columns);
      setRows(parsed);
      if (parsed.length === 0) toast.error("No valid rows found. Check your CSV format.");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setLoading(true);
    try {
      const res = await onImport(rows);
      setResult(res);
      if (res.success > 0) toast.success(`Imported ${res.success} records successfully`);
      if (res.errors.length > 0) toast.error(`${res.errors.length} rows had errors`);
    } catch {
      toast.error("Import failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const preview = rows.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Template download */}
          <button
            onClick={() => downloadTemplate(columns)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition text-sm"
          >
            <Download className="w-4 h-4 text-primary shrink-0" />
            <div className="text-left">
              <p className="font-medium text-foreground">Download CSV Template</p>
              <p className="text-xs text-muted-foreground">Columns: {columns.map((c) => c.label).join(", ")}</p>
            </div>
          </button>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 cursor-pointer transition ${
              dragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <FileText className="w-8 h-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">{fileName ?? "Drop your CSV here"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">or click to browse</p>
            </div>
            {rows.length > 0 && (
              <span className="px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                {rows.length} rows ready to import
              </span>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

          {/* Preview */}
          {preview.length > 0 && !result && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview ({rows.length} total rows)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50">
                      {columns.map((c) => (
                        <th key={c.key} className="px-3 py-2 text-left font-semibold text-muted-foreground">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                        {columns.map((c) => (
                          <td key={c.key} className="px-3 py-2 text-foreground">{row[c.key] || <span className="text-muted-foreground italic">—</span>}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 5 && (
                <p className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
                  +{rows.length - 5} more rows not shown
                </p>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-win" />
                <p className="text-sm font-semibold text-foreground">{result.success} records imported successfully</p>
              </div>
              {result.errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-loss">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{e}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={rows.length === 0 || loading || !!result}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</> : <><Upload className="w-4 h-4" /> Import {rows.length > 0 ? rows.length : ""} Records</>}
          </button>
        </div>
      </div>
    </div>
  );
}

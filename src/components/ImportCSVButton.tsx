import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseCSV } from "@/lib/import-csv";

interface Props {
  /** Recebe linhas (sem header) e cabeçalhos normalizados (lowercase trim). Retorna {ok, fail}. */
  onImport: (rows: string[][], headers: string[]) => Promise<{ ok: number; fail: number; skipped?: number }>;
  label?: string;
}

export default function ImportCSVButton({ onImport, label = "Importar CSV" }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length < 2) { toast.error("CSV vazio ou sem dados"); return; }
      const headers = rows[0].map(h => h.trim().toLowerCase());
      const result = await onImport(rows.slice(1), headers);
      const parts = [`${result.ok} adicionados`];
      if (result.skipped) parts.push(`${result.skipped} ignorados`);
      if (result.fail) parts.push(`${result.fail} falharam`);
      toast.success(`Importação concluída: ${parts.join(", ")}`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar CSV");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handle} />
      <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()} disabled={importing}>
        {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {label}
      </Button>
    </>
  );
}

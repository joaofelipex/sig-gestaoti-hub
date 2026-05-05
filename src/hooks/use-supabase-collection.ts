import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Generic hook to load/save/delete a collection from a Supabase table.
 * - `mapFromDb` converts a DB row to UI shape
 * - `mapToDb` converts the UI item to a DB-insertable payload (must include org_id)
 */
export function useSupabaseCollection<UI extends { id: string }, DB extends { id: string }>(
  table: string,
  mapFromDb: (row: DB) => UI,
  mapToDb: (item: UI, orgId: string) => Record<string, unknown>,
  label: string,
) {
  const [items, setItems] = useState<UI[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id")
      .maybeSingle();
    if (!profile?.org_id) {
      setLoading(false);
      return;
    }
    setOrgId(profile.org_id);
    const { data, error } = await supabase
      .from(table as never)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(`Erro ao carregar ${label}: ${error.message}`);
    } else {
      setItems(((data as unknown) as DB[]).map(mapFromDb));
    }
    setLoading(false);
  }, [table, label, mapFromDb]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (item: UI) => {
    if (!orgId) return toast.error("Organização não encontrada");
    const exists = items.some(i => i.id === item.id);
    const payload = mapToDb(item, orgId);

    if (exists) {
      const { error } = await supabase
        .from(table as never)
        .update(payload as never)
        .eq("id", item.id);
      if (error) return toast.error(`Erro ao atualizar: ${error.message}`);
      setItems(prev => prev.map(i => (i.id === item.id ? item : i)));
    } else {
      // Don't send temp client-side id; let DB generate uuid
      const { id: _ignore, ...rest } = payload as Record<string, unknown>;
      const { data, error } = await supabase
        .from(table as never)
        .insert(rest as never)
        .select()
        .single();
      if (error) return toast.error(`Erro ao salvar: ${error.message}`);
      setItems(prev => [mapFromDb(data as unknown as DB), ...prev]);
    }
  };

  const remove = async (item: UI) => {
    const { error } = await supabase
      .from(table as never)
      .delete()
      .eq("id", item.id);
    if (error) return toast.error(`Erro ao excluir: ${error.message}`);
    setItems(prev => prev.filter(i => i.id !== item.id));
  };

  return { items, save, remove, loading, reload: load };
}

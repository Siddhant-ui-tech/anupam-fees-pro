import { supabase } from "@/integrations/supabase/client";

export const logService = {
  async log(action: string, studentName: string, details?: string) {
    await supabase.from("activity_logs").insert({
      action,
      student_name: studentName,
      details: details || null,
    });
  },

  async getRecent(limit = 50) {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },
};

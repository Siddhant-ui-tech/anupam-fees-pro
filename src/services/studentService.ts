import { supabase } from "@/integrations/supabase/client";
import { logService } from "./logService";

export interface StudentPayload {
  name: string;
  phone: string;
  instrument: string;
  joining_date: string;
  monthly_fee: number;
  next_due_date: string;
}

export const studentService = {
  async getAll() {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("name");
    if (error) throw error;
    return data || [];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(payload: StudentPayload) {
    const { data, error } = await supabase
      .from("students")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    await logService.log("Student Added", payload.name, `${payload.instrument}, ₹${payload.monthly_fee}/month`);
    return data;
  },

  async update(id: string, payload: Partial<StudentPayload>) {
    const { data, error } = await supabase
      .from("students")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (data) await logService.log("Student Edited", data.name, `Updated details`);
    return data;
  },

  async delete(id: string, name: string) {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) throw error;
    await logService.log("Student Deleted", name, "Removed from system");
  },
};

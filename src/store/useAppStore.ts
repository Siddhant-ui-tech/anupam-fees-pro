import { create } from "zustand";
import { studentService } from "@/services/studentService";
import { paymentService } from "@/services/paymentService";
import { logService } from "@/services/logService";
import type { Tables } from "@/integrations/supabase/types";

type Student = Tables<"students">;

interface PaymentWithStudent {
  id: string;
  amount: number;
  payment_date: string;
  next_due_date: string;
  method: string | null;
  students: { name: string } | null;
}

interface ActivityLog {
  id: string;
  action: string;
  student_name: string;
  details: string | null;
  created_at: string;
}

interface AppState {
  students: Student[];
  payments: PaymentWithStudent[];
  logs: ActivityLog[];
  loading: boolean;

  fetchStudents: () => Promise<void>;
  fetchPayments: () => Promise<void>;
  fetchLogs: () => Promise<void>;
  setStudents: (students: Student[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  students: [],
  payments: [],
  logs: [],
  loading: true,

  fetchStudents: async () => {
    try {
      const data = await studentService.getAll();
      set({ students: data });
    } catch { /* handled by caller */ }
  },

  fetchPayments: async () => {
    try {
      const data = await paymentService.getAll();
      set({ payments: data as PaymentWithStudent[] });
    } catch { /* handled by caller */ }
  },

  fetchLogs: async () => {
    try {
      const data = await logService.getRecent();
      set({ logs: data as ActivityLog[] });
    } catch { /* handled by caller */ }
  },

  setStudents: (students) => set({ students }),
}));

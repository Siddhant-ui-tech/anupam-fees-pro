import { supabase } from "@/integrations/supabase/client";
import { logService } from "./logService";
import { format, addMonths, isBefore, startOfDay } from "date-fns";

export const paymentService = {
  async getAll() {
    const { data, error } = await supabase
      .from("payments")
      .select("id, amount, payment_date, next_due_date, method, students(name)")
      .order("payment_date", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getByStudentId(studentId: string) {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("student_id", studentId)
      .order("payment_date", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async collectFee(studentId: string, studentName: string, amount: number, dueDate: string, method: string = "cash", paymentDate?: string) {
    const payDate = paymentDate || format(new Date(), "yyyy-MM-dd");
    const payDateObj = startOfDay(new Date(payDate));
    const dueDateObj = startOfDay(new Date(dueDate));

    // If payment_date > due_date: next = due_date + 1 month, else next = payment_date + 1 month
    const baseDate = isBefore(dueDateObj, payDateObj) ? dueDateObj : payDateObj;
    const nextDue = format(addMonths(baseDate, 1), "yyyy-MM-dd");

    const { error: payError } = await supabase.from("payments").insert({
      student_id: studentId,
      amount,
      payment_date: payDate,
      next_due_date: nextDue,
      method,
    });
    if (payError) throw payError;

    const { error: updateError } = await supabase
      .from("students")
      .update({ next_due_date: nextDue })
      .eq("id", studentId);
    if (updateError) throw updateError;

    const formattedDate = format(payDateObj, "d MMMM");
    await logService.log("Fee Collected", studentName, `₹${amount} collected on ${formattedDate} via ${method}`);
    return nextDue;
  },

  async revertLastPayment(studentId: string, studentName: string, currentDueDate: string) {
    const prevDate = new Date(currentDueDate);
    prevDate.setMonth(prevDate.getMonth() - 1);
    const revertedDate = format(prevDate, "yyyy-MM-dd");

    const { error: delError } = await supabase
      .from("payments")
      .delete()
      .eq("student_id", studentId)
      .order("payment_date", { ascending: false })
      .limit(1);
    if (delError) throw delError;

    await supabase.from("students").update({ next_due_date: revertedDate }).eq("id", studentId);
    await logService.log("Payment Reverted", studentName, `Due date reset to ${revertedDate}`);
  },

  async getMonthlyRevenue(year: number) {
    const chart: { month: string; amount: number }[] = [];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    for (let i = 0; i < 12; i++) {
      const start = `${year}-${String(i + 1).padStart(2, "0")}-01`;
      const end = `${year}-${String(i + 1).padStart(2, "0")}-${new Date(year, i + 1, 0).getDate()}`;
      const { data } = await supabase
        .from("payments")
        .select("amount")
        .gte("payment_date", start)
        .lte("payment_date", end);
      chart.push({ month: months[i], amount: (data || []).reduce((s, p) => s + p.amount, 0) });
    }
    return chart;
  },

  async getCollectedInRange(start: string, end: string) {
    const { data } = await supabase
      .from("payments")
      .select("amount")
      .gte("payment_date", start)
      .lte("payment_date", end);
    return (data || []).reduce((s, p) => s + p.amount, 0);
  },
};

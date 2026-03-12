import { format, addMonths, isToday, isBefore, isAfter, startOfDay } from "date-fns";

export type FeeStatus = "paid" | "due-today" | "overdue";

export function getStudentStatus(nextDueDate: string): FeeStatus {
  const due = startOfDay(new Date(nextDueDate));
  const today = startOfDay(new Date());

  if (isToday(due)) return "due-today";
  if (isBefore(due, today)) return "overdue";
  return "paid";
}

export function getStatusColor(status: FeeStatus) {
  switch (status) {
    case "paid": return "bg-success text-success-foreground";
    case "due-today": return "bg-warning text-warning-foreground";
    case "overdue": return "bg-destructive text-destructive-foreground";
  }
}

export function getStatusLabel(status: FeeStatus) {
  switch (status) {
    case "paid": return "Paid";
    case "due-today": return "Due Today";
    case "overdue": return "Overdue";
  }
}

export function calculateNextDueDate(fromDate: string): string {
  return format(addMonths(new Date(fromDate), 1), "yyyy-MM-dd");
}

export function formatDate(date: string): string {
  return format(new Date(date), "dd MMM yyyy");
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

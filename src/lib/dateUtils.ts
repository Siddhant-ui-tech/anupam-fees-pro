import { format, addMonths, isToday, isBefore, differenceInDays, startOfDay } from "date-fns";

export type FeeStatus = "paid" | "due-soon" | "due-today" | "overdue";

export function getStudentStatus(nextDueDate: string): FeeStatus {

  const due = startOfDay(new Date(nextDueDate));
  const today = startOfDay(new Date());

  const diff = differenceInDays(due, today);

  if (isBefore(due, today)) return "overdue";

  if (isToday(due)) return "due-today";

  if (diff <= 3) return "due-soon";

  return "paid";
}

export function getStatusColor(status: FeeStatus) {

  switch (status) {

    case "paid":
      return "bg-success text-success-foreground";

    case "due-soon":
      return "bg-orange-500 text-white";

    case "due-today":
      return "bg-warning text-warning-foreground";

    case "overdue":
      return "bg-destructive text-destructive-foreground";
  }
}

export function getStatusLabel(status: FeeStatus) {

  switch (status) {

    case "paid":
      return "Paid";

    case "due-soon":
      return "Due Soon";

    case "due-today":
      return "Due Today";

    case "overdue":
      return "Overdue";
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

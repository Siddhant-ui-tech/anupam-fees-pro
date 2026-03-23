import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CreditCard, AlertTriangle, CalendarCheck, Activity } from "lucide-react";
import { getStudentStatus, getStatusColor, getStatusLabel, formatDate, formatCurrency } from "@/lib/dateUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { paymentService } from "@/services/paymentService";
import { format } from "date-fns";

export default function Dashboard() {
  const { students, fetchStudents, logs, fetchLogs } = useAppStore();
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; amount: number }[]>([]);
  const [collectedThisMonth, setCollectedThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, () => fetchStudents())
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadData = async () => {
    await fetchStudents();
    await fetchLogs();
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const end = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;
    const collected = await paymentService.getCollectedInRange(start, end);
    setCollectedThisMonth(collected);

    const chart: { month: string; amount: number }[] = [];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, now.getMonth() - i, 1);
      const ms = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mStart = `${ms}-01`;
      const mEnd = `${ms}-${new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()}`;
      const amt = await paymentService.getCollectedInRange(mStart, mEnd);
      chart.push({ month: months[d.getMonth()], amount: amt });
    }
    setMonthlyRevenue(chart);
    setLoading(false);
  };

  const totalStudents = students.length;
  const paidCount = students.filter(s => getStudentStatus(s.next_due_date) === "paid").length;
  const overdueCount = students.filter(s => getStudentStatus(s.next_due_date) === "overdue").length;
  const pendingCount = students.filter(s => {
    const st = getStudentStatus(s.next_due_date);
    return st === "due-soon" || st === "due-today";
  }).length;
  const pendingFees = students.filter(s => getStudentStatus(s.next_due_date) !== "paid").reduce((sum, s) => sum + s.monthly_fee, 0);
  const dueToday = students.filter(s => getStudentStatus(s.next_due_date) === "due-today").length;
  const alertStudents = students.filter(s => getStudentStatus(s.next_due_date) !== "paid");

  const stats = [
    { label: "Total Students", value: totalStudents, icon: Users, color: "text-accent" },
    { label: "Collected (Month)", value: formatCurrency(collectedThisMonth), icon: CreditCard, color: "text-success" },
    { label: "Pending Fees", value: formatCurrency(pendingFees), icon: AlertTriangle, color: "text-destructive" },
    { label: "Due Today", value: dueToday, icon: CalendarCheck, color: "text-warning" },
  ];

  const statusCards = [
    { label: "Paid", value: paidCount, cls: "text-success" },
    { label: "Pending", value: pendingCount, cls: "text-warning" },
    { label: "Overdue", value: overdueCount, cls: "text-destructive" },
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">
        <h2 className="text-lg font-bold">Dashboard</h2>

        <div className="grid grid-cols-2 gap-3">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <p className="text-xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Status breakdown */}
        <div className="flex gap-2">
          {statusCards.map(({ label, value, cls }) => (
            <Card key={label} className="flex-1 shadow-sm">
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold ${cls}`}>{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={11} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="amount" fill="hsl(30, 100%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Due/Overdue Alerts */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Due Today & Overdue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {alertStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">All fees up to date! 🎉</p>
            ) : (
              <div className="divide-y divide-border">
                {alertStudents.map(s => {
                  const status = getStudentStatus(s.next_due_date);
                  return (
                    <div key={s.id} className={`flex items-center justify-between p-3 ${status === "overdue" ? "bg-destructive/5" : ""}`}>
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.instrument} · {formatCurrency(s.monthly_fee)}</p>
                        <p className="text-xs text-muted-foreground">Due: {formatDate(s.next_due_date)}</p>
                      </div>
                      <Badge className={`${getStatusColor(status)} text-xs`}>{getStatusLabel(status)}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Log */}
        {logs.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border max-h-60 overflow-auto">
                {logs.slice(0, 10).map(log => (
                  <div key={log.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{log.action}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(log.created_at), "dd MMM, HH:mm")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{log.student_name}</p>
                    {log.details && <p className="text-xs text-muted-foreground/70">{log.details}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

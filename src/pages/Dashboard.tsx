import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CreditCard, AlertTriangle, CalendarCheck } from "lucide-react";
import { getStudentStatus, getStatusColor, getStatusLabel, formatDate, formatCurrency } from "@/lib/dateUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

type Student = Tables<"students">;

export default function Dashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; amount: number }[]>([]);
  const [collectedThisMonth, setCollectedThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: studentsData } = await supabase.from("students").select("*").order("next_due_date", { ascending: true });
    setStudents(studentsData || []);

    // This month's collection
    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const lastOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;
    
    const { data: paymentsThisMonth } = await supabase
      .from("payments")
      .select("amount")
      .gte("payment_date", firstOfMonth)
      .lte("payment_date", lastOfMonth);

    const collected = (paymentsThisMonth || []).reduce((sum, p) => sum + p.amount, 0);
    setCollectedThisMonth(collected);

    // Monthly revenue for chart (last 6 months)
    const chartData: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()}`;

      const { data: mp } = await supabase
        .from("payments")
        .select("amount")
        .gte("payment_date", start)
        .lte("payment_date", end);

      chartData.push({
        month: d.toLocaleString("default", { month: "short" }),
        amount: (mp || []).reduce((s, p) => s + p.amount, 0),
      });
    }
    setMonthlyRevenue(chartData);
    setLoading(false);
  };

  const totalStudents = students.length;
  const pendingFees = students.filter(s => getStudentStatus(s.next_due_date) !== "paid").reduce((sum, s) => sum + s.monthly_fee, 0);
  const dueToday = students.filter(s => getStudentStatus(s.next_due_date) === "due-today").length;
  const dueStudents = students.filter(s => getStudentStatus(s.next_due_date) !== "paid");

  const stats = [
    { label: "Total Students", value: totalStudents, icon: Users, color: "text-accent" },
    { label: "Collected (Month)", value: formatCurrency(collectedThisMonth), icon: CreditCard, color: "text-success" },
    { label: "Pending Fees", value: formatCurrency(pendingFees), icon: AlertTriangle, color: "text-destructive" },
    { label: "Due Today", value: dueToday, icon: CalendarCheck, color: "text-warning" },
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

        {/* Stats Grid */}
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

        {/* Revenue Chart */}
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

        {/* Due Students */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Students Due / Overdue</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dueStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">All fees up to date! 🎉</p>
            ) : (
              <div className="divide-y divide-border">
                {dueStudents.map(s => {
                  const status = getStudentStatus(s.next_due_date);
                  return (
                    <div key={s.id} className="flex items-center justify-between p-3">
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.instrument} · {formatCurrency(s.monthly_fee)}</p>
                        <p className="text-xs text-muted-foreground">Due: {formatDate(s.next_due_date)}</p>
                      </div>
                      <Badge className={`${getStatusColor(status)} text-xs`}>
                        {getStatusLabel(status)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

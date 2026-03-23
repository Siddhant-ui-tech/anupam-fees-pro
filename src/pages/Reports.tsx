import { useEffect, useState } from "react";
import { paymentService } from "@/services/paymentService";
import { studentService } from "@/services/studentService";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/dateUtils";
import { downloadCSV } from "@/lib/csvExport";
import { supabase } from "@/integrations/supabase/client";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function Reports() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth()));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [totalStudents, setTotalStudents] = useState(0);
  const [expectedFees, setExpectedFees] = useState(0);
  const [collectedFees, setCollectedFees] = useState(0);
  const [chartData, setChartData] = useState<{ month: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReport(); }, [month, year]);

  const fetchReport = async () => {
    setLoading(true);
    const m = parseInt(month) + 1;
    const y = parseInt(year);
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const end = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;

    const students = await studentService.getAll();
    const collected = await paymentService.getCollectedInRange(start, end);
    const chart = await paymentService.getMonthlyRevenue(y);

    setTotalStudents(students.length);
    setExpectedFees(students.reduce((s, st) => s + st.monthly_fee, 0));
    setCollectedFees(collected);
    setChartData(chart);
    setLoading(false);
  };

  const exportStudents = async () => {
    const data = await studentService.getAll();
    if (data.length > 0) downloadCSV(data, `students_${year}_${MONTHS[parseInt(month)]}`);
  };

  const exportPayments = async () => {
    const m = parseInt(month) + 1;
    const y = parseInt(year);
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const end = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;
    const { data } = await supabase.from("payments").select("*, students(name)").gte("payment_date", start).lte("payment_date", end);
    if (data && data.length > 0) {
      const flat = data.map((p: any) => ({
        student_name: p.students?.name || "", amount: p.amount,
        payment_date: p.payment_date, next_due_date: p.next_due_date, method: p.method || "",
      }));
      downloadCSV(flat, `payments_${year}_${MONTHS[parseInt(month)]}`);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i));

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">
        <h2 className="text-lg font-bold">Reports</h2>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="text-xs">Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="text-xs">Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Students", value: totalStudents },
                { label: "Expected Fees", value: formatCurrency(expectedFees) },
                { label: "Collected", value: formatCurrency(collectedFees) },
                { label: "Pending", value: formatCurrency(expectedFees - collectedFees) },
              ].map(({ label, value }) => (
                <Card key={label} className="shadow-sm">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue – {year}</CardTitle></CardHeader>
              <CardContent className="p-2">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={10} tickLine={false} />
                    <YAxis fontSize={10} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="amount" fill="hsl(30, 100%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={exportStudents} variant="outline" className="flex-1 h-11">
                <Download className="h-4 w-4 mr-1" /> Students CSV
              </Button>
              <Button onClick={exportPayments} variant="outline" className="flex-1 h-11">
                <Download className="h-4 w-4 mr-1" /> Payments CSV
              </Button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

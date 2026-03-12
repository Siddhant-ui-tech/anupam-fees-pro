import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { getStudentStatus, getStatusColor, getStatusLabel, formatDate, formatCurrency, calculateNextDueDate } from "@/lib/dateUtils";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Student = Tables<"students">;
type Payment = Tables<"payments">;

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchData(id);
  }, [id]);

  const fetchData = async (studentId: string) => {
    const { data: s } = await supabase.from("students").select("*").eq("id", studentId).single();
    setStudent(s);
    const { data: p } = await supabase.from("payments").select("*").eq("student_id", studentId).order("payment_date", { ascending: false });
    setPayments(p || []);
    setLoading(false);
  };

  const handlePayFee = async () => {
    if (!student) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const nextDue = calculateNextDueDate(today);

    await supabase.from("payments").insert({
      student_id: student.id,
      amount: student.monthly_fee,
      payment_date: today,
      next_due_date: nextDue,
    });
    await supabase.from("students").update({ next_due_date: nextDue }).eq("id", student.id);
    toast.success("Fee recorded!");
    fetchData(student.id);
  };

  if (loading || !student) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  const status = getStudentStatus(student.next_due_date);

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate("/students")} className="px-0">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <Card className="shadow-sm">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{student.name}</h2>
              <Badge className={getStatusColor(status)}>{getStatusLabel(status)}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Phone:</span> {student.phone}</div>
              <div><span className="text-muted-foreground">Instrument:</span> {student.instrument}</div>
              <div><span className="text-muted-foreground">Joined:</span> {formatDate(student.joining_date)}</div>
              <div><span className="text-muted-foreground">Fee:</span> {formatCurrency(student.monthly_fee)}</div>
              <div className="col-span-2"><span className="text-muted-foreground">Next Due:</span> {formatDate(student.next_due_date)}</div>
            </div>

            {status !== "paid" && (
              <Button onClick={handlePayFee} className="w-full h-12 bg-success text-success-foreground hover:bg-success/90 text-base font-semibold mt-2">
                <Check className="h-5 w-5 mr-2" /> Fee Received – {formatCurrency(student.monthly_fee)}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">No payments recorded yet</p>
            ) : (
              <div className="divide-y divide-border">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-sm font-medium">{formatDate(p.payment_date)}</p>
                      <p className="text-xs text-muted-foreground">Next due: {formatDate(p.next_due_date)}</p>
                    </div>
                    <p className="font-semibold text-sm text-success">{formatCurrency(p.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

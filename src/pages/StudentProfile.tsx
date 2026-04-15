import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { studentService } from "@/services/studentService";
import { paymentService } from "@/services/paymentService";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CollectFeeModal } from "@/components/CollectFeeModal";
import { ArrowLeft, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { getStudentStatus, getStatusColor, getStatusLabel, formatDate, formatCurrency } from "@/lib/dateUtils";
import type { Tables } from "@/integrations/supabase/types";

type Student = Tables<"students">;
type Payment = Tables<"payments">;



export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);

  useEffect(() => {
    if (id) fetchData(id);
  }, [id]);

  const fetchData = async (studentId: string) => {
    const s = await studentService.getById(studentId);
    setStudent(s);
    const p = await paymentService.getByStudentId(studentId);
    setPayments(p);
    setLoading(false);
  };

  const openPayModal = () => {
    if (!student) return;
    setShowPayModal(true);
  };

  const handleCollectFee = async (amount: number, method: string, paymentDate: string) => {
    if (!student) return;
    try {
      await paymentService.collectFee(student.id, student.name, amount, student.next_due_date, method, paymentDate);
      toast.success("Fee recorded!");
      setShowPayModal(false);
      fetchData(student.id);
    } catch (err: any) { toast.error(err.message); }
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

            <Button onClick={openPayModal} className="w-full h-12 bg-success text-success-foreground hover:bg-success/90 text-base font-semibold mt-2">
              <IndianRupee className="h-5 w-5 mr-2" /> Collect Fee – {formatCurrency(student.monthly_fee)}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Payment History</CardTitle></CardHeader>
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
                      {(p as any).method && <p className="text-xs text-muted-foreground">via {(p as any).method}</p>}
                    </div>
                    <p className="font-semibold text-sm text-success">{formatCurrency(p.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CollectFeeModal
        open={showPayModal}
        onOpenChange={setShowPayModal}
        studentName={student.name}
        defaultAmount={student.monthly_fee}
        nextDueDate={student.next_due_date}
        onConfirm={handleCollectFee}
      />
    </AppLayout>
  );
}

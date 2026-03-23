import { useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Download, LogOut, Moon, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { studentService } from "@/services/studentService";
import { downloadCSV } from "@/lib/csvExport";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { logs, fetchLogs } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => { fetchLogs(); }, []);

  const handleLogout = async () => { await signOut(); navigate("/login"); };

  const exportStudents = async () => {
    const data = await studentService.getAll();
    if (data.length > 0) { downloadCSV(data, "students_backup"); toast.success("Students backup downloaded"); }
    else toast.info("No students to export");
  };

  const exportPayments = async () => {
    const { data } = await supabase.from("payments").select("*, students(name)");
    if (data && data.length > 0) {
      const flat = data.map((p: any) => ({
        student_name: p.students?.name || "", amount: p.amount,
        payment_date: p.payment_date, next_due_date: p.next_due_date, method: p.method || "",
      }));
      downloadCSV(flat, "payments_backup"); toast.success("Payments backup downloaded");
    } else toast.info("No payments to export");
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">
        <h2 className="text-lg font-bold">Settings</h2>

        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Account</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Admin Email</p>
              <p className="text-sm font-medium">{user?.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Theme</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Moon className="h-4 w-4 text-muted-foreground" /><span className="text-sm">Dark Mode</span></div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Data Backup</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={exportStudents} variant="outline" className="w-full h-11"><Download className="h-4 w-4 mr-2" /> Export Students Backup</Button>
            <Button onClick={exportPayments} variant="outline" className="w-full h-11"><Download className="h-4 w-4 mr-2" /> Export Payments Backup</Button>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        {logs.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-accent" /> Activity Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border max-h-80 overflow-auto">
                {logs.map(log => (
                  <div key={log.id} className="p-3 flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium">{log.action}</p>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(log.created_at), "dd MMM, HH:mm")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{log.student_name}</p>
                      {log.details && <p className="text-xs text-muted-foreground/70">{log.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Button onClick={handleLogout} variant="destructive" className="w-full h-12 text-base font-semibold">
          <LogOut className="h-5 w-5 mr-2" /> Sign Out
        </Button>
      </div>
    </AppLayout>
  );
}

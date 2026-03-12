import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Eye, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getStudentStatus, getStatusColor, getStatusLabel, formatDate, formatCurrency, calculateNextDueDate } from "@/lib/dateUtils";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";

type Student = Tables<"students">;

const INSTRUMENTS = ["Guitar", "Piano", "Tabla", "Drums", "Vocals", "Other"];

export default function Students() {

  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [instrument, setInstrument] = useState("");
  const [joiningDate, setJoiningDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [monthlyFee, setMonthlyFee] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const { data } = await supabase
      .from("students")
      .select("*")
      .order("name");

    setStudents(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setInstrument("");
    setJoiningDate(format(new Date(), "yyyy-MM-dd"));
    setMonthlyFee("");
    setEditStudent(null);
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (s: Student) => {
    setEditStudent(s);
    setName(s.name);
    setPhone(s.phone);
    setInstrument(s.instrument);
    setJoiningDate(s.joining_date);
    setMonthlyFee(String(s.monthly_fee));
    setShowForm(true);
  };

  const handleSave = async () => {

    if (!name || !phone || !instrument || !joiningDate || !monthlyFee) {
      toast.error("Please fill all fields");
      return;
    }

    const nextDue = calculateNextDueDate(joiningDate);

    const payload = {
      name,
      phone,
      instrument,
      joining_date: joiningDate,
      monthly_fee: parseInt(monthlyFee),
      next_due_date: editStudent ? editStudent.next_due_date : nextDue,
    };

    if (editStudent) {

      const { error } = await supabase
        .from("students")
        .update(payload)
        .eq("id", editStudent.id);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Student updated");

    } else {

      const { error } = await supabase
        .from("students")
        .insert(payload);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Student added");
    }

    setShowForm(false);
    resetForm();
    fetchStudents();
  };

  const handleDelete = async (id: string) => {

    if (!confirm("Delete this student and all their payments?")) return;

    await supabase
      .from("students")
      .delete()
      .eq("id", id);

    toast.success("Student deleted");
    fetchStudents();
  };

  const handlePayFee = async (s: Student) => {

    if (!confirm(`Receive ₹${s.monthly_fee} from ${s.name}?`)) return;

    const today = format(new Date(), "yyyy-MM-dd");
    const nextDue = calculateNextDueDate(today);

    const { error: payError } = await supabase
      .from("payments")
      .insert({
        student_id: s.id,
        amount: s.monthly_fee,
        payment_date: today,
        next_due_date: nextDue,
      });

    if (payError) {
      toast.error(payError.message);
      return;
    }

    await supabase
      .from("students")
      .update({ next_due_date: nextDue })
      .eq("id", s.id);

    toast.success(`Fee received from ${s.name}`);

    fetchStudents();
  };

  const handleRevertPayment = async (s: Student) => {

    if (!confirm("Revert last payment?")) return;

    const prevDate = new Date(s.next_due_date);
    prevDate.setMonth(prevDate.getMonth() - 1);

    const revertedDate = format(prevDate, "yyyy-MM-dd");

    await supabase
      .from("payments")
      .delete()
      .eq("student_id", s.id)
      .order("payment_date", { ascending: false })
      .limit(1);

    await supabase
      .from("students")
      .update({ next_due_date: revertedDate })
      .eq("id", s.id);

    toast.success(`Payment reverted for ${s.name}`);

    fetchStudents();
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.instrument.toLowerCase().includes(search.toLowerCase())
  );

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

      <div className="p-4 space-y-3 animate-fade-in">

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Students</h2>

          <Button
            onClick={openAdd}
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

          <Input
            placeholder="Search students..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        <div className="space-y-2">

          {filtered.map(s => {

            const status = getStudentStatus(s.next_due_date);

            return (
              <Card key={s.id} className={`shadow-sm ${status === "overdue" ? "border-destructive/50" : ""}`}>

                <CardContent className="p-3">

                  <div className="flex items-start justify-between">

                    <div className="flex-1 min-w-0">

                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm truncate">{s.name}</p>

                        <Badge className={`${getStatusColor(status)} text-[10px] px-1.5 py-0`}>
                          {getStatusLabel(status)}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {s.instrument} · {s.phone}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Fee: {formatCurrency(s.monthly_fee)} · Due: {formatDate(s.next_due_date)}
                      </p>

                    </div>

                  </div>

                  <div className="flex items-center gap-1.5 mt-2">

                    <Button
                      size="sm"
                      onClick={() => handlePayFee(s)}
                      className="bg-success text-success-foreground hover:bg-success/90 h-8 text-xs flex-1"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Collect Fee
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRevertPayment(s)}
                      className="h-8 text-xs flex-1"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Undo
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2"
                      onClick={() => navigate(`/students/${s.id}`)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2"
                      onClick={() => openEdit(s)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-destructive"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>

                  </div>

                </CardContent>

              </Card>
            );
          })}

          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No students found
            </p>
          )}

        </div>
      </div>

      <Dialog
        open={showForm}
        onOpenChange={v => {
          if (!v) {
            setShowForm(false);
            resetForm();
          }
        }}
      >

        <DialogContent className="max-w-sm mx-auto">

          <DialogHeader>
            <DialogTitle>
              {editStudent ? "Edit Student" : "Add Student"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">

            <div>
              <Label className="text-sm">Name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-11"
                placeholder="Student name"
              />
            </div>

            <div>
              <Label className="text-sm">Phone</Label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="h-11"
                placeholder="Phone number"
                type="tel"
              />
            </div>

            <div>
              <Label className="text-sm">Instrument</Label>

              <Select
                value={instrument}
                onValueChange={setInstrument}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select instrument" />
                </SelectTrigger>

                <SelectContent>
                  {INSTRUMENTS.map(i => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>

              </Select>

            </div>

            <div>
              <Label className="text-sm">Joining Date</Label>

              <Input
                type="date"
                value={joiningDate}
                onChange={e => setJoiningDate(e.target.value)}
                className="h-11"
              />
            </div>

            <div>
              <Label className="text-sm">Monthly Fee (₹)</Label>

              <Input
                type="number"
                value={monthlyFee}
                onChange={e => setMonthlyFee(e.target.value)}
                className="h-11"
                placeholder="1000"
              />
            </div>

            <Button
              onClick={handleSave}
              className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 text-base font-semibold"
            >
              {editStudent ? "Update Student" : "Add Student"}
            </Button>

          </div>

        </DialogContent>

      </Dialog>

    </AppLayout>
  );
}

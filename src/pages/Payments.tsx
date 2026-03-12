import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/dateUtils";

interface PaymentWithStudent {
  id: string;
  amount: number;
  payment_date: string;
  next_due_date: string;
  students: { name: string } | null;
}

export default function Payments() {
  const [payments, setPayments] = useState<PaymentWithStudent[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    const { data } = await supabase
      .from("payments")
      .select("id, amount, payment_date, next_due_date, students(name)")
      .order("payment_date", { ascending: false });
    setPayments((data as unknown as PaymentWithStudent[]) || []);
    setLoading(false);
  };

  const filtered = payments.filter(p =>
    (p.students?.name || "").toLowerCase().includes(search.toLowerCase())
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
        <h2 className="text-lg font-bold">Payments</h2>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by student..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">No payments found</p>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium text-sm">{p.students?.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.payment_date)}</p>
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

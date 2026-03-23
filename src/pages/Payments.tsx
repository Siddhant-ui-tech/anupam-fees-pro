import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, IndianRupee } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/dateUtils";

const MONTHS = ["All","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Payments() {
  const { payments, fetchPayments } = useAppStore();
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments().then(() => setLoading(false));

    const channel = supabase
      .channel("payments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => fetchPayments())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = payments.filter(p => {
    const nameMatch = (p.students?.name || "").toLowerCase().includes(search.toLowerCase());
    if (monthFilter === "All") return nameMatch;
    const pMonth = new Date(p.payment_date).toLocaleString("default", { month: "short" });
    return nameMatch && pMonth === monthFilter;
  });

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

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by student..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-11" />
          </div>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="h-11 w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
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
                      {p.method && (
                        <Badge variant="outline" className="text-[10px] mt-1">{p.method}</Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-success">{formatCurrency(p.amount)}</p>
                    </div>
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

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatDate, formatCurrency } from "@/lib/dateUtils";

const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Card", "Other"];

interface CollectFeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  defaultAmount: number;
  nextDueDate: string;
  onConfirm: (amount: number, method: string, paymentDate: string) => Promise<void>;
}

export function CollectFeeModal({ open, onOpenChange, studentName, defaultAmount, nextDueDate, onConfirm }: CollectFeeModalProps) {
  const [amount, setAmount] = useState(String(defaultAmount));
  const [method, setMethod] = useState("Cash");
  const [payDate, setPayDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  const handleOpen = (v: boolean) => {
    if (v) {
      setAmount(String(defaultAmount));
      setMethod("Cash");
      setPayDate(new Date());
    }
    onOpenChange(v);
  };

  const handleConfirm = async () => {
    if (!amount) return;
    setLoading(true);
    try {
      await onConfirm(parseInt(amount), method, format(payDate, "yyyy-MM-dd"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>Collect Fee – {studentName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Amount (₹)</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="h-11" />
          </div>
          <div>
            <Label className="text-sm">Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full h-11 justify-start text-left font-normal", !payDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {payDate ? format(payDate, "dd MMM yyyy") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={payDate} onSelect={(d) => d && setPayDate(d)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label className="text-sm">Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="bg-muted rounded-lg p-3 text-xs space-y-1">
            <p><span className="text-muted-foreground">Student:</span> {studentName}</p>
            <p><span className="text-muted-foreground">Current Due:</span> {formatDate(nextDueDate)}</p>
            <p><span className="text-muted-foreground">Payment Date:</span> {format(payDate, "dd MMM yyyy")}</p>
            <p><span className="text-muted-foreground">Amount:</span> {formatCurrency(parseInt(amount) || 0)}</p>
          </div>
          <Button onClick={handleConfirm} disabled={loading} className="w-full h-12 bg-success text-success-foreground hover:bg-success/90 text-base font-semibold">
            <Check className="h-5 w-5 mr-2" /> Confirm Payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

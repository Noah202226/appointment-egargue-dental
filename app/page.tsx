"use client";

import * as React from "react";
import { format, isBefore, startOfDay } from "date-fns";
import { Loader2, Save, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

// Interfaces
export interface Service {
  $id: string;
  name: string;
  duration: number;
}

// UI Components
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { databases, ID } from "@/lib/appwrite";

const DB = process.env.NEXT_PUBLIC_DATABASE_ID!;
const BOOKINGS = "appointments";

const REASONS = [
  "Checkup",
  "Cleaning",
  "Root Canal Treatment",
  "Veneers / Crowns / Bridge",
  "Wisdom Tooth Removal",
  "Braces",
  "Whitening",
  "Extraction (Bunot)",
  "Dental Pain",
  "Filling (Pasta)",
];

export default function AppointmentFormWithRemarks() {
  const [branches, setBranches] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    new Date(),
  );

  const initialFormState = {
    patientType: "New",
    reasons: [] as string[],
    otherReasonText: "",
    referralSource: "",
    name: "",
    email: "",
    phone: "",
    branchId: "",
    note: "",
  };

  const [formData, setFormData] = React.useState(initialFormState);

  const handleReset = () => {
    setFormData(initialFormState);
    setSelectedDate(new Date());
    setIsSuccess(false);
  };

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const b = await databases.listDocuments(DB, "branches");
        setBranches(b.documents as any);
      } catch (error) {
        toast.error("Failed to load clinical data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleReason = (reason: string) => {
    setFormData((prev) => {
      const isSelected = prev.reasons.includes(reason);
      if (isSelected) {
        return { ...prev, reasons: prev.reasons.filter((r) => r !== reason) };
      } else {
        return { ...prev, reasons: [...prev.reasons, reason] };
      }
    });
  };

  const isOthersSelected = formData.reasons.includes("Others");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return toast.error("Please select a date");
    if (formData.reasons.length === 0)
      return toast.error("Please select a reason");
    if (isOthersSelected && !formData.otherReasonText.trim())
      return toast.error("Please specify the 'Other' reason");

    setIsSubmitting(true);

    // FIX: Map the array and keep it as an array to match Appwrite's schema
    const finalReasonsArray = formData.reasons.map((r) =>
      r === "Others" ? `Other: ${formData.otherReasonText}` : r,
    );

    const payload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      patientType: formData.patientType,
      reason: finalReasonsArray, // Send as Array, not .join(", ")
      referralSource: formData.referralSource,
      branchId: formData.branchId,
      note: formData.note || "",
      date: selectedDate.toISOString(),
      dateKey: format(selectedDate, "yyyy-MM-dd"),
      status: "pending",
    };

    try {
      await databases.createDocument(DB, BOOKINGS, ID.unique(), payload);
      toast.success("Appointment requested successfully!");
      setIsSuccess(true); // Trigger Success View
    } catch (error: any) {
      toast.error(`Submission Failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading)
    return (
      <div className="p-10 text-center">
        <Loader2 className="animate-spin mx-auto" />
      </div>
    );

  // NEW: Success Message UI
  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto mt-20 p-4">
        <Card className="p-8 text-center border-none shadow-2xl bg-white space-y-6 animate-in zoom-in-95 duration-300">
          <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">
              Appointment Requested!
            </h2>
            <p className="text-slate-500">
              Thank you, <span className="font-semibold">{formData.name}</span>.
              We've received your request for {format(selectedDate!, "MMMM do")}{" "}
              and will contact you shortly.
            </p>
          </div>
          <Button
            onClick={handleReset}
            className="w-full py-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl"
          >
            <ArrowLeft className="mr-2 w-4 h-4" /> Book Another Appointment
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 bg-slate-50 min-h-screen">
      <Card className="p-8 border-none shadow-xl bg-white">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12"
        >
          {/* LEFT COLUMN */}
          <div className="space-y-8">
            <section className="space-y-4">
              <Label className="text-lg font-bold">
                Patient Type <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                {["New", "Old / Existing"].map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={formData.patientType === t ? "default" : "outline"}
                    className="flex-1 py-6 font-semibold"
                    onClick={() => setFormData({ ...formData, patientType: t })}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <Label className="text-lg font-bold">
                Reason for Visit <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {[...REASONS, "Others"].map((r) => (
                  <Button
                    key={r}
                    type="button"
                    variant={
                      formData.reasons.includes(r) ? "default" : "outline"
                    }
                    className={`h-auto py-2 px-4 text-xs rounded-md transition-all ${formData.reasons.includes(r) ? "bg-blue-600" : "text-blue-600 border-blue-200"}`}
                    onClick={() => toggleReason(r)}
                  >
                    {r}
                  </Button>
                ))}
              </div>

              {isOthersSelected && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-sm font-semibold text-blue-700">
                    Please specify <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    required
                    placeholder="Describe your concern..."
                    className="mt-1 border-blue-300"
                    value={formData.otherReasonText}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        otherReasonText: e.target.value,
                      })
                    }
                  />
                </div>
              )}
            </section>

            <section className="space-y-4">
              <Label className="text-lg font-bold">
                How did you hear about us?{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Select
                onValueChange={(val) =>
                  setFormData({ ...formData, referralSource: val })
                }
              >
                <SelectTrigger className="w-full py-6">
                  <SelectValue placeholder="Please select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facebook">
                    Social Media - Facebook
                  </SelectItem>
                  <SelectItem value="google">Google Search</SelectItem>
                  <SelectItem value="friend">
                    Friend / Family Referral
                  </SelectItem>
                  <SelectItem value="walkin">Walk-in</SelectItem>
                </SelectContent>
              </Select>
            </section>

            {/* REMARKS INPUT RESTORED */}
            <section className="space-y-4">
              <Label className="text-lg font-bold">
                Remarks / Additional Notes
              </Label>
              <Textarea
                placeholder="Preferred dentist, medical history notes, or special requests..."
                className="min-h-[120px] bg-slate-50 border-slate-200"
                value={formData.note}
                onChange={(e) =>
                  setFormData({ ...formData, note: e.target.value })
                }
              />
              <p className="text-xs text-slate-400 italic">
                - Personal Message / Preferred dentist / Special Requests
              </p>
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-8">
            <section className="space-y-4">
              <Label className="text-lg font-bold">Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) =>
                  isBefore(date, startOfDay(new Date())) || date.getDay() === 0
                }
                className="w-full"
              />
            </section>

            <section className="space-y-4 pt-4 border-t">
              <div className="space-y-4">
                <Input
                  required
                  placeholder="Full Name"
                  className="py-6"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
                <Input
                  required
                  type="email"
                  placeholder="Email Address"
                  className="py-6"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
                <Input
                  required
                  placeholder="Mobile Number"
                  className="py-6"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
                <Select
                  onValueChange={(val) =>
                    setFormData({ ...formData, branchId: val })
                  }
                >
                  <SelectTrigger className="py-6">
                    <SelectValue placeholder="Choose branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.$id} value={b.$id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <Button
              disabled={isSubmitting}
              className="w-full py-8 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl transition-all active:scale-95"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                <Save className="mr-2" />
              )}
              Confirm Appointment
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

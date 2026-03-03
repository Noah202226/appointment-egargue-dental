"use client";

import * as React from "react";
import { format, isBefore, startOfDay } from "date-fns";
import { Calendar as CalendarIcon, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

// Interfaces
export interface Service {
  $id: string;
  name: string;
  duration: number;
}
export interface Dentist {
  $id: string;
  name: string;
  branchId: string;
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
const SERVICES = "services";
const DENTISTS = "dentists";
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

export default function SimpleAppointmentForm() {
  const [services, setServices] = React.useState<Service[]>([]);
  const [branches, setBranches] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    new Date(),
  );
  const [formData, setFormData] = React.useState({
    patientType: "New", // Default from image
    reason: "",
    referral: "",
    name: "",
    email: "",
    phone: "",
    branchId: "",
    notes: "",
  });

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, b] = await Promise.all([
          databases.listDocuments(DB, SERVICES),
          databases.listDocuments(DB, "branches"),
        ]);
        setServices(s.documents as any);
        setBranches(b.documents as any);
      } catch (error) {
        toast.error("Failed to load clinical data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return toast.error("Please select a date");

    setIsSubmitting(true);

    // Updated payload to include email
    const payload = {
      name: formData.name,
      email: formData.email, // Ensure this exists in Appwrite Attributes
      phone: formData.phone,
      patientType: formData.patientType,
      reason: formData.reason,
      referral: formData.referral,
      branchId: formData.branchId,
      notes: formData.notes || "",
      date: selectedDate.toISOString(),
      dateKey: format(selectedDate, "yyyy-MM-dd"),
      status: "pending",
    };

    try {
      await databases.createDocument(DB, BOOKINGS, ID.unique(), payload);
      toast.success("Appointment requested successfully!");
      // Reset logic...
    } catch (error: any) {
      console.error("Submission Error:", error);
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

  return (
    <div className="max-w-6xl mx-auto p-4 bg-slate-50 min-h-screen">
      <Card className="p-8 border-none shadow-xl bg-white">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12"
        >
          {/* LEFT COLUMN: Patient & Reason */}
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
                    className="flex-1 py-6 text-md font-semibold border-blue-200"
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
                {REASONS.map((r) => (
                  <Button
                    key={r}
                    type="button"
                    variant={formData.reason === r ? "default" : "outline"}
                    className={`h-auto py-2 px-4 text-xs font-medium rounded-md transition-all ${formData.reason === r ? "bg-blue-600" : "text-blue-600 border-blue-200 hover:bg-blue-50"}`}
                    onClick={() => setFormData({ ...formData, reason: r })}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <Label className="text-lg font-bold">
                How did you hear about us?{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Select
                onValueChange={(val) =>
                  setFormData({ ...formData, referral: val })
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

            <section className="space-y-4">
              <Label className="text-lg font-bold">Remarks</Label>
              <Textarea
                placeholder="Personal Message, Preferred dentist, Special Requests"
                className="min-h-[100px] bg-slate-50"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </section>
          </div>

          {/* RIGHT COLUMN: Calendar & Contact */}
          <div className="space-y-8">
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-bold">Select Date</Label>
                <span className="text-blue-600 font-bold">
                  {format(selectedDate || new Date(), "MMMM yyyy")}
                </span>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) =>
                  isBefore(date, startOfDay(new Date())) || date.getDay() === 0
                }
                className="rounded-xl border shadow-sm p-4 w-full bg-white flex justify-center"
              />
            </section>

            <section className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold">Full Name</Label>
                  <Input
                    required
                    placeholder="Juan Dela Cruz"
                    className="py-6"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Mobile Number</Label>
                  <Input
                    required
                    placeholder="09XXXXXXXXX"
                    className="py-6"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>

                {/* --- NEW EMAIL FIELD --- */}
                <div className="space-y-2">
                  <Label className="font-semibold">Email Address</Label>
                  <Input
                    required
                    type="email"
                    placeholder="email@example.com"
                    className="py-6"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Preferred Branch</Label>
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
              </div>
            </section>

            <Button
              disabled={isSubmitting}
              className="w-full py-8 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl shadow-lg shadow-blue-200"
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

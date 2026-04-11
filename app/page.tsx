"use client";

import * as React from "react";
import { add, addMinutes, format, isBefore, parse, startOfDay } from "date-fns";
import { Loader2, Save, CheckCircle2, ArrowLeft, Clock } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox"; // Ensure this component exists
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { databases, ID } from "@/lib/appwrite";
import { Query } from "appwrite";

const DB = process.env.NEXT_PUBLIC_DATABASE_ID!;
const BOOKINGS = "appointments";
const CLINIC_HOURS = "clinichours";
const DENTISTS = "dentists";

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
  const [dentists, setDentists] = React.useState<any[]>([]);
  const [clinicSettings, setClinicSettings] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  // Consent States
  const [isAcknowledged, setIsAcknowledged] = React.useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = React.useState(false);

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    new Date(),
  );
  const [selectedTime, setSelectedTime] = React.useState<string>("");

  const initialFormState = {
    patientType: "New",
    reasons: [] as string[],
    otherReasonText: "",
    referralSource: "",
    name: "",
    email: "",
    dateOfBirth: "",
    address: "",
    gender: "",
    phone: "",
    branchId: "",
    branchName: "",
    dentistId: "",
    dentistName: "",
    note: "",
  };

  const [formData, setFormData] = React.useState(initialFormState);

  const handleReset = () => {
    setFormData(initialFormState);
    setSelectedDate(new Date());
    setIsAcknowledged(false);
    setIsTermsAccepted(false);
    setIsSuccess(false);
  };

  // 1. Initial Load: Fetch Branches
  React.useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const b = await databases.listDocuments(DB, "branches");
        setBranches(b.documents);
      } catch (error) {
        toast.error("Failed to load branches.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // 2. Branch Selection Effect: Fetch Branch-specific Hours and Dentists
  React.useEffect(() => {
    if (!formData.branchId) return;

    const fetchBranchContext = async () => {
      try {
        const [hoursRes, dentistsRes] = await Promise.all([
          databases.listDocuments(DB, CLINIC_HOURS, [
            Query.equal("branchId", formData.branchId),
          ]),
          databases.listDocuments(DB, DENTISTS, [
            Query.equal("branchId", formData.branchId),
          ]),
        ]);
        setClinicSettings(hoursRes.documents);
        setDentists(dentistsRes.documents);
        setSelectedTime("");
        setFormData((prev) => ({ ...prev, dentistId: "" }));
      } catch (error) {
        toast.error("Error loading branch details.");
      }
    };

    fetchBranchContext();
  }, [formData.branchId]);

  // 3. Dynamic Time Slots Calculation
  const dynamicTimeSlots = React.useMemo(() => {
    if (!selectedDate || clinicSettings.length === 0) return [];

    const dayName = format(selectedDate, "EEEE");
    const daySetting = clinicSettings.find((s) => s.day === dayName);

    if (!daySetting || !daySetting.isOpen) return [];

    const slots = [];
    let current = parse(daySetting.openTime, "hh:mm a", new Date());
    const end = parse(daySetting.closeTime, "hh:mm a", new Date());
    const duration = daySetting.slotDuration || 30;

    while (isBefore(current, end)) {
      slots.push(format(current, "hh:mm a"));
      current = addMinutes(current, duration);
    }
    return slots;
  }, [selectedDate, clinicSettings]);

  // 4. Calendar Restriction
  const isDayDisabled = (date: Date) => {
    const pastDate = isBefore(date, startOfDay(new Date()));
    const dayName = format(date, "EEEE");
    const daySetting = clinicSettings.find((s) => s.day === dayName);

    if (clinicSettings.length > 0) {
      return pastDate || !daySetting || !daySetting.isOpen;
    }
    return pastDate || date.getDay() === 0;
  };

  const toggleReason = (reason: string) => {
    setFormData((prev) => {
      const isSelected = prev.reasons.includes(reason);
      return {
        ...prev,
        reasons: isSelected
          ? prev.reasons.filter((r) => r !== reason)
          : [...prev.reasons, reason],
      };
    });
  };

  const isOthersSelected = formData.reasons.includes("Others");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return toast.error("Please select a date");
    if (!selectedTime) return toast.error("Please select a time slot");
    if (formData.reasons.length === 0)
      return toast.error("Please select a reason");
    if (!formData.branchId) return toast.error("Please select a branch");

    // Consent Validation
    if (!isAcknowledged || !isTermsAccepted) {
      return toast.error(
        "Please accept the terms and acknowledge the questionnaire to continue.",
      );
    }

    setIsSubmitting(true);

    const finalReasonsArray = formData.reasons.map((r) =>
      r === "Others" ? `Other: ${formData.otherReasonText}` : r,
    );

    const payload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      patientType: formData.patientType,
      reason: finalReasonsArray,
      referralSource: formData.referralSource,
      branchId: formData.branchId,
      branchName: formData.branchName,
      dentistId: formData.dentistId || null,
      dentistName: formData.dentistName,
      note: formData.note || "",
      date: selectedDate.toISOString(),
      time: selectedTime,
      dateKey: format(selectedDate, "yyyy-MM-dd"),
      status: "pending",
    };

    try {
      await databases.createDocument(DB, BOOKINGS, ID.unique(), payload);
      toast.success("Appointment requested successfully!");
      setIsSuccess(true);
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
                Preferred Dentist (Optional)
              </Label>
              <Select
                onValueChange={(val) => {
                  const selectedDentist = dentists.find((d) => d.$id === val);
                  setFormData({
                    ...formData,
                    dentistId: val,
                    dentistName: selectedDentist?.name || "",
                  });
                }}
                value={formData.dentistId}
              >
                <SelectTrigger className="w-full py-6">
                  <SelectValue
                    placeholder={
                      formData.branchId
                        ? "Choose a dentist"
                        : "Select a branch first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {dentists.map((d) => (
                    <SelectItem key={d.$id} value={d.$id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label className="text-lg font-bold">Select Branch *</Label>
              <Select
                onValueChange={(val) => {
                  const selectedBranch = branches.find((b) => b.$id === val);
                  setFormData({
                    ...formData,
                    branchId: val,
                    branchName: selectedBranch?.name || "",
                  });
                }}
                value={formData.branchId}
              >
                <SelectTrigger className="py-6 border-blue-200 bg-blue-50/30">
                  <SelectValue placeholder="Choose clinic branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.$id} value={b.$id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>

            <section className="space-y-4">
              <Label className="text-lg font-bold">Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={isDayDisabled}
                className="w-full border rounded-xl"
              />
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <Label className="text-lg font-bold">Available Slots</Label>
              </div>
              {dynamicTimeSlots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {dynamicTimeSlots.map((time) => (
                    <Button
                      key={time}
                      type="button"
                      variant={selectedTime === time ? "default" : "outline"}
                      className={selectedTime === time ? "bg-blue-600" : ""}
                      onClick={() => setSelectedTime(time)}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-100 text-slate-500 rounded-lg text-sm text-center italic">
                  {formData.branchId
                    ? "Clinic is closed on this date."
                    : "Please select a branch to see availability."}
                </div>
              )}
            </section>

            {/* PATIENT INFO SECTION */}
            <section className="space-y-4 pt-4 border-t">
              <div className="space-y-4">
                <Label className="text-sm font-semibold text-blue-700">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="Full Name"
                  className="py-6"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />

                <Label className="text-sm font-semibold text-blue-700">
                  Date of Birth <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  type="date"
                  className="py-6"
                  value={formData.dateOfBirth}
                  onChange={(e) =>
                    setFormData({ ...formData, dateOfBirth: e.target.value })
                  }
                />

                <Label className="text-sm font-semibold text-blue-700">
                  Email Address <span className="text-red-500">*</span>
                </Label>
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

                <Label className="text-sm font-semibold text-blue-700">
                  Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="Address"
                  className="py-6"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />

                <Label className="text-sm font-semibold text-blue-700">
                  Gender <span className="text-red-500">*</span>
                </Label>
                <Select
                  onValueChange={(val) =>
                    setFormData({ ...formData, gender: val })
                  }
                  value={formData.gender}
                >
                  <SelectTrigger className="py-6 border-blue-200 bg-blue-50/30">
                    <SelectValue placeholder="Choose gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>

                <Label className="text-sm font-semibold text-blue-700">
                  Mobile Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="Mobile Number"
                  className="py-6"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </section>

            {/* CONSENT AND ACKNOWLEDGEMENT SECTION */}
            <section className="space-y-4 pt-6 border-t">
              <Label className="text-lg font-bold text-blue-800">
                Consent and Acknowledgement
              </Label>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="acknowledge"
                    checked={isAcknowledged}
                    onCheckedChange={(checked) => setIsAcknowledged(!!checked)}
                    className="mt-1"
                  />
                  <Label
                    htmlFor="acknowledge"
                    className="text-xs leading-relaxed text-slate-600 font-normal cursor-pointer"
                  >
                    I acknowledge that I have THRUTHFULLY completed the
                    questionnaire and understand the guidelines. I will seek
                    assistance from the dental staff if needed. I agree to
                    disclose all past illnesses, medical, and dental history,
                    and I understand that providing incorrect information about
                    medications, allergies, or illnesses can be harmful to my
                    health. I will inform the dentist or staff of any changes in
                    my health at my next appointment.
                  </Label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={isTermsAccepted}
                    onCheckedChange={(checked) => setIsTermsAccepted(!!checked)}
                    className="mt-1"
                  />
                  <Label
                    htmlFor="terms"
                    className="text-xs leading-relaxed text-slate-600 font-normal cursor-pointer"
                  >
                    I agree and accept all the details above as well as Terms
                    and Conditions and Privacy Policy
                  </Label>
                </div>
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
              Submit Appointment
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

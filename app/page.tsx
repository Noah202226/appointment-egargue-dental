"use client";

import * as React from "react";
import {
  Clock,
  Stethoscope,
  User,
  Calendar as CalendarIcon,
  CheckCircle,
  Info,
  Pencil,
  Tag,
  MapPin,
  Megaphone,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { databases, ID } from "@/lib/appwrite";
import { Query } from "appwrite";

// --- TYPES & CONFIG ---
export interface Service {
  $id: string;
  name: string;
  duration: number;
}
export interface Dentist {
  $id: string;
  name: string;
  startHour: number;
  endHour: number;
  branchId: string;
}
export interface Booking {
  $id: string;
  name: string;
  email: string;
  phone: string;
  note: string;
  referralSource: string;
  remarks: string;
  tags: string;
  serviceId: string;
  dentistId: string | null;
  date: string;
  dateKey: string;
  time: string;
  status: "pending" | "approved" | "declined";
}

const DB = process.env.NEXT_PUBLIC_DATABASE_ID!;
const SERVICES = "services";
const DENTISTS = "dentists";
const BOOKINGS = "appointments";

// --- FETCH FUNCTIONS ---
async function fetchServices(): Promise<Service[]> {
  const res = await databases.listDocuments(DB, SERVICES);
  return res.documents as unknown as Service[];
}
async function fetchDentists(): Promise<Dentist[]> {
  const res = await databases.listDocuments(DB, DENTISTS);
  return res.documents as unknown as Dentist[];
}
async function fetchBookedSlots(dateKey: string): Promise<Booking[]> {
  const res = await databases.listDocuments(DB, BOOKINGS, [
    Query.equal("dateKey", dateKey),
    Query.notEqual("status", "cancelled"),
  ]);
  return res.documents as unknown as Booking[];
}
async function fetchBranches() {
  const res = await databases.listDocuments(DB, "branches");
  return res.documents as any[];
}

export default function CustomerAppointmentForm() {
  // Logic States
  const [services, setServices] = React.useState<Service[]>([]);
  const [dentists, setDentists] = React.useState<Dentist[]>([]);
  const [branches, setBranches] = React.useState<any[]>([]);
  const [bookedSlots, setBookedSlots] = React.useState<Booking[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [now, setNow] = React.useState(new Date());

  // Form States
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    new Date()
  );
  const [selectedServiceId, setSelectedServiceId] = React.useState("");
  const [selectedBranchId, setSelectedBranchId] = React.useState("");
  const [selectedDentistId, setSelectedDentistId] = React.useState("none");
  const [selectedTime, setSelectedTime] = React.useState<string | undefined>();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [note, setNote] = React.useState("");
  const [referralSource, setReferralSource] = React.useState("");
  const [remarks, setRemarks] = React.useState("");
  const [tags, setTags] = React.useState("");

  // Update Clock
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initial Load
  React.useEffect(() => {
    Promise.all([fetchServices(), fetchDentists(), fetchBranches()])
      .then(([fetchedServices, fetchedDentists, fetchedBranches]) => {
        setServices(fetchedServices);
        setDentists(fetchedDentists);
        setBranches(fetchedBranches);
        if (fetchedServices.length > 0)
          setSelectedServiceId(fetchedServices[0].$id);
        if (fetchedBranches.length > 0)
          setSelectedBranchId(fetchedBranches[0].$id);
      })
      .finally(() => setIsLoadingData(false));
  }, []);

  const loadBookedSlots = React.useCallback((date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    fetchBookedSlots(key).then(setBookedSlots).catch(console.error);
  }, []);

  React.useEffect(() => {
    if (selectedDate) loadBookedSlots(selectedDate);
    setSelectedTime(undefined);
  }, [selectedDate, loadBookedSlots, selectedServiceId, selectedDentistId]);

  // Helpers
  const filteredDentists = React.useMemo(
    () => dentists.filter((d) => d.branchId === selectedBranchId),
    [selectedBranchId, dentists]
  );
  const serviceDetails = React.useMemo(
    () => services.find((s) => s.$id === selectedServiceId),
    [selectedServiceId, services]
  );

  // Derived Values for Sidebar
  const selectedService = services.find((s) => s.$id === selectedServiceId);
  const selectedBranch = branches.find((b) => b.$id === selectedBranchId);
  const selectedDentist = dentists.find((d) => d.$id === selectedDentistId);

  const slots = React.useMemo(() => {
    const branch = branches.find((b) => b.$id === selectedBranchId);
    if (!branch || !selectedDate) return [];

    const generated = [];
    for (let t = branch.startHour; t < branch.endHour; t += 30) {
      const h = Math.floor(t / 60),
        m = t % 60;
      generated.push(format(new Date(2000, 0, 1, h, m), "hh:mm a"));
    }
    const booked = bookedSlots.map((b) => b.time);
    return generated.filter((t) => !booked.includes(t));
  }, [selectedDate, selectedBranchId, bookedSlots, branches]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedTime || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await databases.createDocument(DB, BOOKINGS, ID.unique(), {
        name,
        email,
        phone,
        note,
        referralSource,
        remarks,
        tags,
        branchId: selectedBranchId,
        branchName:
          branches.find((b) => b.$id === selectedBranchId)?.name || "",
        serviceId: selectedServiceId,
        serviceName: serviceDetails?.name || "",
        dentistId: selectedDentistId === "none" ? null : selectedDentistId,
        dentistName:
          selectedDentistId === "none"
            ? "No Preference"
            : dentists.find((d) => d.$id === selectedDentistId)?.name,
        serviceDuration: serviceDetails?.duration || 30,
        date: selectedDate.toISOString(),
        dateKey: format(selectedDate, "yyyy-MM-dd"),
        time: selectedTime,
        status: "pending",
        timestamp: Math.floor(Date.now() / 1000),
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-slate-900 border-indigo-500/50 border-t-4 p-8 text-center space-y-6">
          <div className="h-20 w-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-12 w-12 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">Booking Requested!</h2>
          <p className="text-slate-400">
            Thank you {name}. Our team will review your request and contact you
            shortly.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            Make Another Booking
          </Button>
        </Card>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col xl:flex-row">
      {/* MAIN FORM AREA */}
      <main className="flex-1 p-4 lg:p-10 overflow-y-auto">
        <div className="max-w-8xl mx-auto space-y-8">
          {/* Header */}
          <header className="flex items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <div className="bg-white p-2 rounded-lg">
              <img
                src="/Egargue-logo2.PNG"
                alt="Logo"
                className="h-10 w-auto"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">New Appointment</h1>
              <p className="text-xs text-slate-500">
                Egargue Dental Group • Since 1992
              </p>
            </div>
          </header>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left Col: Calendar & Slots */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="bg-slate-900 border-slate-800 p-5">
                <Label className="text-indigo-400 font-bold flex items-center gap-2 mb-4">
                  <CalendarIcon className="h-4 w-4" /> 1. Select Date
                </Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) =>
                    isBefore(date, startOfDay(new Date())) ||
                    date.getDay() === 0
                  }
                  className="bg-slate-950 rounded-md border-slate-800 text-slate-300 w-full"
                />
              </Card>

              <Card className="bg-slate-900 border-slate-800 p-5">
                <Label className="text-indigo-400 font-bold flex items-center gap-2 mb-4">
                  <Clock className="h-4 w-4" /> 2. Available Time Slots
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant={selectedTime === t ? "default" : "outline"}
                      onClick={() => setSelectedTime(t)}
                      className={`text-[10px] h-9 ${
                        selectedTime === t
                          ? "bg-indigo-600 border-none"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      {t}
                    </Button>
                  ))}
                  {slots.length === 0 && (
                    <p className="col-span-3 text-center text-xs text-slate-600 py-4 italic">
                      No slots for this date.
                    </p>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Col: Fields */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="bg-slate-900 border-slate-800 p-6">
                <h3 className="text-indigo-400 font-bold flex items-center gap-2 mb-6">
                  <User className="h-4 w-4" /> 3. Patient Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-500 text-xs">
                      Full Name *
                    </Label>
                    <Input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-slate-950 border-slate-800 focus:border-indigo-500 text-slate-200"
                      placeholder="Juan Dela Cruz"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-500 text-xs">
                      Mobile Number *
                    </Label>
                    <Input
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-slate-950 border-slate-800 focus:border-indigo-500 text-slate-200"
                      placeholder="09XXXXXXXXX"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-slate-500 text-xs">
                      Email Address *
                    </Label>
                    <Input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-950 border-slate-800 focus:border-indigo-500 text-slate-200"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </Card>

              <Card className="bg-slate-900 border-slate-800 p-6">
                <h3 className="text-indigo-400 font-bold flex items-center gap-2 mb-6">
                  <Stethoscope className="h-4 w-4" /> 4. Appointment Preferences
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-500 text-xs">
                      Procedure *
                    </Label>
                    <Select
                      value={selectedServiceId}
                      onValueChange={setSelectedServiceId}
                    >
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                        <SelectValue placeholder="Choose service" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                        {services.map((s) => (
                          <SelectItem key={s.$id} value={s.$id}>
                            {s.name} ({s.duration}m)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-500 text-xs">Branch *</Label>
                    <Select
                      value={selectedBranchId}
                      onValueChange={setSelectedBranchId}
                    >
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                        <SelectValue placeholder="Choose branch" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                        {branches.map((b) => (
                          <SelectItem key={b.$id} value={b.$id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-500 text-xs">
                      Dentist (Optional)
                    </Label>
                    <Select
                      value={selectedDentistId}
                      onValueChange={setSelectedDentistId}
                    >
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                        <SelectValue placeholder="No preference" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                        <SelectItem value="none">No Preference</SelectItem>
                        {filteredDentists.map((d) => (
                          <SelectItem key={d.$id} value={d.$id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5 w-full">
                  <Label className="text-slate-500 text-xs">
                    Clinical Remarks / Notes
                  </Label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="bg-slate-950 border-slate-800 min-h-20 w-full text-slate-200"
                    placeholder="Specific concerns..."
                  />
                </div>
              </Card>

              <Card className="bg-slate-900 border-slate-800 p-6">
                <h3 className="text-indigo-400 font-bold flex items-center gap-2 mb-6">
                  <Pencil className="h-4 w-4" /> 5. Medical Notes & Tags
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-slate-500 text-xs flex items-center gap-1">
                        <Tag className="h-3 w-3" /> Tags
                      </Label>
                      <Input
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-slate-200"
                        placeholder="Urgent, VIP..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-500 text-xs">
                        Internal Remarks
                      </Label>
                      <Input
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-slate-200"
                        placeholder="Office notes"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-slate-500 text-xs flex items-center gap-1">
                        <Megaphone className="h-3 w-3" /> How did you hear about
                        us?
                      </Label>
                      <Select
                        value={referralSource}
                        onValueChange={setReferralSource}
                      >
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                          <SelectValue placeholder="Please select" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="google">Google</SelectItem>
                          <SelectItem value="referral">
                            Referral / Friend
                          </SelectItem>
                          <SelectItem value="walk-in">Walk-in</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </Card>

              <Button
                type="submit"
                disabled={isSubmitting || !selectedTime}
                className="w-full py-7 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-900/20"
              >
                {isSubmitting ? "Processing Request..." : "Request Appointment"}
              </Button>
            </div>
          </form>

          {/* PROMOS & MARKETING SECTION */}
          <section className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-center gap-6">
            <div className="h-16 w-16 bg-indigo-500/10 rounded-full flex items-center justify-center shrink-0">
              <Sparkles className="h-8 w-8 text-indigo-500" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h4 className="font-bold text-white">
                Join our Loyalty Program!
              </h4>
              <p className="text-slate-500 text-sm">
                Earn points for every cleaning session and get 50% off your 5th
                visit.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Learn More
            </Button>
          </section>

          <footer className="text-center text-slate-700 text-[10px] pb-10">
            © 2026 Egargue Dental Group. Managed by HealthSync Systems.
          </footer>
        </div>
      </main>

      {/* RIGHT SIDEBAR (w-80) */}
      <aside className="hidden xl:flex w-80 bg-slate-900 border-l border-slate-800 flex-col p-6 sticky top-0 h-screen overflow-y-auto">
        <div className="space-y-8">
          {/* REAL TIME DATE & TIME DISPLAY */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center shadow-inner">
            <p className="text-indigo-500 text-[10px] font-bold uppercase tracking-widest mb-1">
              Server Clock
            </p>
            <h2 className="text-3xl font-mono font-bold text-white">
              {format(now, "HH:mm:ss")}
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              {format(now, "EEEE, MMM d, yyyy")}
            </p>
          </div>

          <Separator className="bg-slate-800" />

          {/* SUMMARY BOX */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Live Summary
            </h4>
            {selectedTime ? (
              <div className="space-y-3">
                <div className="bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/20">
                  <p className="text-[10px] text-indigo-400 uppercase">
                    Selected Slot
                  </p>
                  <p className="text-sm font-semibold text-slate-200">
                    {format(selectedDate!, "MMM d")} at {selectedTime}
                  </p>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase">
                    Procedure
                  </p>
                  <p className="text-sm font-semibold text-slate-300 truncate">
                    {serviceDetails?.name || "None"}
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase">
                    Service
                  </p>
                  <p className="text-sm font-semibold text-slate-300 truncate">
                    {selectedService?.name || "None"}
                  </p>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase">Branch</p>
                  <p className="text-sm font-semibold text-slate-300 truncate">
                    {selectedBranch?.name || "None"}
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase">
                    Dentist
                  </p>
                  <p className="text-sm font-semibold text-slate-300 truncate">
                    {selectedDentist?.name || "None"}
                  </p>
                </div>

                <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3 mb-2">
                    <Megaphone className="h-4 w-4 text-slate-600" />
                    <p className="text-[10px] text-slate-500 uppercase font-bold">
                      Source
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    {referralSource || "Unspecified"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl text-center">
                <Clock className="h-8 w-8 text-slate-800 mx-auto mb-2" />
                <p className="text-xs text-slate-600">
                  Choose a time slot to see summary.
                </p>
              </div>
            )}
          </div>

          <div className="mt-auto space-y-4">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <p className="text-[10px] text-slate-500 leading-relaxed italic">
                "Providing quality dental care since 1992."
              </p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-slate-500 hover:text-white text-xs gap-2"
            >
              <ExternalLink className="h-3 w-3" /> Contact Support
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

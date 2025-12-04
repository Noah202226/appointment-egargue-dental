"use client";

import * as React from "react";
import {
  Clock,
  Stethoscope,
  User,
  Calendar as CalendarIcon,
  CheckCircle,
} from "lucide-react";

import { format, isBefore, startOfDay } from "date-fns";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

import { databases, ID } from "@/lib/appwrite";
import { Query } from "appwrite";

// -----------------------------------------
// TYPES
// -----------------------------------------
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
  serviceId: string;
  dentistId: string | null;
  date: string;
  dateKey: string;
  time: string;
  readable: string;
  status: "pending" | "approved" | "declined";
  createdAt: string;
}

// -----------------------------------------
// APPWRITE COLLECTION IDs
// -----------------------------------------
const DB = process.env.NEXT_PUBLIC_DATABASE_ID!;
const SERVICES = "services";
const DENTISTS = "dentists";
const BOOKINGS = "appointments";

// -----------------------------------------
// STATIC TIME OPTIONS (30-min intervals)
// -----------------------------------------
const TIME_OPTIONS = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
];

// -----------------------------------------
// FETCH FUNCTIONS
// -----------------------------------------
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

// -----------------------------------------
// MAIN COMPONENT
// -----------------------------------------
export default function CustomerAppointmentForm() {
  const [services, setServices] = React.useState<Service[]>([]);
  const [dentists, setDentists] = React.useState<Dentist[]>([]);
  const [bookedSlots, setBookedSlots] = React.useState<Booking[]>([]);

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    new Date()
  );
  const [selectedServiceId, setSelectedServiceId] = React.useState<string>("");
  const [selectedDentistId, setSelectedDentistId] =
    React.useState<string>("none");
  const [selectedTime, setSelectedTime] = React.useState<string | undefined>();

  const [name, setName] = React.useState<string>("");
  const [email, setEmail] = React.useState<string>("");
  const [phone, setPhone] = React.useState<string>("");

  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [success, setSuccess] = React.useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = React.useState<boolean>(true);

  const [branches, setBranches] = React.useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>("");

  // Load services & dentists on initial mount
  React.useEffect(() => {
    Promise.all([fetchServices(), fetchDentists(), fetchBranches()])
      .then(([fetchedServices, fetchedDentists, fetchedBranches]) => {
        setServices(fetchedServices);
        setDentists(fetchedDentists);
        setBranches(fetchedBranches);

        if (fetchedServices.length > 0) {
          setSelectedServiceId(fetchedServices[0].$id);
        }
        if (fetchedBranches.length > 0) {
          setSelectedBranchId(fetchedBranches[0].$id);
        }
      })
      .finally(() => setIsLoadingData(false));
  }, []);

  // Function to load booked slots
  const loadBookedSlots = React.useCallback((date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    fetchBookedSlots(key).then(setBookedSlots).catch(console.error);
  }, []);

  // Load booked slots when selected date changes
  React.useEffect(() => {
    if (!selectedDate) return;
    loadBookedSlots(selectedDate);
  }, [selectedDate, loadBookedSlots]);

  React.useEffect(() => {
    setSelectedDentistId("none");
  }, [selectedBranchId]);

  function generateTimeSlots(startHour: number, endHour: number) {
    const slots: string[] = [];

    for (let t = startHour; t < endHour; t += 30) {
      const hours = Math.floor(t / 60);
      const minutes = t % 60;

      const timeStr = format(new Date(2000, 0, 1, hours, minutes), "hh:mm a");

      slots.push(timeStr);
    }

    return slots;
  }

  const branchDetails = React.useMemo(() => {
    return branches.find((b) => b.$id === selectedBranchId) || null;
  }, [selectedBranchId, branches]);

  // Derived state for service details
  const serviceDetails = React.useMemo(() => {
    const service = services.find((s) => s.$id === selectedServiceId);
    return {
      duration: service?.duration ?? 30,
      name: service?.name ?? "",
    };
  }, [selectedServiceId, services]);

  const duration = serviceDetails.duration;
  const selectedServiceName = serviceDetails.name;

  // Derived state for dentist details
  const dentistToUse: Dentist | null = React.useMemo(() => {
    if (selectedDentistId === "none") return null; // ✅ Return no dentist
    return dentists.find((d) => d.$id === selectedDentistId) || null;
  }, [selectedDentistId, dentists]);

  const selectedDentistName = dentistToUse?.name ?? "";

  const slots = React.useMemo(() => {
    if (!selectedDate || !selectedBranchId) return [];

    const branch = branches.find((b) => b.$id === selectedBranchId);
    if (!branch) return [];

    const timeSlots = generateTimeSlots(branch.startHour, branch.endHour);

    const bookedTimes = bookedSlots.map((b) => b.time);

    return timeSlots.filter((t) => !bookedTimes.includes(t));
  }, [selectedDate, selectedBranchId, bookedSlots]);

  // Reset selected time when date/preferences change
  React.useEffect(() => {
    setSelectedTime(undefined);
  }, [selectedDate, selectedServiceId, selectedDentistId]);

  // Reset inputs and refresh data function
  const handleResetAndRefresh = React.useCallback(() => {
    // 1. Reset user inputs
    setName("");
    setEmail("");
    setPhone("");

    // 2. Reset selections
    const today = new Date();
    setSelectedDate(today);
    setSelectedTime(undefined);

    // Re-select the first service and default dentist preference
    if (services.length > 0) {
      setSelectedServiceId(services[0].$id);
    }
    setSelectedDentistId("none");

    // 3. Force refresh the booked slots data for the current date
    loadBookedSlots(today);

    // 4. Hide success message
    setSuccess(false);
  }, [loadBookedSlots, services]);

  // Dentists belonging to the selected branch
  const filteredDentists = React.useMemo(() => {
    if (!selectedBranchId) return dentists;
    return dentists.filter((d) => d.branchId === selectedBranchId);
  }, [selectedBranchId, dentists]);

  // Submit booking
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !selectedServiceId) return;

    setIsSubmitting(true);

    const dateKey = format(selectedDate, "yyyy-MM-dd");

    if (!selectedServiceName) {
      console.error("Missing required names/details for submission.");
      setIsSubmitting(false);
      return;
    }

    try {
      await databases.createDocument(DB, BOOKINGS, ID.unique(), {
        name,
        email,
        phone,

        branchId: selectedBranchId,
        branchName:
          branches.find((b) => b.$id === selectedBranchId)?.name || "",

        serviceId: selectedServiceId,
        dentistId: selectedDentistId === "none" ? null : selectedDentistId,

        serviceName: selectedServiceName,
        dentistName:
          selectedDentistId === "none" ? "No Preference" : selectedDentistName,
        serviceDuration: duration,

        date: selectedDate.toISOString(),
        dateKey,
        time: selectedTime,

        status: "pending",

        timestamp: Math.floor(new Date().getTime() / 1000),
      });

      // 1. Refresh slots immediately after successful submission
      loadBookedSlots(selectedDate);

      // 2. Show success screen
      setSuccess(true);
    } catch (error) {
      console.error("Appwrite submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Dental-themed subtle background SVG pattern component
  function DentalBackground() {
    return (
      <svg
        aria-hidden="true"
        className="fixed inset-0 -z-10 w-full h-full opacity-10"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ pointerEvents: "none" }}
      >
        <defs>
          <pattern
            id="dentalPattern"
            x="0"
            y="0"
            width="100"
            height="100"
            patternUnits="userSpaceOnUse"
          >
            {/* Tooth icon */}
            <path
              d="M30 10c-6 0-10 8-10 14s4 16 10 16 10-8 10-14-4-16-10-16z"
              stroke="#3ABAB4"
              strokeWidth="2"
              fill="none"
              opacity="0.15"
            />
            {/* Toothbrush */}
            <rect
              x="60"
              y="20"
              width="8"
              height="30"
              stroke="#3ABAB4"
              strokeWidth="2"
              fill="none"
              opacity="0.15"
              rx="2"
              ry="2"
            />
            <line
              x1="60"
              y1="15"
              x2="68"
              y2="15"
              stroke="#3ABAB4"
              strokeWidth="2"
              opacity="0.15"
            />
            <line
              x1="60"
              y1="55"
              x2="68"
              y2="55"
              stroke="#3ABAB4"
              strokeWidth="2"
              opacity="0.15"
            />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#dentalPattern)" />
      </svg>
    );
  }

  // Success screen
  if (success)
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-teal-50 to-white relative overflow-hidden rounded-xl">
        <DentalBackground />
        <Card className="max-w-lg w-full text-center p-8 shadow-lg border-teal-500 border-t-8 rounded-xl bg-white/90 backdrop-blur-sm">
          <img
            src="/Egargue-logo2.PNG"
            alt="Egargue Dental Group Logo"
            className="mx-auto mb-6 h-20 object-contain"
            loading="lazy"
          />
          <CheckCircle className="h-20 w-20 text-teal-500 mx-auto mb-5" />
          <h1 className="text-3xl font-extrabold text-teal-700">
            Appointment Sent!
          </h1>
          <p className="mt-2 text-gray-700">
            Thank you <span className="font-semibold">{name}</span>, your
            request is now waiting for approval.
          </p>
          <Button
            className="mt-6 bg-teal-600 hover:bg-teal-700"
            onClick={handleResetAndRefresh}
          >
            Book another appointment
          </Button>
        </Card>
      </div>
    );

  // Main form
  return (
    <div className="min-h-screen relative bg-gradient-to-b from-teal-50 to-white overflow-hidden rounded-xl p-10 max-w-9xl mx-auto shadow-xl">
      <DentalBackground />

      {/* Glass header card with logo + brand name */}
      <Card className="flex items-center gap-4 p-6 mb-10 shadow-lg border-teal-500 border-t-8 rounded-xl bg-white/70 backdrop-blur-md">
        <img
          src="/Egargue-logo2.PNG"
          alt="Egargue Dental Group Logo"
          className="h-20 w-auto object-contain"
          loading="lazy"
        />
        <div>
          {/* <h1 className="text-3xl font-extrabold text-teal-700 tracking-wide">
            EGARGUE
          </h1>
          <h2 className="text-xl font-semibold text-gray-700 tracking-wide">
            DENTAL GROUP
          </h2> */}
          <p className="text-sm text-gray-500 mt-1">
            Quality Service Since 1992
          </p>
        </div>
      </Card>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-10"
      >
        {/* LEFT */}
        <div className="space-y-6">
          <h3 className="font-semibold text-xl flex items-center gap-2 text-teal-700">
            <Clock className="h-5 w-5" /> Select Date & Time
          </h3>

          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date: Date) =>
              isBefore(date, startOfDay(new Date())) ||
              date.getDay() === 0 ||
              date.getDay() === 6
            }
            className="rounded-md border shadow w-full md:w-1/2 border-gray-300"
          />

          <h3 className="font-semibold text-lg text-teal-700">
            Available Slots — {selectedDate && format(selectedDate, "MMM d")}
          </h3>

          <div className="grid grid-cols-3 gap-3">
            {isLoadingData ? (
              <p className="col-span-3 text-gray-500 text-sm">
                Loading services and availability...
              </p>
            ) : selectedServiceId === "" ? (
              <p className="col-span-3 text-gray-500 text-sm">
                Please select a service above to view available slots.
              </p>
            ) : slots.length > 0 ? (
              slots.map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={selectedTime === t ? "default" : "outline"}
                  onClick={() => setSelectedTime(t)}
                  className="text-teal-700 border-teal-600 hover:bg-teal-600 hover:text-white"
                >
                  {t}
                </Button>
              ))
            ) : (
              <p className="col-span-3 text-red-500 text-sm">
                No slots available for the selected service/dentist.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          <h3 className="font-semibold text-xl flex items-center gap-2 text-teal-700">
            <User className="h-5 w-5" /> Your Details
          </h3>

          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Phone *</Label>
            <Input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <h3 className="font-semibold text-xl flex items-center gap-2 text-teal-700">
            <Stethoscope className="h-5 w-5" /> Preferences
          </h3>

          {/* Services */}
          <div className="space-y-2">
            <Label>Select Service *</Label>
            <Select
              value={selectedServiceId}
              onValueChange={setSelectedServiceId}
              disabled={isLoadingData}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.$id} value={s.$id}>
                    {s.name} ({s.duration} mins)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Branch Selection */}
          <div className="space-y-2">
            <Label>Select Branch *</Label>
            <Select
              value={selectedBranchId}
              onValueChange={setSelectedBranchId}
              disabled={isLoadingData}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a branch" />
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

          {/* Dentist */}
          <div className="space-y-2">
            <Label>Dentist (Optional)</Label>
            <Select
              value={selectedDentistId}
              onValueChange={setSelectedDentistId}
              disabled={isLoadingData}
            >
              <SelectTrigger>
                <SelectValue placeholder="No preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Preference</SelectItem>
                {filteredDentists.map((d) => (
                  <SelectItem key={d.$id} value={d.$id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full py-3 text-lg font-bold bg-teal-600 hover:bg-teal-700"
            disabled={
              isSubmitting ||
              isLoadingData ||
              !selectedDate ||
              !selectedTime ||
              !selectedServiceId ||
              !name ||
              !email ||
              !phone
            }
          >
            {isSubmitting ? "Submitting..." : "Request Appointment"}
          </Button>
        </div>
      </form>
    </div>
  );
}

"use client";

import * as React from "react";
// Import necessary icons and date utilities
import {
  Clock,
  Stethoscope,
  User,
  Calendar as CalendarIcon,
  CheckCircle,
} from "lucide-react";
import {
  format,
  isSameDay,
  addMinutes,
  isAfter,
  setHours,
  setMinutes,
  isBefore,
} from "date-fns";

// Assuming these shadcn/ui components are available
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
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// --- MOCK DATA ---
const mockServices = [
  { id: "S1", name: "Routine Check-up", duration: 30 },
  { id: "S2", name: "Teeth Cleaning", duration: 60 },
  { id: "S3", name: "Filling Procedure", duration: 45 },
];

const mockDentists = [
  {
    id: "D1",
    name: "Dr. Evelyn Reed",
    availability: { startHour: 9, endHour: 17 },
  }, // 9 AM to 5 PM
  {
    id: "D2",
    name: "Dr. Marcus Hill",
    availability: { startHour: 8, endHour: 16 },
  }, // 8 AM to 4 PM
];

// Mock booked slots to show time slot exclusion
const mockBookedSlots: {
  [key: string]: { time: string; dentistId: string }[];
} = {
  [format(new Date(), "yyyy-MM-dd")]: [
    { time: "10:00 AM", dentistId: "D1" },
    { time: "02:30 PM", dentistId: "D2" },
  ],
};

// --- HELPER FUNCTION: Slot Generation ---
/**
 * Generates available time slots based on dentist availability and existing bookings.
 */
const generateAvailableSlots = (
  date: Date,
  selectedDentistId: string | null,
  serviceDuration: number
): string[] => {
  // Use the ID of the first dentist (D1) if "none" is selected for availability calculation
  const dentistIdToUse =
    selectedDentistId === "none" ? mockDentists[0].id : selectedDentistId;

  const dentist = mockDentists.find((d) => d.id === dentistIdToUse);
  if (!dentist) return [];

  const { startHour, endHour } = dentist.availability;
  const slots: string[] = [];
  const currentDateKey = format(date, "yyyy-MM-dd");
  const bookedSlots = mockBookedSlots[currentDateKey] || [];

  let currentTime = setMinutes(setHours(date, startHour), 0);
  const endTime = setMinutes(setHours(date, endHour), 0);

  // Handle current day to disable past times and provide a buffer
  if (isSameDay(date, new Date())) {
    const now = new Date();
    currentTime = isAfter(currentTime, now) ? currentTime : addMinutes(now, 30);
    const minutes = currentTime.getMinutes();
    const roundedMinutes = minutes < 30 ? 30 : 60;
    currentTime = addMinutes(currentTime, roundedMinutes - minutes);
  }

  while (isBefore(currentTime, endTime)) {
    const slotEndTime = addMinutes(currentTime, serviceDuration);

    if (isAfter(slotEndTime, endTime)) {
      break;
    }

    const slotTime = format(currentTime, "hh:mm a");
    const isBooked = bookedSlots.some(
      (booked) =>
        booked.time === slotTime && booked.dentistId === dentistIdToUse
    );

    if (!isBooked) {
      slots.push(slotTime);
    }

    currentTime = addMinutes(currentTime, 30);
  }

  return slots;
};

// --- MAIN COMPONENT ---

export default function CustomerAppointmentForm() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    new Date()
  );
  const [selectedServiceId, setSelectedServiceId] = React.useState<
    string | undefined
  >(mockServices[0].id);
  // FIX: Default to "none" for no preference, which is unique.
  const [selectedDentistId, setSelectedDentistId] = React.useState<
    string | undefined
  >("none");
  const [selectedTime, setSelectedTime] = React.useState<string | undefined>();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submissionSuccess, setSubmissionSuccess] = React.useState(false);

  // Calculate service duration based on selection
  const serviceDuration = React.useMemo(() => {
    return mockServices.find((s) => s.id === selectedServiceId)?.duration || 30;
  }, [selectedServiceId]);

  // Calculate available slots dynamically
  const availableSlots = React.useMemo(() => {
    if (!selectedDate) return [];
    // Pass the selectedDentistId (which can be "none") to the generator
    const dentistIdToUse = selectedDentistId || "none";
    return generateAvailableSlots(
      selectedDate,
      dentistIdToUse,
      serviceDuration
    );
  }, [selectedDate, selectedDentistId, serviceDuration]);

  // Reset selected time when dependencies change
  React.useEffect(() => {
    setSelectedTime(undefined);
  }, [selectedDate, selectedServiceId, selectedDentistId]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !name || !email || !phone) {
      console.error("Please fill out all required fields.");
      return;
    }

    setIsSubmitting(true);

    console.log("Appointment Requested:", {
      date: format(selectedDate, "yyyy-MM-dd"),
      time: selectedTime,
      service: mockServices.find((s) => s.id === selectedServiceId)?.name,
      // If "none" is selected, log "No Preference" instead of a dentist name
      dentist:
        selectedDentistId === "none"
          ? "No Preference"
          : mockDentists.find((d) => d.id === selectedDentistId)?.name,
      name,
      email,
      phone,
    });

    // Simulate API delay
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmissionSuccess(true);
    }, 1500);
  };

  // --- Success Message View ---
  if (submissionSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-xl w-full text-center p-8 shadow-2xl border-green-400 border-t-8 rounded-xl">
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
          <CardTitle className="text-3xl font-extrabold mb-2">
            Appointment Requested!
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Thank you, **{name}**! Your request has been successfully submitted
            and is awaiting confirmation.
          </CardDescription>
          <Separator className="my-6" />
          <Button onClick={() => setSubmissionSuccess(false)} className="mt-4">
            Book Another Appointment
          </Button>
        </Card>
      </div>
    );
  }

  // --- Main Form View ---
  return (
    <div className="max-w-4xl mx-auto p-10 mt-10 bg-white shadow-2xl rounded-xl">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3 text-primary">
        <CalendarIcon className="h-7 w-7" /> Book Your Appointment
      </h1>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
      >
        {/* Column 1: Date & Time Selection */}
        <div className="space-y-6">
          <h3 className="font-semibold text-xl border-b pb-2 flex items-center gap-2 text-gray-700">
            <Clock className="h-5 w-5" /> Select Date & Time
          </h3>

          <div className="space-y-4">
            <Label className="font-medium">Date *</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) =>
                isBefore(date, new Date()) ||
                date.getDay() === 0 ||
                date.getDay() === 6
              }
              className="rounded-md border shadow w-full"
            />
          </div>

          <h3 className="font-semibold pt-4">
            Available Time Slots (
            {selectedDate ? format(selectedDate, "MMM d") : "..."})
          </h3>

          {/* Render dynamic time slot buttons */}
          <div className="grid grid-cols-3 gap-3">
            {selectedDate && availableSlots.length > 0 ? (
              availableSlots.map((slot) => (
                <Button
                  key={slot}
                  type="button"
                  variant={selectedTime === slot ? "default" : "outline"}
                  onClick={() => setSelectedTime(slot)}
                  className="font-medium"
                >
                  {slot}
                </Button>
              ))
            ) : (
              <p className="col-span-3 text-sm text-red-500 font-medium">
                No slots available for this selection. Try a different date,
                service, or dentist.
              </p>
            )}
          </div>
        </div>

        {/* Column 2: Details, Preferences, & Submit */}
        <div className="space-y-6">
          <h3 className="font-semibold text-xl border-b pb-2 flex items-center gap-2 text-gray-700">
            <User className="h-5 w-5" /> Your Details
          </h3>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <h3 className="font-semibold text-xl border-b pt-6 pb-2 flex items-center gap-2 text-gray-700">
            <Stethoscope className="h-5 w-5" /> Preferences
          </h3>

          {/* Select Service Component */}
          <div className="space-y-2">
            <Label htmlFor="service">Select Service *</Label>
            <Select
              value={selectedServiceId}
              onValueChange={(value) => setSelectedServiceId(value)}
              required
            >
              <SelectTrigger id="service">
                <SelectValue placeholder="Choose a service" />
              </SelectTrigger>
              <SelectContent>
                {mockServices.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} ({service.duration} min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select Dentist Component - FIX APPLIED HERE */}
          <div className="space-y-2">
            <Label htmlFor="dentist">Select Preferred Dentist (Optional)</Label>
            <Select
              value={selectedDentistId}
              onValueChange={(value) => setSelectedDentistId(value)}
            >
              <SelectTrigger id="dentist">
                <SelectValue placeholder="No preference" />
              </SelectTrigger>
              <SelectContent>
                {/* FIX: Use unique key/value "none" for No Preference */}
                <SelectItem key="no-pref" value="none">
                  No Preference
                </SelectItem>
                {mockDentists.map((dentist) => (
                  <SelectItem key={dentist.id} value={dentist.id}>
                    {dentist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full mt-6 py-3 text-lg font-bold"
            disabled={
              isSubmitting ||
              !selectedDate ||
              !selectedTime ||
              !name ||
              !email ||
              !phone
            }
          >
            {isSubmitting ? "Submitting Request..." : "Request Appointment"}
          </Button>
        </div>
      </form>
    </div>
  );
}

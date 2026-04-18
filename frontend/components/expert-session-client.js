"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authRequest } from "@/lib/api";
import { EmailInputWithSuggestions } from "./email-input-with-suggestions";
import { useAuth } from "./auth-provider";
import { SiteShell } from "./site-shell";

const TIME_OPTIONS = [
  { value: "18:00", label: "6:00 PM - 7:00 PM" },
  { value: "19:00", label: "7:00 PM - 8:00 PM" },
  { value: "20:00", label: "8:00 PM - 9:00 PM" },
  { value: "21:00", label: "9:00 PM - 10:00 PM" },
  { value: "22:00", label: "10:00 PM - 11:00 PM" },
  { value: "23:00", label: "11:00 PM - 12:00 AM" },
  { value: "00:00", label: "12:00 AM - 1:00 AM (next day)" },
  { value: "01:00", label: "1:00 AM - 2:00 AM (next day)" },
];
const ALLOWED_BOOKING_DAYS = new Set([0, 5, 6]); // Sun, Fri, Sat
const ALLOWED_SESSION_START_HOURS = new Set([0, 1, 18, 19, 20, 21, 22, 23]);

const NAME_PATTERN = /^[A-Za-z]+(?:[A-Za-z\s'.-]*[A-Za-z])?$/;
const PHONE_PATTERN = /^(?:\+?\d{1,3}[\s-]?)?\d{10}$/;

function formatSlotLabel(start, end) {
  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(start);
  const timeLabel = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(end);

  return `${dateLabel}, ${timeLabel} - ${endLabel}`;
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateLimits() {
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  minDate.setHours(0, 0, 0, 0);

  const maxDate = new Date(minDate);
  maxDate.setDate(minDate.getDate() + 13);

  return {
    minDate,
    maxDate,
    minDateValue: toDateInputValue(minDate),
    maxDateValue: toDateInputValue(maxDate),
  };
}

function getFirstValidDate() {
  const { minDate, maxDate } = getDateLimits();

  for (
    let current = new Date(minDate);
    current <= maxDate;
    current.setDate(current.getDate() + 1)
  ) {
    if (ALLOWED_BOOKING_DAYS.has(current.getDay())) {
      return toDateInputValue(current);
    }
  }

  return toDateInputValue(minDate);
}

function buildSelectedSlot(dateValue, timeValue) {
  if (!dateValue || !timeValue) {
    return null;
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);
  const bookingDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (
    Number.isNaN(bookingDate.getTime()) ||
    !ALLOWED_BOOKING_DAYS.has(bookingDate.getDay()) ||
    !ALLOWED_SESSION_START_HOURS.has(hours)
  ) {
    return null;
  }

  const start = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (hours < 2) {
    start.setDate(start.getDate() + 1);
  }

  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return {
    slotLabel: formatSlotLabel(start, end),
    slotStart: start.toISOString(),
    slotEnd: end.toISOString(),
  };
}

function isWeekendBookingDate(dateValue) {
  if (!dateValue) {
    return false;
  }

  const date = new Date(`${dateValue}T00:00:00`);
  return (
    !Number.isNaN(date.getTime()) && ALLOWED_BOOKING_DAYS.has(date.getDay())
  );
}

function validateName(value) {
  const normalized = String(value || "").trim();

  if (normalized.length < 2) {
    return "Enter a valid full name with at least 2 letters.";
  }

  if (!NAME_PATTERN.test(normalized)) {
    return "Name can only contain letters, spaces, apostrophes, periods, and hyphens.";
  }

  return "";
}

function validatePhone(value) {
  const normalized = String(value || "").trim();
  const digitsOnly = normalized.replace(/\D/g, "");

  if (digitsOnly.length !== 10) {
    return "Enter a valid 10-digit phone number.";
  }

  if (!PHONE_PATTERN.test(normalized)) {
    return "Phone number format is invalid.";
  }

  return "";
}

function formatDate(value) {
  if (!value) {
    return "Unavailable";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ExpertSessionClient() {
  const router = useRouter();
  const { token, user, hydrated } = useAuth();
  const dateLimits = useMemo(() => getDateLimits(), []);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
    selectedDate: "",
    selectedTime: TIME_OPTIONS[0].value,
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [sessionRequests, setSessionRequests] = useState([]);
  const invalidBookingDateSelected =
    Boolean(form.selectedDate) && !isWeekendBookingDate(form.selectedDate);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!token || user?.role !== "student") {
      router.replace("/auth");
      return;
    }

    setForm((current) => ({
      ...current,
      name: current.name || user?.name || "",
      email: current.email || user?.email || "",
      selectedDate: current.selectedDate || getFirstValidDate(),
    }));

    loadSessionRequests();
  }, [hydrated, token, user, router]);

  async function loadSessionRequests() {
    try {
      setLoadingRequests(true);
      const data = await authRequest("/students/expert-sessions", token);
      setSessionRequests(data.requests || []);
    } catch {
      setSessionRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const nameError = validateName(form.name);
    if (nameError) {
      setMessage(nameError);
      setBusy(false);
      return;
    }

    const phoneError = validatePhone(form.phone);
    if (phoneError) {
      setMessage(phoneError);
      setBusy(false);
      return;
    }

    const selectedDateObject = form.selectedDate
      ? new Date(`${form.selectedDate}T00:00:00`)
      : null;

    if (!selectedDateObject || Number.isNaN(selectedDateObject.getTime())) {
      setMessage("Please choose a valid session date.");
      setBusy(false);
      return;
    }

    if (!ALLOWED_BOOKING_DAYS.has(selectedDateObject.getDay())) {
      setMessage("Experts are available only on Friday, Saturday, and Sunday.");
      setBusy(false);
      return;
    }

    const selectedSlot = buildSelectedSlot(
      form.selectedDate,
      form.selectedTime,
    );

    if (!selectedSlot) {
      setMessage("Please choose a valid one-hour session slot.");
      setBusy(false);
      return;
    }

    try {
      await authRequest("/students/expert-sessions", token, {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          message: form.message,
          slotLabel: selectedSlot?.slotLabel || "",
          slotStart: selectedSlot?.slotStart || "",
          slotEnd: selectedSlot?.slotEnd || "",
        }),
      });

      setMessage(
        "Your 1:1 expert session request has been sent to the admin team.",
      );
      await loadSessionRequests();
      setForm((current) => ({
        ...current,
        phone: "",
        message: "",
        selectedDate: getFirstValidDate(),
        selectedTime: TIME_OPTIONS[0].value,
      }));
    } catch (error) {
      setMessage(error.message || "Unable to book your session right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteShell>
      <section className="grid two-up">
        <div className="content-card expert-session-hero">
          <span className="eyebrow">1:1 Expert Session</span>
          <h2>Book a one-hour session with an industry expert</h2>
          <p>
            Choose a preferred time slot, share your contact details, and tell
            us what you want help with. Your request will be visible in the
            admin dashboard for follow-up.
          </p>
          <div className="expert-session-availability">
            <strong>Expert Availability</strong>
            <p>
              Experts are available only on Friday, Saturday, and Sunday from
              6:00 PM to 2:00 AM.
            </p>
          </div>

          <div className="feature-grid expert-session-highlights">
            <article className="proof-card">
              <strong>Personalized guidance</strong>
              <p>
                Get help with career direction, projects, resumes, or interview
                prep.
              </p>
            </article>
            <article className="proof-card">
              <strong>Simple booking</strong>
              <p>
                Select one clear one-hour slot and add the context experts need.
              </p>
            </article>
          </div>
        </div>

        <div className="content-card accent-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Booking form</span>
              <h2>Request your preferred slot</h2>
            </div>
          </div>

          <form className="stack-form" onSubmit={handleSubmit}>
            <label>
              <span className="required-label">
                Full name
                <span className="required-mark">*</span>
              </span>
              <input
                required
                type="text"
                value={form.name}
                minLength={2}
                pattern={NAME_PATTERN.source}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                onBlur={() => {
                  const error = validateName(form.name);
                  if (error) {
                    setMessage(error);
                  }
                }}
                placeholder="Enter your full name"
              />
            </label>

            <label>
              <span className="required-label">
                Phone number
                <span className="required-mark">*</span>
              </span>
              <input
                required
                type="tel"
                value={form.phone}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: event.target.value
                      .replace(/[^\d]/g, "")
                      .slice(0, 10),
                  }))
                }
                onBlur={() => {
                  const error = validatePhone(form.phone);
                  if (error) {
                    setMessage(error);
                  }
                }}
                placeholder="Enter your 10-digit phone number"
              />
            </label>

            <label>
              <span className="required-label">
                Email address
                <span className="required-mark">*</span>
              </span>
              <EmailInputWithSuggestions
                required
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="Enter your email"
              />
            </label>

            <label>
              <span className="required-label">
                Preferred date
                <span className="required-mark">*</span>
              </span>
              <input
                required
                type="date"
                min={dateLimits.minDateValue}
                max={dateLimits.maxDateValue}
                value={form.selectedDate}
                onChange={(event) => {
                  const nextDate = event.target.value;

                  if (!isWeekendBookingDate(nextDate)) {
                    setMessage(
                      "Please choose Friday, Saturday, or Sunday only.",
                    );
                    setForm((current) => ({
                      ...current,
                      selectedDate: "",
                    }));
                    return;
                  }

                  setMessage("");
                  setForm((current) => ({
                    ...current,
                    selectedDate: nextDate,
                  }));
                }}
              />
            </label>

            <p className="field-note">
              Experts are available only on Friday, Saturday, and Sunday from
              6:00 PM to 2:00 AM.
            </p>

            <label>
              <span className="required-label">
                Preferred 1-hour time slot
                <span className="required-mark">*</span>
              </span>
              <select
                required
                value={form.selectedTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    selectedTime: event.target.value,
                  }))
                }
              >
                {TIME_OPTIONS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="required-label">
                Message
                <span className="required-mark">*</span>
              </span>
              <textarea
                required
                rows="5"
                value={form.message}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                placeholder="Tell the expert what you want help with."
              />
            </label>

            <button
              className="button primary"
              disabled={
                busy || !form.selectedDate || invalidBookingDateSelected
              }
            >
              {busy ? "Sending request..." : "Book expert session"}
            </button>
          </form>
          <br></br>
          {message ? <p className="status-banner">{message}</p> : null}
        </div>
      </section>

      <section className="content-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Your bookings</span>
            <h2>Booked expert sessions</h2>
          </div>
          <span className="score-chip">{sessionRequests.length} requests</span>
        </div>

        {loadingRequests ? (
          <div className="loading-block">Loading your session requests...</div>
        ) : sessionRequests.length ? (
          <div className="admin-table-shell">
            <table className="shortlist-table">
              <thead>
                <tr>
                  <th>Preferred slot</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Message</th>
                  <th>Requested on</th>
                </tr>
              </thead>
              <tbody>
                {sessionRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.slotLabel}</td>
                    <td>{request.phone}</td>
                    <td>{request.email}</td>
                    <td>{request.message}</td>
                    <td>{formatDate(request.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            You have not booked any expert sessions yet. Submit the form above
            to create your first request.
          </p>
        )}
      </section>
    </SiteShell>
  );
}

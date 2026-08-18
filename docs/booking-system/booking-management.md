# Booking & Appointment Management

## 1. Feature Overview

Build a complete, multi-tenant booking and appointment management system supporting:

* Multiple businesses
* Multiple staff members per business
* Multiple customers
* Multiple services per business
* Staff-specific services
* Staff working schedules
* Business operating hours
* Customer bookings
* Staff-created bookings
* Business-owner-created bookings
* Availability checking
* Staff calendars
* Business calendars
* Customer calendars
* Appointment management
* Rescheduling
* Cancellation
* Appointment status management
* Conflict prevention
* Notifications
* Mobile-first booking experience

The booking experience must feel **fast, simple, predictable, and native**, especially on mobile/PWA.

---

## 2. Core Booking Concept

An appointment belongs to:

```text
Business
   ↓
Service(s)
   ↓
Staff
   ↓
Customer
   ↓
Date + Time
```

A customer should be able to:

1. Select a business.
2. Select one or more services.
3. Select a preferred staff member or choose "Any available staff".
4. Select a date.
5. See available time slots.
6. Select a time.
7. Review the appointment.
8. Confirm the booking.
9. Receive confirmation.
10. View the appointment in their calendar.

Staff and business owners should be able to perform the same flow on behalf of a customer.

---

# 3. User Roles

## Customer

Customers can:

* Browse a business.
* View available services.
* Select services.
* Select preferred staff.
* View availability.
* Book appointments.
* View upcoming appointments.
* View past appointments.
* Cancel appointments.
* Reschedule appointments.
* View appointment details.
* Receive booking notifications.
* See appointments in their calendar.

---

## Staff

Staff can:

* View their calendar.
* View appointments assigned to them.
* View appointment details.
* Create appointments for customers.
* Search/select customers.
* Select services they provide.
* Check availability.
* Reschedule appointments.
* Cancel appointments.
* Mark appointments as confirmed.
* Mark appointments as completed.
* Mark appointments as no-show.
* Block time.
* View their working schedule.

Staff must only be able to access data belonging to their business.

---

## Business Owner / Manager

Business users can:

* View the entire business calendar.
* View individual staff calendars.
* Create appointments for customers.
* View customer appointments.
* Manage appointments.
* Reschedule appointments.
* Cancel appointments.
* Assign/reassign staff.
* Manage services.
* Configure staff availability.
* Configure business operating hours.
* Create blocked periods.
* View booking statistics.

---

# 4. Services

Each business can have multiple services.

Example:

```text
Business
├── Haircut
├── Beard Trim
├── Full Grooming
├── Facial
└── Massage
```

Each service should have:

* Name
* Description
* Duration
* Price
* Active/inactive status
* Optional image
* Business ID

Services may optionally be assigned to specific staff members.

Example:

```text
Haircut
├── John
├── Peter
└── Mary

Massage
├── Mary
└── Sarah
```

---

# 5. Staff Availability

Availability must be calculated from:

```text
Business hours
+
Staff working hours
+
Staff time off
+
Existing appointments
+
Blocked periods
```

A staff member should never be shown as available when an existing appointment or blocked period prevents the requested booking.

---

# 6. Booking Rules

The booking engine must enforce:

### No double booking

Two appointments must never occupy the same staff/time period.

### Service duration

If a service takes 60 minutes:

```text
10:00 → 11:00
```

The system must ensure the entire duration is available.

### Multiple services

If a customer selects:

```text
Haircut: 30 min
Beard: 20 min
Facial: 40 min
```

Total duration:

```text
90 minutes
```

The availability engine must find a continuous 90-minute slot.

### Working hours

Appointments cannot extend beyond staff working hours.

### Business hours

Appointments cannot occur outside the business operating hours.

### Staff service eligibility

A staff member should only be selectable if they can perform the requested service(s).

### Past dates

Customers cannot create appointments in the past.

### Booking cutoff

The system should support configurable rules such as:

```text
Minimum booking notice: 2 hours
Maximum booking window: 90 days
```

---

# 7. Availability

Availability is a first-class backend capability.

The frontend must never attempt to calculate authoritative availability itself.

The backend should provide:

```text
GET /availability
```

Example request:

```text
businessId
serviceIds[]
staffId?
date
```

Example response:

```json
{
  "date": "2026-08-20",
  "duration": 60,
  "slots": [
    {
      "start": "09:00",
      "end": "10:00",
      "staffId": "staff-1"
    },
    {
      "start": "10:30",
      "end": "11:30",
      "staffId": "staff-1"
    }
  ]
}
```

---

# 8. Booking Creation

Booking creation must be transactional.

The flow should be:

```text
Request booking
      ↓
Validate customer
      ↓
Validate business
      ↓
Validate services
      ↓
Validate staff
      ↓
Calculate duration
      ↓
Check availability
      ↓
Create appointment
      ↓
Commit transaction
      ↓
Create notifications/events
```

The final availability check must happen **inside the booking transaction**.

This prevents:

```text
Customer A checks slot → available
Customer B checks slot → available
Customer A books
Customer B books
```

Both requests must not succeed.

---

# 9. Booking Status

Appointments should support:

```text
PENDING
CONFIRMED
COMPLETED
CANCELLED
NO_SHOW
```

Optional:

```text
RESCHEDULED
```

Prefer representing rescheduling as an appointment update/history rather than destroying the original appointment record.

---

# 10. Calendar Views

## Customer

Customer calendar:

```text
Upcoming
Today
This week
This month
Past
```

The customer only sees their own appointments.

---

## Staff

Staff calendar:

```text
Day
Week
Agenda
```

The default view should be optimized for mobile.

The staff member should immediately see:

* Time
* Customer
* Service
* Duration
* Status

---

## Business

Business calendar supports:

```text
All Staff
Staff 1
Staff 2
Staff 3
```

Views:

```text
Day
Week
Agenda
```

Business users should be able to filter by:

* Staff
* Service
* Status
* Customer

---

# 11. Appointment Details

Appointment details should contain:

```text
Customer
Business
Staff
Services
Date
Start time
End time
Duration
Price
Status
Notes
Created by
Created at
Updated at
```

Actions depend on role/status:

```text
Reschedule
Cancel
Confirm
Complete
Mark No-show
Change Staff
```

---

# 12. Booking Sources

Track who created the appointment:

```text
CUSTOMER
STAFF
BUSINESS_OWNER
SYSTEM
```

This is important for analytics and auditing.

---

# 13. Customer Booking Flow

Ideal flow:

```text
Business
   ↓
Services
   ↓
Staff
   ↓
Date
   ↓
Available times
   ↓
Review
   ↓
Confirm
   ↓
Success
```

Minimize unnecessary screens.

The customer should not have to repeatedly enter information that already exists in their account.

---

# 14. Staff / Owner Booking Flow

```text
Calendar
   ↓
Create appointment
   ↓
Select customer
   ↓
Select service
   ↓
Select staff
   ↓
Select date
   ↓
Select available time
   ↓
Review
   ↓
Confirm
```

Staff should be able to create a customer during booking if the customer does not already exist.

---

# 15. Notifications

Booking events should generate notifications for relevant users.

Examples:

```text
Appointment booked
Appointment confirmed
Appointment cancelled
Appointment rescheduled
Appointment reminder
Appointment completed
```

Notifications should eventually support:

* In-app
* Push
* Email
* SMS

The initial implementation can prioritize in-app notifications and establish an event architecture for future channels.

---

# 16. Audit History

Appointment changes should be auditable.

Track:

```text
Created
Rescheduled
Cancelled
Staff changed
Status changed
Customer changed
Service changed
```

Store:

```text
actor
action
timestamp
old value
new value
```

---

# 17. Non-Functional Requirements

The booking system must be:

* Mobile-first
* Responsive
* Accessible
* Fast
* Transaction-safe
* Multi-tenant safe
* Idempotent
* Timezone-aware
* Resistant to race conditions
* Easy to extend
* Easy to test

---

# 18. Definition of Done

The feature is complete when:

* Customers can book appointments end-to-end.
* Customers can see availability.
* Customers can view their calendar.
* Staff can view their calendars.
* Business owners can view business calendars.
* Staff can book for customers.
* Business owners can book for customers.
* Multiple services work.
* Staff/service restrictions work.
* Working hours work.
* Existing appointments block availability.
* Double booking is prevented.
* Rescheduling works.
* Cancellation works.
* Appointment statuses work.
* Notifications are generated.
* Multi-tenant isolation is enforced.
* Mobile booking works without layout issues.
* Backend tests cover booking conflicts and availability.
* Frontend tests cover critical booking flows.

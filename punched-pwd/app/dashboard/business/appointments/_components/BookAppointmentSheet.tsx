"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type {
  BusinessCustomer,
  ServiceCatalogItemResponse,
  StaffMember,
} from "@/types";
import { Button, FormField, Modal, Select } from "@/components/ui";

/**
 * Booking sheet: create an appointment on behalf of a customer.
 * Composed from shared UI primitives (Modal / FormField / Select).
 */
export function BookAppointmentSheet({
  customers,
  services,
  staff,
  onClose,
  onBook,
}: {
  customers: BusinessCustomer[];
  services: ServiceCatalogItemResponse[];
  staff: StaffMember[];
  onClose: () => void;
  onBook: (book: {
    customerId: string;
    serviceId: string;
    staffUserId?: string;
    scheduledAt: string;
  }) => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffUserId, setStaffUserId] = useState("");
  const [when, setWhen] = useState("");

  const valid = Boolean(customerId && serviceId && when);

  return (
    <Modal
      open
      onClose={onClose}
      title="Book appointment"
      description="Create an appointment for a customer"
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid) return;

          onBook({
            customerId,
            serviceId,
            staffUserId: staffUserId || undefined,
            scheduledAt: new Date(when).toISOString(),
          });
        }}
      >
        <FormField label="Customer">
          <Select
            fullWidth
            className="h-12 text-sm"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            label="Customer"
          >
            <option value="">Select customer</option>

            {customers.map((customer) => (
              <option key={customer.userId} value={customer.userId}>
                {customer.fullName}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Service">
          <Select
            fullWidth
            className="h-12 text-sm"
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            label="Service"
          >
            <option value="">Select service</option>

            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} - {service.durationMinutes} min
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Date and time">
          <input
            type="datetime-local"
            value={when}
            onChange={(event) => setWhen(event.target.value)}
            aria-label="Date and time"
            className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-brand focus:ring-2 focus:ring-[var(--brand-ring)]"
          />
        </FormField>

        <FormField label="Staff member">
          <Select
            fullWidth
            className="h-12 text-sm"
            value={staffUserId}
            onChange={(event) => setStaffUserId(event.target.value)}
            label="Staff member"
          >
            <option value="">Any available staff</option>

            {staff.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.fullName}
              </option>
            ))}
          </Select>
        </FormField>

        <Button
          type="submit"
          fullWidth
          disabled={!valid}
          leftIcon={<CheckCircle2 className="h-4 w-4" />}
        >
          Confirm booking
        </Button>
      </form>
    </Modal>
  );
}

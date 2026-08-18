"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useOnboarding } from "@/hooks/useOnboarding";
import {
  acceptInvitationSchema,
  type AcceptInvitationFormData,
} from "@/lib/validations/onboarding";

// ═══════════════════════════════════════════════════════════════
//  Staff Invitation Accept Form — creates the staff account
//  POST /invitations/{token}/accept
//  The email confirmation is validated server-side against the
//  invitation's invited email (ownership check).
// ═══════════════════════════════════════════════════════════════

interface InvitationAcceptFormProps {
  token: string;
  businessName: string;
  invitedEmail: string;
}

export function InvitationAcceptForm({
  token,
  businessName,
  invitedEmail,
}: InvitationAcceptFormProps) {
  const { acceptInvitation, isLoading, error } = useOnboarding();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(acceptInvitationSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      password: "",
      emailConfirmation: "",
    },
  });

  const password = watch("password", "");

  const requirements = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "1 uppercase letter", met: /[A-Z]/.test(password) },
    { label: "1 number", met: /[0-9]/.test(password) },
    { label: "1 special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const emailMatches = watch("emailConfirmation", "").trim().toLowerCase() === invitedEmail.toLowerCase();

  const onSubmit = (data: AcceptInvitationFormData) => {
    acceptInvitation(token, data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Context */}
      <div className="text-center mb-1">
        <p className="text-sm text-[var(--text-secondary)]">You&apos;re invited to join</p>
        <p className="text-lg font-bold text-[var(--text-primary)]">{businessName}</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Invited email: <span className="font-medium text-[var(--text-secondary)]">{invitedEmail}</span>
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-danger-light text-danger text-sm font-medium px-4 py-3 rounded-2xl animate-scale-in">
          {error}
        </div>
      )}

      <Input
        label="Full name"
        type="text"
        placeholder="Jane Staff"
        autoComplete="name"
        error={errors.fullName?.message}
        {...register("fullName")}
      />

      <Input
        label="Confirm your email"
        type="email"
        placeholder={invitedEmail}
        autoComplete="email"
        error={errors.emailConfirmation?.message}
        extraHint={
          emailMatches
            ? { tone: "ok", text: "Matches the invited address" }
            : undefined
        }
        {...register("emailConfirmation")}
      />

      <Input
        label="Set a password"
        type="password"
        placeholder="••••••••"
        autoComplete="new-password"
        showPasswordToggle
        error={errors.password?.message}
        {...register("password")}
      />

      {password.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 animate-fade-in">
          {requirements.map((req) => (
            <div key={req.label} className="flex items-center gap-1.5 text-xs">
              {req.met ? (
                <Check className="h-3.5 w-3.5 text-ok flex-shrink-0" />
              ) : (
                <X className="h-3.5 w-3.5 text-[var(--text-muted)] flex-shrink-0" />
              )}
              <span
                className={req.met ? "text-ok-text" : "text-[var(--text-tertiary)]"}
              >
                {req.label}
              </span>
            </div>
          ))}
        </div>
      )}

      <Button
        type="submit"
        fullWidth
        size="lg"
        isLoading={isLoading}
        disabled={!isValid}
      >
        Accept Invitation
      </Button>
    </form>
  );
}
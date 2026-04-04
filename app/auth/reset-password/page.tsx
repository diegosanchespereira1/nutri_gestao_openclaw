import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <ResetPasswordForm />
      </div>
    </div>
  );
}

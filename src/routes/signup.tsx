import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import unshelvedLogo from "@/assets/unshelved_logo_transparent.png";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — Unshelved" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: name },
      },
    });
    setBusy(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    track("signup_completed");
    if (data.session) {
      // Auto-confirm is on — user is signed in immediately.
      toast.success("Welcome to Unshelved!");
      navigate({ to: "/" });
      return;
    }
    setSubmittedEmail(email);
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error(result.error.message);
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-card shadow-paper p-8">
        <div className="flex flex-col items-center">
          <img src={unshelvedLogo} alt="Unshelved" width={120} height={120} className="w-[120px] h-auto" />
          <h1 className="mt-2 font-display text-2xl text-terra text-center">Unshelved</h1>
          <p className="mt-1 text-sm text-muted-foreground tracking-wide text-center">Read. Connect. Reflect.</p>
        </div>

        {submittedEmail ? (
          <div className="mt-8 space-y-3">
            <h2 className="font-display text-2xl text-foreground">Check your inbox.</h2>
            <p className="text-sm text-foreground/80">
              We sent a confirmation link to <span className="font-medium">{submittedEmail}</span>. Click it to finish setting up your account.
            </p>
            <p className="text-xs text-muted-foreground">Don't see it? Check your spam folder.</p>
            <p className="pt-4 text-sm text-center text-muted-foreground">
              Have an account? <Link to="/login" className="text-primary underline">Sign in</Link>
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={signUp} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={busy} className="w-full rounded-full">{busy ? "Creating…" : "Create account"}</Button>
              {errorMsg && (
                <p role="alert" className="text-sm text-destructive">{errorMsg}</p>
              )}
            </form>
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" onClick={google} className="w-full rounded-full">Continue with Google</Button>
            <p className="mt-6 text-sm text-center text-muted-foreground">
              Have an account? <Link to="/login" className="text-primary underline">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

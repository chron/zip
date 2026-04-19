import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type AuthFlow = "signIn" | "signUp";

type AuthMenuProps = {
  isAuthenticated: boolean;
  isLoading: boolean;
};

export function AuthMenu({ isAuthenticated, isLoading }: AuthMenuProps) {
  const { signOut } = useAuthActions();
  const viewer = useQuery(api.viewer.current, isAuthenticated ? {} : "skip");
  const label =
    viewer?.name ?? viewer?.email ?? (isAuthenticated ? "Signed in" : "Sign in");

  if (isLoading) {
    return (
      <span className="inline-flex h-8 items-center rounded-md border border-ink/15 bg-paper px-3 text-sm font-semibold text-muted-foreground">
        Checking...
      </span>
    );
  }

  if (!isAuthenticated) {
    return <SignInDialog />;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-40 truncate font-mono text-[10px] uppercase text-muted-foreground sm:inline">
        {label}
      </span>
      <Button
        type="button"
        variant="outline"
        className="border-ink/20 bg-paper text-ink hover:border-ink/50 hover:bg-paper-warm"
        onClick={() => void signOut()}
      >
        Sign out
      </Button>
    </div>
  );
}

function SignInDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="border-ink bg-ink text-paper hover:bg-ink/90"
        >
          Sign in
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-md border border-ink/15 bg-paper">
        <DialogHeader>
          <DialogTitle>Save your runs</DialogTitle>
          <DialogDescription>
            Sign in to keep puzzle progress attached to you.
          </DialogDescription>
        </DialogHeader>
        <PasswordForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<AuthFlow>("signIn");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isSignIn = flow === "signIn";

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setPending(true);

        const formData = new FormData(event.currentTarget);
        void signIn("password", formData)
          .then((result) => {
            if (result.signingIn) onDone();
          })
          .catch((caught: unknown) => {
            setError(
              caught instanceof Error ? caught.message : "Could not sign in",
            );
          })
          .finally(() => setPending(false));
      }}
    >
      <input name="flow" type="hidden" value={flow} />
      <label className="grid gap-1 text-sm font-semibold text-ink">
        Email
        <input
          required
          autoComplete="email"
          className="h-10 rounded-md border border-ink/20 bg-paper-warm px-3 font-sans text-base font-medium text-ink outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/20"
          name="email"
          type="email"
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-ink">
        Password
        <input
          required
          autoComplete={isSignIn ? "current-password" : "new-password"}
          className="h-10 rounded-md border border-ink/20 bg-paper-warm px-3 font-sans text-base font-medium text-ink outline-none focus:border-tomato focus:ring-2 focus:ring-tomato/20"
          minLength={8}
          name="password"
          type="password"
        />
      </label>
      {error && (
        <p className="rounded-md border border-tomato/30 bg-tomato-soft px-3 py-2 text-sm font-medium text-ink">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={pending}
        className="border-ink bg-ink text-paper hover:bg-ink/90"
      >
        {pending ? "Working..." : isSignIn ? "Sign in" : "Create account"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="text-ink hover:bg-paper-warm"
        onClick={() => {
          setError(null);
          setFlow(isSignIn ? "signUp" : "signIn");
        }}
      >
        {isSignIn ? "Create an account" : "Use an existing account"}
      </Button>
    </form>
  );
}

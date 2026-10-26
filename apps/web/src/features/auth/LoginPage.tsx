import { useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReceiptMark } from "@/routes";
import { ME_QUERY_KEY } from "./useMe";

/** Where to go after sign-in: a same-site path only, never another origin (open-redirect guard). */
export function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/agents";
  return raw;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { response } = await api.POST("/v1/auth/login", { body: { email, password } });
      if (response.status === 401) {
        setError("Email or password is incorrect.");
        return;
      }
      if (!response.ok) {
        setError("Sign-in failed. Please try again.");
        return;
      }
      // Reset, not invalidate: the session query is inactive here, so it would keep its stale null.
      await queryClient.resetQueries({ queryKey: ME_QUERY_KEY });
      await navigate(safeNext(searchParams.get("next")));
    } catch {
      setError("Cannot reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <title>Sign in · Agentic Market</title>
      <div className="slip-edge w-full max-w-sm px-6 py-8">
        <div className="mb-6 flex items-center gap-2.5 font-semibold">
          <ReceiptMark />
          Agentic Market
        </div>
        <h1 className="mb-6 text-2xl font-medium tracking-tight">Sign in</h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Email
            <Input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Password
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting} className="mt-2">
            Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}

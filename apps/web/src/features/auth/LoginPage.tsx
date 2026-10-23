import { useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "@/api/client";
import { ME_QUERY_KEY } from "./useMe";

export function LoginPage() {
  const navigate = useNavigate();
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
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
      await navigate("/agents");
    } catch {
      setError("Cannot reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto mt-24 w-full max-w-sm px-4">
      <h1 className="mb-6 text-2xl font-semibold">Sign in</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border px-3 py-2"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}

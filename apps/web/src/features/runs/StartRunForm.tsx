import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ApiError } from "@/features/agents/useAgents";
import { useStartRun } from "./useRun";

const MESSAGES: Record<string, string> = {
  RUN_ALREADY_IN_PROGRESS: "This agent is already shopping. Wait for its run to finish.",
  MANDATE_EXHAUSTED: "Budget used up. This agent cannot buy anything more.",
  MANDATE_EXPIRED: "This agent's mandate has expired.",
  MANDATE_REVOKED: "This agent's mandate was revoked.",
  MANDATE_NOT_ACTIVE: "This agent's mandate is not active.",
  INVALID_REQUEST: "The agent could not understand this request. Try describing the product.",
};

const LENGTH_MESSAGE = "Describe the purchase in 3 to 500 characters.";

export function StartRunForm({ mandateId }: { mandateId: string }) {
  const navigate = useNavigate();
  const startRun = useStartRun(mandateId);
  const [request, setRequest] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fieldId = `run-request-${mandateId}`;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = request.trim();
    if (trimmed.length < 3 || trimmed.length > 500) {
      setError(LENGTH_MESSAGE);
      return;
    }
    setError(null);
    try {
      const run = await startRun.mutateAsync(trimmed);
      await navigate(`/runs/${run.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? (MESSAGES[caught.code] ?? caught.message) : "Cannot reach the server. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-2">
      <Label htmlFor={fieldId}>What should the agent buy?</Label>
      <div className="flex gap-2">
        <Input id={fieldId} value={request} onChange={(e) => setRequest(e.target.value)} aria-invalid={!!error} />
        <Button type="submit" disabled={startRun.isPending}>
          Start run
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}

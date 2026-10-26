import type { ReactNode } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/features/agents/useAgents";

/** The slice of a TanStack query result this component reads. */
export interface QueryLike<T> {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: T | undefined;
  refetch: () => unknown;
}

interface QueryStateProps<T> {
  query: QueryLike<T>;
  /** What is being loaded, as a sentence subject: "Orders", "Order", "Run". */
  resource: string;
  skeleton: ReactNode;
  empty?: ReactNode;
  isEmpty?: (data: T) => boolean;
  notFound?: { to: string; label: string };
  children: (data: T) => ReactNode;
}

/** Loading, error-with-retry, not-found and empty states for one query (spec US1). */
export function QueryState<T>({ query, resource, skeleton, empty, isEmpty, notFound, children }: QueryStateProps<T>) {
  if (query.isPending) return <div aria-busy="true">{skeleton}</div>;

  if (query.isError) {
    if (notFound && query.error instanceof ApiError && query.error.code === "NOT_FOUND") {
      return (
        <div className="flex flex-col items-start gap-3">
          <p>This {resource.toLowerCase()} doesn't exist.</p>
          <Link to={notFound.to} className="font-medium underline underline-offset-4">
            {notFound.label}
          </Link>
        </div>
      );
    }
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3">
        <p>{resource} could not be loaded.</p>
        <Button variant="outline" onClick={() => query.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (query.data === undefined) return null;
  if (empty && isEmpty?.(query.data)) return <>{empty}</>;
  return <>{children(query.data)}</>;
}

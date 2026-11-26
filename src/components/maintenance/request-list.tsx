import Link from "next/link";

import { formatIsoDate } from "@/lib/dates";
import type { RequestSummary } from "@/lib/maintenance/queries";

import { PriorityBadge } from "./priority-badge";
import { StatusBadge } from "./status-badge";

type RequestListProps = {
  requests: RequestSummary[];
  hrefFor: (requestId: string) => string;
  empty: string;
};

export function RequestList({ requests, hrefFor, empty }: RequestListProps) {
  if (requests.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y rounded-md border">
      {requests.map((request) => (
        <li key={request.id}>
          <Link
            href={hrefFor(request.id)}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-muted/50"
          >
            <span className="flex flex-col">
              <span className="font-medium">{request.title}</span>
              <span className="text-muted-foreground">
                {request.propertyName}, {request.unitLabel} · reported {formatIsoDate(request.createdAt.slice(0, 10))}
              </span>
            </span>
            <span className="flex items-center gap-2">
              {request.priority && <PriorityBadge priority={request.priority} />}
              <StatusBadge status={request.status} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

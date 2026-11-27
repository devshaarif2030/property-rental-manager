import { ChevronRight, Wrench } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
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
  if (requests.length === 0) return <EmptyState icon={Wrench} title={empty} />;
  return (
    <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
      {requests.map((request) => (
        <li key={request.id}>
          <Link
            href={hrefFor(request.id)}
            className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm hover:bg-accent/50"
          >
            <span className="flex flex-col">
              <span className="font-semibold">{request.title}</span>
              <span className="text-muted-foreground">
                {request.propertyName}, {request.unitLabel} · reported {formatIsoDate(request.createdAt.slice(0, 10))}
              </span>
            </span>
            <span className="flex items-center gap-2">
              {request.priority && <PriorityBadge priority={request.priority} />}
              <StatusBadge status={request.status} />
              <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

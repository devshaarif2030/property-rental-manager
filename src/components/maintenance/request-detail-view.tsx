import { formatIsoDate } from "@/lib/dates";
import type { RequestDetail } from "@/lib/maintenance/queries";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/maintenance/requests";

import { PriorityBadge } from "./priority-badge";
import { StatusBadge } from "./status-badge";

const timeFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

/** Title, description, photos and the status timeline of one request. */
export function RequestDetailView({ request, unknownAuthor }: { request: RequestDetail; unknownAuthor: string }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {request.propertyName}, {request.unitLabel} · reported {formatIsoDate(request.createdAt.slice(0, 10))}
          {request.tenantName ? ` by ${request.tenantName}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{request.title}</h1>
          <StatusBadge status={request.status} />
          {request.priority && <PriorityBadge priority={request.priority} />}
          {request.category && (
            <span className="text-sm text-muted-foreground">{CATEGORY_LABELS[request.category]}</span>
          )}
        </div>
        <p className="max-w-2xl whitespace-pre-line">{request.description}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Photos</h2>
        {request.photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No photos.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {request.photos.map((photo, index) => (
              <li key={photo.id}>
                <a href={photo.url} target="_blank" rel="noopener noreferrer">
                  {/* Signed URLs expire in minutes, so next/image caching would serve dead links. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={`Photo ${index + 1} of ${request.title}`}
                    className="aspect-square w-full rounded-md border object-cover"
                  />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <ol className="flex flex-col gap-3 border-l pl-4">
          {request.updates.map((update) => (
            <li key={update.id} className="text-sm">
              <p className="text-muted-foreground">
                {timeFormat.format(new Date(update.createdAt))} UTC · {update.authorName ?? unknownAuthor}
              </p>
              {update.status && <p className="font-medium">{STATUS_LABELS[update.status]}</p>}
              {update.note && <p className="whitespace-pre-line">{update.note}</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

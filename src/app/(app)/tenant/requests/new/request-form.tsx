"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormError } from "@/components/form-error";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_PHOTOS_PER_REQUEST } from "@/lib/maintenance/photos";
import { newRequestSchema, type NewRequestInput } from "@/lib/maintenance/requests";
import { resizePhoto } from "@/lib/maintenance/resize-photo";

import { createMaintenanceRequest } from "../actions";

export function RequestForm() {
  const [isPending, startTransition] = useTransition();
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<NewRequestInput>({
    resolver: zodResolver(newRequestSchema),
    defaultValues: { title: "", description: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      let resized: File[];
      try {
        resized = await Promise.all(photos.map(resizePhoto));
      } catch {
        setError("One of the photos could not be read. Use a JPG, PNG or WebP photo.");
        return;
      }
      const formData = new FormData();
      formData.set("title", values.title);
      formData.set("description", values.description);
      resized.forEach((photo) => formData.append("photos", photo));
      // On success the action redirects to the new request and never returns.
      setError((await createMaintenanceRequest(formData)).error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-xl flex-col gap-4">
      <FormField
        id="title"
        label="What is the problem?"
        placeholder="Water leaking from the bathroom ceiling"
        error={errors.title?.message}
        {...form.register("title")}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Details</Label>
        <Textarea
          id="description"
          placeholder="Where is it, when did it start, is it getting worse?"
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "description-error" : undefined}
          {...form.register("description")}
        />
        {errors.description && (
          <p id="description-error" className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="photos">Photos (optional, up to {MAX_PHOTOS_PER_REQUEST})</Label>
        <Input
          id="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > MAX_PHOTOS_PER_REQUEST) {
              setError(`Add up to ${MAX_PHOTOS_PER_REQUEST} photos.`);
              event.target.value = "";
              setPhotos([]);
              return;
            }
            setError(null);
            setPhotos(files);
          }}
        />
        <p className="text-sm text-muted-foreground">Photos are resized and location data is removed before upload.</p>
      </div>
      <FormError message={error} />
      <Button type="submit" className="self-start" disabled={isPending}>
        {isPending ? "Sending..." : "Send request"}
      </Button>
    </form>
  );
}

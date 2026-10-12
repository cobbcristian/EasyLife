"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Page = {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  blocks: { type: string; props: Record<string, unknown> }[];
};

export default function PmWebsitePage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [communityId, setCommunityId] = useState("");

  function load() {
    fetch("/api/website")
      .then((r) => r.json())
      .then((d) => setPages(d.pages ?? []));
    fetch("/api/member/home")
      .then((r) => r.json())
      .then((d) => setCommunityId(d.communityId ?? ""));
  }

  useEffect(() => {
    load();
  }, []);

  async function publish() {
    await fetch("/api/website", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", published: true }),
    });
    load();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Club Website Builder</h1>
          <p className="text-sm text-muted-foreground">
            Drag-and-drop pages — hero, amenities, events — no coding required.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={publish}>Publish website</Button>
          {communityId && (
            <Link href={`/site/${communityId}`} target="_blank">
              <Button variant="outline">Preview</Button>
            </Link>
          )}
        </div>
      </div>

      {pages.map((p) => (
        <Card key={p.id}>
          <CardHeader>
            <CardTitle>
              {p.title}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                /{p.slug}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              {p.blocks.length} blocks · {p.published ? "Published" : "Draft"}
            </p>
            <ul className="space-y-2">
              {p.blocks.map((b, i) => (
                <li
                  key={`${p.id}-${i}`}
                  className="rounded-lg border border-dashed px-3 py-2 text-sm"
                >
                  <span className="font-medium capitalize">{b.type}</span>
                  {b.type === "hero" && (
                    <span className="text-muted-foreground">
                      {" "}
                      — {String(b.props.headline ?? "")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Plus, Search, CheckCircle, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";

type Violation = {
  id: string;
  memberEmail: string;
  memberName: string;
  unit: string;
  category: string;
  title: string;
  description: string;
  status: string;
  fineAmountCents: number;
  dueDate: string | null;
  appealMessage: string | null;
  appealedAt: string | null;
  issuedAt: string;
};

const categories = ["Landscaping", "Parking", "Noise", "Architectural", "Pet", "Trash", "Other"];

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-yellow-100 text-yellow-800" },
  warning: { label: "Warning", color: "bg-orange-100 text-orange-800" },
  fined: { label: "Fine Issued", color: "bg-red-100 text-red-800" },
  appealed: { label: "Under Appeal", color: "bg-blue-100 text-blue-800" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-800" },
  dismissed: { label: "Dismissed", color: "bg-grey-100 text-grey-800" },
};

export default function PmViolationsPage() {
  const { t } = useI18n();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("open");
  const [showForm, setShowForm] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  const [form, setForm] = useState({
    memberEmail: "",
    memberName: "",
    unit: "",
    category: "Parking",
    title: "",
    description: "",
    fineAmountCents: 0,
    dueDate: "",
  });

  useEffect(() => {
    fetchViolations();
  }, []);

  const fetchViolations = () => {
    fetch("/api/violations")
      .then((r) => r.json())
      .then((data) => {
        setViolations(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/violations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        fineAmountCents: Math.round(form.fineAmountCents * 100),
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({
        memberEmail: "",
        memberName: "",
        unit: "",
        category: "Parking",
        title: "",
        description: "",
        fineAmountCents: 0,
        dueDate: "",
      });
      fetchViolations();
    }
  };

  const handleResolve = async (id: string, status: "resolved" | "dismissed") => {
    const res = await fetch(`/api/violations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, resolutionNote }),
    });
    if (res.ok) {
      setResolvingId(null);
      setResolutionNote("");
      fetchViolations();
    }
  };

  const filtered = violations.filter((v) => {
    const matchesSearch =
      !search ||
      v.memberName.toLowerCase().includes(search.toLowerCase()) ||
      v.unit.toLowerCase().includes(search.toLowerCase()) ||
      v.title.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      v.status === filter ||
      (filter === "open" && !["resolved", "dismissed"].includes(v.status));

    return matchesSearch && matchesFilter;
  });

  const openCount = violations.filter((v) => !["resolved", "dismissed"].includes(v.status)).length;
  const appealCount = violations.filter((v) => v.status === "appealed").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("Violation Management")}</h1>
          <p className="text-grey mt-1">
            {t(`${openCount} open violations`)}
            {appealCount > 0 && ` · ${appealCount} appeals pending`}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          {t("Issue Violation")}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t("Issue New Violation")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("Resident Name")}</Label>
                <Input
                  required
                  value={form.memberName}
                  onChange={(e) => setForm({ ...form, memberName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Resident Email")}</Label>
                <Input
                  type="email"
                  required
                  value={form.memberEmail}
                  onChange={(e) => setForm({ ...form, memberEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Unit")}</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Category")}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t("Violation Title")}</Label>
                <Input
                  required
                  placeholder="e.g., Unauthorized vehicle parking"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t("Description")}</Label>
                <Textarea
                  required
                  rows={3}
                  placeholder="Describe the violation in detail..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Fine Amount ($)")}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.fineAmountCents}
                  onChange={(e) => setForm({ ...form, fineAmountCents: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Due Date")}</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit">{t("Issue Violation")}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  {t("Cancel")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4 flex-wrap items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey" />
          <Input
            placeholder={t("Search by name, unit, or title...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">{t("Open")}</SelectItem>
            <SelectItem value="appealed">{t("Appealed")}</SelectItem>
            <SelectItem value="fined">{t("Fined")}</SelectItem>
            <SelectItem value="resolved">{t("Resolved")}</SelectItem>
            <SelectItem value="all">{t("All")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-grey-200 rounded" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-grey">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>{t("No violations found")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((violation) => {
            const config = statusConfig[violation.status] ?? statusConfig.open;
            return (
              <Card key={violation.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{violation.title}</span>
                        <Badge className={config.color}>{config.label}</Badge>
                        <Badge variant="outline">{violation.category}</Badge>
                      </div>
                      <div className="mt-2 text-sm text-grey">
                        <span className="font-medium">{violation.memberName}</span>
                        {violation.unit && <span> · Unit {violation.unit}</span>}
                      </div>
                      <p className="text-sm text-grey mt-1">{violation.description}</p>

                      {violation.fineAmountCents > 0 && (
                        <p className="text-sm font-medium text-red-600 mt-2">
                          {t("Fine")}: ${(violation.fineAmountCents / 100).toFixed(2)}
                        </p>
                      )}

                      {violation.appealMessage && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-blue-800">{t("Appeal")}:</p>
                          <p className="text-sm text-blue-700 mt-1">{violation.appealMessage}</p>
                        </div>
                      )}

                      <p className="text-xs text-grey mt-2">
                        {t("Issued")}: {new Date(violation.issuedAt).toLocaleDateString()}
                      </p>
                    </div>

                    {!["resolved", "dismissed"].includes(violation.status) && (
                      <div className="flex gap-2">
                        {resolvingId === violation.id ? (
                          <div className="space-y-2">
                            <Textarea
                              placeholder={t("Resolution note...")}
                              value={resolutionNote}
                              onChange={(e) => setResolutionNote(e.target.value)}
                              className="w-48"
                              rows={2}
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResolve(violation.id, "resolved")}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {t("Resolve")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleResolve(violation.id, "dismissed")}
                              >
                                {t("Dismiss")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setResolvingId(null);
                                  setResolutionNote("");
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setResolvingId(violation.id)}
                          >
                            {t("Resolve")}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

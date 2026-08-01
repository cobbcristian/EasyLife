"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Clock, DollarSign, MessageSquare } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";

type Violation = {
  id: string;
  category: string;
  title: string;
  description: string;
  photoUrl: string | null;
  status: string;
  fineAmountCents: number;
  dueDate: string | null;
  appealMessage: string | null;
  appealedAt: string | null;
  resolutionNote: string | null;
  issuedAt: string;
};

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-yellow-100 text-yellow-800" },
  warning: { label: "Warning", color: "bg-orange-100 text-orange-800" },
  fined: { label: "Fine Issued", color: "bg-red-100 text-red-800" },
  appealed: { label: "Under Appeal", color: "bg-blue-100 text-blue-800" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-800" },
  dismissed: { label: "Dismissed", color: "bg-grey-100 text-grey-800" },
};

export default function MemberViolationsPage() {
  const { t } = useI18n();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [appealingId, setAppealingId] = useState<string | null>(null);
  const [appealText, setAppealText] = useState("");

  useEffect(() => {
    fetch("/api/violations")
      .then((r) => r.json())
      .then((data) => {
        setViolations(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAppeal = async (id: string) => {
    if (!appealText.trim()) return;

    const res = await fetch(`/api/violations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appealMessage: appealText }),
    });

    if (res.ok) {
      setViolations((prev) =>
        prev.map((v) =>
          v.id === id
            ? { ...v, status: "appealed", appealMessage: appealText, appealedAt: new Date().toISOString() }
            : v
        )
      );
      setAppealingId(null);
      setAppealText("");
    }
  };

  const openViolations = violations.filter(
    (v) => !["resolved", "dismissed"].includes(v.status)
  );
  const totalFines = violations
    .filter((v) => v.status === "fined")
    .reduce((sum, v) => sum + v.fineAmountCents, 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-grey-200 rounded w-48" />
          <div className="h-32 bg-grey-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("My Violations")}</h1>
          <p className="text-grey mt-1">
            {openViolations.length > 0
              ? t(`${openViolations.length} open violation(s)`)
              : t("No open violations")}
          </p>
        </div>
        <AlertTriangle className="h-8 w-8 text-orange-500" />
      </div>

      {totalFines > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-medium text-red-800">
                {t("Outstanding Fines")}: ${(totalFines / 100).toFixed(2)}
              </p>
              <p className="text-sm text-red-600">{t("Please resolve or appeal these violations")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {violations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-grey">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="font-medium text-green-700">{t("No violations on record")}</p>
            <p className="text-sm mt-1">{t("Your account is in good standing")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {violations.map((violation) => {
            const config = statusConfig[violation.status] ?? statusConfig.open;
            const canAppeal =
              !violation.appealedAt &&
              !["resolved", "dismissed"].includes(violation.status);

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
                      <p className="text-sm text-grey mt-2">{violation.description}</p>

                      {violation.fineAmountCents > 0 && (
                        <p className="text-sm font-medium text-red-600 mt-2">
                          {t("Fine")}: ${(violation.fineAmountCents / 100).toFixed(2)}
                          {violation.dueDate && ` · ${t("Due")}: ${violation.dueDate}`}
                        </p>
                      )}

                      {violation.photoUrl && (
                        <img
                          src={violation.photoUrl}
                          alt="Violation evidence"
                          className="mt-3 rounded-lg max-h-48 object-cover"
                        />
                      )}

                      {violation.appealMessage && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-blue-800">{t("Your Appeal")}:</p>
                          <p className="text-sm text-blue-700 mt-1">{violation.appealMessage}</p>
                        </div>
                      )}

                      {violation.resolutionNote && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm font-medium text-green-800">{t("Resolution")}:</p>
                          <p className="text-sm text-green-700 mt-1">{violation.resolutionNote}</p>
                        </div>
                      )}

                      <p className="text-xs text-grey mt-3">
                        {t("Issued")}: {new Date(violation.issuedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {canAppeal && appealingId !== violation.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setAppealingId(violation.id)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {t("Appeal This Violation")}
                    </Button>
                  )}

                  {appealingId === violation.id && (
                    <div className="mt-4 space-y-3">
                      <Textarea
                        placeholder={t("Explain why you believe this violation should be reconsidered...")}
                        value={appealText}
                        onChange={(e) => setAppealText(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAppeal(violation.id)}>
                          {t("Submit Appeal")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAppealingId(null);
                            setAppealText("");
                          }}
                        >
                          {t("Cancel")}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

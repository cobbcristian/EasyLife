"use client";

import { useState, useEffect } from "react";
import { Search, HelpCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

type Article = {
  id: string;
  category: string;
  question: string;
  answer: string;
  views: number;
};

const categoryIcons: Record<string, string> = {
  General: "📋",
  Amenities: "🏊",
  Payments: "💳",
  Rules: "📜",
  Parking: "🚗",
  Pets: "🐕",
  Architectural: "🏠",
  "Move-In": "📦",
  Security: "🔒",
  Events: "🎉",
};

export default function MemberFaqPage() {
  const { t } = useI18n();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/knowledge")
      .then((r) => r.json())
      .then((data) => {
        setArticles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = [...new Set(articles.map((a) => a.category))];

  const filtered = articles.filter((a) => {
    const matchesSearch =
      !search ||
      a.question.toLowerCase().includes(search.toLowerCase()) ||
      a.answer.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || a.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedByCategory = filtered.reduce(
    (acc, article) => {
      if (!acc[article.category]) {
        acc[article.category] = [];
      }
      acc[article.category].push(article);
      return acc;
    },
    {} as Record<string, Article[]>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-grey-200 rounded w-48" />
          <div className="h-12 bg-grey-200 rounded" />
          <div className="h-32 bg-grey-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("Help & FAQ")}</h1>
          <p className="text-grey mt-1">{t("Find answers to common questions")}</p>
        </div>
        <HelpCircle className="h-8 w-8 text-brand" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey" />
        <Input
          placeholder={t("Search for answers...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <Badge
          variant={selectedCategory === null ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setSelectedCategory(null)}
        >
          {t("All")}
        </Badge>
        {categories.map((cat) => (
          <Badge
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(cat)}
          >
            {categoryIcons[cat] ?? "📌"} {cat}
          </Badge>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-grey">
            <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>{t("No articles found")}</p>
            <p className="text-sm mt-1">{t("Try a different search term")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByCategory).map(([category, categoryArticles]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>{categoryIcons[category] ?? "📌"}</span>
                {category}
                <Badge variant="outline" className="ml-2">
                  {categoryArticles.length}
                </Badge>
              </h2>
              <div className="space-y-2">
                {categoryArticles.map((article) => {
                  const isExpanded = expandedId === article.id;
                  return (
                    <Card
                      key={article.id}
                      className="cursor-pointer hover:border-brand transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : article.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-brand mt-0.5 shrink-0" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-grey mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{article.question}</p>
                            {isExpanded && (
                              <div className="mt-3 text-grey whitespace-pre-wrap">
                                {article.answer}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

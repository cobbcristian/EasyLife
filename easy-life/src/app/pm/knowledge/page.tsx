"use client";

import { useState, useEffect } from "react";
import { HelpCircle, Plus, Search, Edit2, Trash2, Eye, EyeOff } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";

type Article = {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string;
  sortOrder: number;
  views: number;
  published: boolean;
};

const categories = [
  "General",
  "Amenities",
  "Payments",
  "Rules",
  "Parking",
  "Pets",
  "Architectural",
  "Move-In",
  "Security",
  "Events",
];

export default function PmKnowledgePage() {
  const { t } = useI18n();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    category: "General",
    question: "",
    answer: "",
    keywords: "",
    sortOrder: 0,
    published: true,
  });

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = () => {
    fetch("/api/knowledge?includeUnpublished=true")
      .then((r) => r.json())
      .then((data) => {
        setArticles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/knowledge/${editingId}` : "/api/knowledge";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      resetForm();
      fetchArticles();
    }
  };

  const handleEdit = (article: Article) => {
    setForm({
      category: article.category,
      question: article.question,
      answer: article.answer,
      keywords: article.keywords,
      sortOrder: article.sortOrder,
      published: article.published,
    });
    setEditingId(article.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("Are you sure you want to delete this article?"))) return;

    const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchArticles();
    }
  };

  const handleTogglePublish = async (article: Article) => {
    const res = await fetch(`/api/knowledge/${article.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !article.published }),
    });
    if (res.ok) {
      fetchArticles();
    }
  };

  const resetForm = () => {
    setForm({
      category: "General",
      question: "",
      answer: "",
      keywords: "",
      sortOrder: 0,
      published: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const filtered = articles.filter((a) => {
    const matchesSearch =
      !search ||
      a.question.toLowerCase().includes(search.toLowerCase()) ||
      a.answer.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === "all" || a.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const publishedCount = articles.filter((a) => a.published).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("Knowledge Base")}</h1>
          <p className="text-grey mt-1">
            {t(`${publishedCount} published articles`)}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          {t("Add Article")}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? t("Edit Article") : t("Add New Article")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
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
                <div className="space-y-2">
                  <Label>{t("Sort Order")}</Label>
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("Question")}</Label>
                <Input
                  required
                  placeholder="e.g., How do I reserve the pool?"
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Answer")}</Label>
                <Textarea
                  required
                  rows={5}
                  placeholder="Provide a detailed answer..."
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Keywords")} ({t("comma-separated")})</Label>
                <Input
                  placeholder="e.g., pool, reservation, booking, swim"
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="published"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="published">{t("Published (visible to members)")}</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingId ? t("Save Changes") : t("Add Article")}</Button>
                <Button type="button" variant="outline" onClick={resetForm}>
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
            placeholder={t("Search articles...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("All Categories")}</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-grey-200 rounded" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-grey">
            <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>{t("No articles found")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-grey">
                <th className="p-3">{t("Question")}</th>
                <th className="p-3">{t("Category")}</th>
                <th className="p-3">{t("Views")}</th>
                <th className="p-3">{t("Status")}</th>
                <th className="p-3">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((article) => (
                <tr key={article.id} className="border-b hover:bg-grey-50">
                  <td className="p-3">
                    <div className="font-medium line-clamp-1">{article.question}</div>
                    <div className="text-grey text-xs line-clamp-1 mt-1">{article.answer}</div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{article.category}</Badge>
                  </td>
                  <td className="p-3 text-grey">{article.views}</td>
                  <td className="p-3">
                    {article.published ? (
                      <Badge className="bg-green-100 text-green-800">{t("Published")}</Badge>
                    ) : (
                      <Badge className="bg-grey-100 text-grey-800">{t("Draft")}</Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTogglePublish(article)}
                        title={article.published ? t("Unpublish") : t("Publish")}
                      >
                        {article.published ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(article)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => handleDelete(article.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

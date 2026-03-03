import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { isDashboardAuthenticated } from "@/utils/auth";

const emptyForm = {
  name: "",
  unit: "",
  description: "",
};

export default function Page() {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [variables, setVariables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const title = useMemo(() => {
    return editingId ? "Edit Indicator" : "Add Indicator";
  }, [editingId]);

  const fetchVariables = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/variables");
      if (!response.ok) {
        throw new Error("Failed to fetch variables");
      }
      const data = await response.json();
      setVariables(data.variables || []);
    } catch (fetchError) {
      setError("Failed to load indicators.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isDashboardAuthenticated()) {
      navigate("/login", { replace: true });
      return;
    }

    setAuthReady(true);
  }, [navigate]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    fetchVariables();
  }, [authReady]);

  if (!authReady) {
    return null;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.unit.trim()) {
      setError("Name and unit are required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const isEdit = Boolean(editingId);
      const response = await fetch(
        isEdit ? `/api/variables/${editingId}` : "/api/variables",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );

      if (!response.ok) {
        throw new Error("Save failed");
      }

      setForm(emptyForm);
      setEditingId(null);
      await fetchVariables();
    } catch (saveError) {
      setError("Failed to save indicator.");
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (variable) => {
    setEditingId(variable.id);
    setForm({
      name: variable.name || "",
      unit: variable.unit || "",
      description: variable.description || "",
    });
    setError("");
  };

  const onDelete = async (id) => {
    const confirmed = window.confirm("Delete this indicator?");
    if (!confirmed) {
      return;
    }

    setError("");
    try {
      const response = await fetch(`/api/variables/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Delete failed");
      }

      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
      }

      await fetchVariables();
    } catch (deleteError) {
      setError("Failed to delete indicator.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="h-[36px] px-4 rounded-lg border border-[#D0D3DA] bg-white text-[12px] font-medium text-[#4B4E59] hover:text-[#1A1A1A] flex items-center gap-2"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </button>
          <h1 className="text-[18px] md:text-[22px] font-semibold text-[#1A1A1A]">
            Manage Indicators
          </h1>
        </div>

        <div className="bg-white border border-[#E8E9EF] rounded-lg p-4 md:p-6">
          <h2 className="text-[14px] font-medium text-[#1A1A1A] mb-4">{title}</h2>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] text-[#8F93A1] mb-2 block">Name</label>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full h-[40px] px-4 border border-[#E4E6EB] rounded-lg text-[14px] text-[#1A1A1A]"
                placeholder="e.g. Inflation Rate"
              />
            </div>

            <div>
              <label className="text-[12px] text-[#8F93A1] mb-2 block">Unit</label>
              <input
                value={form.unit}
                onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))}
                className="w-full h-[40px] px-4 border border-[#E4E6EB] rounded-lg text-[14px] text-[#1A1A1A]"
                placeholder="e.g. %"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[12px] text-[#8F93A1] mb-2 block">Description</label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                className="w-full min-h-[90px] p-3 border border-[#E4E6EB] rounded-lg text-[14px] text-[#1A1A1A]"
                placeholder="Optional description"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="h-[36px] px-4 rounded-lg bg-[#2962FF] text-white text-[12px] font-medium disabled:opacity-50 flex items-center gap-2"
              >
                <Plus size={14} />
                {editingId ? "Update" : "Create"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                    setError("");
                  }}
                  className="h-[36px] px-4 rounded-lg border border-[#D0D3DA] bg-white text-[12px] font-medium text-[#4B4E59]"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
          {error && (
            <div className="mt-4 p-3 bg-[#FEE] border border-[#FCC] rounded-lg text-[12px] text-[#C00]">
              {error}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#E8E9EF] rounded-lg p-4 md:p-6">
          <h2 className="text-[14px] font-medium text-[#1A1A1A] mb-4">Indicators</h2>

          {loading ? (
            <div className="text-[14px] text-[#8F93A1]">Loading indicators...</div>
          ) : variables.length === 0 ? (
            <div className="text-[14px] text-[#8F93A1]">No indicators yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="h-[40px] border-b border-[#E4E6EB]">
                    <th className="text-left text-[12px] font-semibold text-[#8F93A1]">Name</th>
                    <th className="text-left text-[12px] font-semibold text-[#8F93A1]">Unit</th>
                    <th className="text-left text-[12px] font-semibold text-[#8F93A1]">Description</th>
                    <th className="text-right text-[12px] font-semibold text-[#8F93A1]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {variables.map((variable) => (
                    <tr key={variable.id} className="border-b border-[#F5F6F9]">
                      <td className="py-3 text-[12px] text-[#1A1A1A]">{variable.name}</td>
                      <td className="py-3 text-[12px] text-[#1A1A1A]">{variable.unit}</td>
                      <td className="py-3 text-[12px] text-[#4B4E59]">{variable.description || "-"}</td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => onEdit(variable)}
                            className="h-[30px] w-[30px] rounded-md border border-[#D0D3DA] text-[#4B4E59] inline-flex items-center justify-center"
                            title="Edit"
                            aria-label="Edit"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => onDelete(variable.id)}
                            className="h-[30px] w-[30px] rounded-md border border-[#F7C8C8] text-[#C00] inline-flex items-center justify-center"
                            title="Delete"
                            aria-label="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

const FoodManagement = () => {
  const [foods, setFoods] = useState([]);
  const [form, setForm] = useState({ name: "", price: "", barcode: "" });
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const fetchFoods = async () => {
    const res = await fetch("/api/food");
    const data = await res.json();
    setFoods(data);
  };

  useEffect(() => {
    fetchFoods();
  }, []);

  const openAddModal = () => {
    setEditId(null);
    setForm({ name: "", price: "", barcode: "" });
    setShowModal(true);
    setError("");
    setSuccess("");
  };

  const openEditModal = (food) => {
    setEditId(food._id);
    setForm({ name: food.name, price: food.price, barcode: food.barcode || "" });
    setShowModal(true);
    setError("");
    setSuccess("");
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm({ name: "", price: "", barcode: "" });
    setError("");
    setSuccess("");
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `/api/food/${editId}` : "/api/food";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, price: Number(form.price), barcode: form.barcode }),
      });
      if (!res.ok) throw new Error("Failed to save food item");
      setSuccess(editId ? "Food updated" : "Food added");
      closeModal();
      fetchFoods();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this food item?")) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/food/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setSuccess("Deleted");
      fetchFoods();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="p-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Food Management</h1>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={openAddModal}
          >
            + Add Food Item
          </button>
        </div>
        {/* Search input */}
        <div className="mb-4 flex items-center gap-4">
          <input
            type="text"
            className="border rounded px-3 py-2 w-full max-w-xs"
            placeholder="Search by name or barcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        {success && <div className="text-green-600 mb-2">{success}</div>}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded shadow text-sm">
            <thead>
              <tr className="bg-blue-100">
                <th className="py-2 px-4 border">Name</th>
                <th className="py-2 px-4 border">Price</th>
                <th className="py-2 px-4 border">Barcode</th>
                <th className="py-2 px-4 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {foods.filter(f => {
                const q = search.trim().toLowerCase();
                if (!q) return true;
                return (
                  f.name.toLowerCase().includes(q) ||
                  (f.barcode && f.barcode.toLowerCase().includes(q))
                );
              }).map(f => (
                <tr key={f._id} className="text-center">
                  <td className="py-2 px-4 border">{f.name}</td>
                  <td className="py-2 px-4 border">{f.price}</td>
                  <td className="py-2 px-4 border">{f.barcode}</td>
                  <td className="py-2 px-4 border">
                    <button className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 mr-2" onClick={() => openEditModal(f)} disabled={loading}>Edit</button>
                    <button className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700" onClick={() => handleDelete(f._id)} disabled={loading}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Modal for Add/Edit Food */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white p-6 rounded shadow w-full max-w-sm">
              <h2 className="text-xl font-bold mb-4">{editId ? "Edit Food Item" : "Add Food Item"}</h2>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block mb-1 font-medium">Name</label>
                  <input name="name" value={form.name} onChange={handleChange} className="w-full px-3 py-2 border rounded" required />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Price</label>
                  <input name="price" type="number" value={form.price} onChange={handleChange} className="w-full px-3 py-2 border rounded" required min="0" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Barcode</label>
                  <input name="barcode" value={form.barcode} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
                </div>
                {error && <div className="text-red-500 text-sm">{error}</div>}
                <div className="flex gap-2 justify-end">
                  <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>{editId ? "Update" : "Add"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default FoodManagement; 
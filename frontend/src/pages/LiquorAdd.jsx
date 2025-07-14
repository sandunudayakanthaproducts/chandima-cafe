import React, { useState } from "react";
import Navbar from "../components/Navbar";

const LiquorAdd = () => {
  const [form, setForm] = useState({
    brand: "",
    size: "",
    barcode: "",
    price: "",
    shotPrice: "",
  });
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/liquor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          size: Number(form.size),
          price: Number(form.price),
          shotPrice: Number(form.shotPrice),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Error adding liquor");
      } else {
        setSuccess("Liquor added successfully!");
        setForm({ brand: "", size: "", barcode: "", price: "", shotPrice: "" });
      }
    } catch (err) {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="p-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Add New Liquor</h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block mb-1 font-medium">Brand</label>
            <input name="brand" value={form.brand} onChange={handleChange} className="w-full px-3 py-2 border rounded" required />
          </div>
          <div>
            <label className="block mb-1 font-medium">Bottle Size (ml)</label>
            <input name="size" type="number" value={form.size} onChange={handleChange} className="w-full px-3 py-2 border rounded" required />
          </div>
          <div>
            <label className="block mb-1 font-medium">Barcode</label>
            <input name="barcode" value={form.barcode} onChange={handleChange} className="w-full px-3 py-2 border rounded" required />
          </div>
          <div>
            <label className="block mb-1 font-medium">Bottle Price</label>
            <input name="price" type="number" value={form.price} onChange={handleChange} className="w-full px-3 py-2 border rounded" required />
          </div>
          <div>
            <label className="block mb-1 font-medium">Shot Price (per 50ml)</label>
            <input name="shotPrice" type="number" value={form.shotPrice} onChange={handleChange} className="w-full px-3 py-2 border rounded" required />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" disabled={loading}>
            {loading ? "Adding..." : "Add Liquor"}
          </button>
        </form>
      </div>
    </>
  );
};

export default LiquorAdd; 
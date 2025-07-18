import React, { useEffect, useState, useRef } from "react";
import Navbar from "../components/Navbar";

const emptyIngredient = { liquorId: "", brand: "", volume: "" };

const CocktailManagement = () => {
  const [cocktails, setCocktails] = useState([]);
  const [liquors, setLiquors] = useState([]);
  const [form, setForm] = useState({ name: "", barcode: "", price: "", ingredients: [ { ...emptyIngredient } ] });
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState([]); // [{ value: '', open: false }]
  const ingredientRefs = useRef([]);

  // Fetch Store 2 liquors for dropdown
  const fetchLiquors = async () => {
    try {
      const res = await fetch("/api/inventory?store=2");
      const data = await res.json();
      setLiquors(
        data
          .filter(row => row.liquor && row.liquor._id)
          .map(row => ({
            id: row.liquor._id,
            brand: row.liquor.brand,
            size: row.liquor.size
          }))
      );
    } catch {}
  };

  // Fetch cocktails
  const fetchCocktails = async () => {
    try {
      const res = await fetch("/api/cocktail");
      const data = await res.json();
      setCocktails(data);
    } catch {}
  };

  useEffect(() => {
    fetchLiquors();
    fetchCocktails();
  }, []);

  const openAddModal = () => {
    setEditId(null);
    setForm({ name: "", barcode: "", price: "", ingredients: [ { ...emptyIngredient } ] });
    setShowModal(true);
    setError("");
    setSuccess("");
  };

  const openEditModal = (cocktail) => {
    setEditId(cocktail._id);
    setForm({
      name: cocktail.name,
      barcode: cocktail.barcode || "",
      price: cocktail.price,
      ingredients: cocktail.ingredients.map(ing => ({
        liquorId: ing.liquorId,
        brand: ing.brand,
        volume: ing.volume
      }))
    });
    setShowModal(true);
    setError("");
    setSuccess("");
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm({ name: "", barcode: "", price: "", ingredients: [ { ...emptyIngredient } ] });
    setError("");
    setSuccess("");
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Helper to get liquor label
  const getLiquorLabel = (l) => `${l.brand} (${l.size}ml)`;

  // Update handleIngredientChange to also update search text
  const handleIngredientChange = (idx, field, value) => {
    const updated = form.ingredients.map((ing, i) =>
      i === idx ? { ...ing, [field]: value, ...(field === "liquorId" ? { brand: liquors.find(l => l.id === value)?.brand || "" } : {}) } : ing
    );
    setForm({ ...form, ingredients: updated });
    if (field === "liquorId") {
      setIngredientSearch(prev => {
        const arr = [...prev];
        arr[idx] = { value: getLiquorLabel(liquors.find(l => l.id === value) || { brand: '', size: '' }), open: false };
        return arr;
      });
    }
  };

  // Handle search input change
  const handleIngredientSearchChange = (idx, value) => {
    setIngredientSearch(prev => {
      const arr = [...prev];
      arr[idx] = { value, open: true };
      return arr;
    });
    // Clear liquorId if text is changed
    setForm(f => ({
      ...f,
      ingredients: f.ingredients.map((ing, i) => i === idx ? { ...ing, liquorId: '', brand: '' } : ing)
    }));
  };

  // Handle selecting a liquor from dropdown
  const handleSelectLiquor = (idx, liquor) => {
    handleIngredientChange(idx, "liquorId", liquor.id);
    setIngredientSearch(prev => {
      const arr = [...prev];
      arr[idx] = { value: getLiquorLabel(liquor), open: false };
      return arr;
    });
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClick = (e) => {
      if (!ingredientRefs.current) return;
      ingredientRefs.current.forEach((ref, idx) => {
        if (ref && !ref.contains(e.target)) {
          setIngredientSearch(prev => {
            const arr = [...prev];
            if (arr[idx]) arr[idx].open = false;
            return arr;
          });
        }
      });
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const addIngredient = () => {
    setForm({ ...form, ingredients: [ ...form.ingredients, { ...emptyIngredient } ] });
  };

  const removeIngredient = (idx) => {
    setForm({ ...form, ingredients: form.ingredients.filter((_, i) => i !== idx) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      // Validate
      if (!form.name || !form.price || form.ingredients.length === 0 || form.ingredients.some(ing => !ing.liquorId || !ing.volume)) {
        setError("Please fill all required fields and add at least one ingredient.");
        setLoading(false);
        return;
      }
      const payload = {
        name: form.name,
        barcode: form.barcode || undefined,
        price: Number(form.price),
        ingredients: form.ingredients.map(ing => ({
          liquorId: ing.liquorId,
          brand: ing.brand,
          volume: Number(ing.volume)
        }))
      };
      let res, data;
      if (editId) {
        res = await fetch(`/api/cocktail?id=${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.message || "Error updating cocktail");
        setSuccess("Cocktail updated successfully!");
      } else {
        res = await fetch("/api/cocktail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.message || "Error creating cocktail");
        setSuccess("Cocktail created successfully!");
      }
      fetchCocktails();
      closeModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this cocktail?")) return;
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch(`/api/cocktail?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error deleting cocktail");
      setSuccess("Cocktail deleted successfully!");
      fetchCocktails();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Cocktail Management</h1>
        <button className="mb-4 bg-blue-600 text-white px-4 py-2 rounded-3xl" onClick={openAddModal}>Add Cocktail</button>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        {success && <div className="text-green-600 mb-2">{success}</div>}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-900 border rounded shadow text-sm mb-6">
            <thead>
              <tr className="bg-gray-900">
                <th className="py-2 px-4 border">Name</th>
                <th className="py-2 px-4 border">Barcode</th>
                <th className="py-2 px-4 border">Price</th>
                <th className="py-2 px-4 border">Ingredients</th>
                <th className="py-2 px-4 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cocktails.map(cocktail => (
                <tr key={cocktail._id} className="text-center">
                  <td className="py-2 px-4 border font-semibold">{cocktail.name}</td>
                  <td className="py-2 px-4 border">{cocktail.barcode}</td>
                  <td className="py-2 px-4 border">{cocktail.price}</td>
                  <td className="py-2 px-4 border text-xs">
                    {cocktail.ingredients.map((ing, idx) => (
                      <div key={idx}>{ing.brand} ({ing.volume}ml)</div>
                    ))}
                  </td>
                  <td className="py-2 px-4 border">
                    <button className="bg-green-600 text-white px-2 py-1 rounded-3xl mr-2" onClick={() => openEditModal(cocktail)}>Edit</button>
                    <button className="bg-red-500 text-white px-2 py-1 rounded-3xl" onClick={() => handleDelete(cocktail._id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {cocktails.length === 0 && <tr><td colSpan={5} className="py-4 text-gray-500">No cocktails defined.</td></tr>}
            </tbody>
          </table>
        </div>
        {/* Modal for add/edit */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-gray-900 p-6 rounded shadow w-full max-w-lg relative">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={closeModal}>&times;</button>
              <h2 className="text-xl font-bold mb-4">{editId ? "Edit Cocktail" : "Add Cocktail"}</h2>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block mb-1 font-medium">Name</label>
                  <input type="text" name="name" value={form.name} onChange={handleChange} className="w-full px-3 py-2 border rounded-3xl" required />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Barcode</label>
                  <input type="text" name="barcode" value={form.barcode} onChange={handleChange} className="w-full px-3 py-2 border rounded-3xl" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Price</label>
                  <input type="number" name="price" value={form.price} onChange={handleChange} className="w-full px-3 py-2 border rounded-3xl" required min="0" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Ingredients</label>
                  {form.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 items-center" ref={el => ingredientRefs.current[idx] = el}>
                      <div className="relative w-40">
                        <input
                          type="text"
                          className="px-2 py-1 border rounded-3xl w-full"
                          placeholder="Search liquor"
                          value={ingredientSearch[idx]?.value || (ing.liquorId ? getLiquorLabel(liquors.find(l => l.id === ing.liquorId) || { brand: '', size: '' }) : '')}
                          onChange={e => handleIngredientSearchChange(idx, e.target.value)}
                          onFocus={() => setIngredientSearch(prev => { const arr = [...prev]; arr[idx] = { value: arr[idx]?.value || '', open: true }; return arr; })}
                          required
                        />
                        {ingredientSearch[idx]?.open && (ingredientSearch[idx].value?.length > 0 || liquors.length > 0) && (
                          <div className="absolute z-10 bg-gray-900 border rounded-2xl w-full max-h-40 overflow-y-auto shadow">
                            {liquors.filter(l => getLiquorLabel(l).toLowerCase().includes((ingredientSearch[idx]?.value || '').toLowerCase())).map(l => (
                              <div
                                key={l.id}
                                className="px-2 py-1 hover:bg-blue-100 cursor-pointer"
                                onClick={() => handleSelectLiquor(idx, l)}
                              >
                                {getLiquorLabel(l)}
                              </div>
                            ))}
                            {liquors.filter(l => getLiquorLabel(l).toLowerCase().includes((ingredientSearch[idx]?.value || '').toLowerCase())).length === 0 && (
                              <div className="px-2 py-1 text-gray-400">No results</div>
                            )}
                          </div>
                        )}
                      </div>
                      <input
                        type="number"
                        className="px-2 py-1 border rounded-3xl "
                        placeholder="Volume (ml)"
                        value={ing.volume}
                        min="1"
                        onChange={e => handleIngredientChange(idx, "volume", e.target.value)}
                        required
                      />
                      <button type="button" className="text-red-500 text-lg font-bold" onClick={() => removeIngredient(idx)} disabled={form.ingredients.length === 1}>×</button>
                    </div>
                  ))}
                  <button type="button" className="bg-blue-500 text-white px-2 py-1 rounded-3xl mt-1" onClick={addIngredient}>Add Ingredient</button>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded-3xl" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-3xl" disabled={loading}>{loading ? (editId ? "Updating..." : "Creating...") : (editId ? "Update" : "Create")}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CocktailManagement; 
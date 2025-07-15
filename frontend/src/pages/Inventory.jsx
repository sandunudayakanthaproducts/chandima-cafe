import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";

const SHOT_SIZES = [25, 50, 100, 120, 180];

// Helper to ensure only numbers (as string) are allowed in shot size input
function sanitizeNumberInput(val) {
  return val.replace(/[^0-9]/g, "");
}

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [store2Map, setStore2Map] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [form, setForm] = useState({ brand: "", size: "", barcode: "", price: "", bottles: "", shotPrices: {} });
  const [editRow, setEditRow] = useState(null);
  const [transferRow, setTransferRow] = useState(null);
  const [transferQty, setTransferQty] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [customShotSizes, setCustomShotSizes] = useState([]);

  // Fetch inventory for Store 1 and Store 2
  const fetchInventories = async () => {
    const [res1, res2] = await Promise.all([
      fetch("/api/inventory?store=1"),
      fetch("/api/inventory?store=2"),
    ]);
    const data1 = await res1.json();
    const data2 = await res2.json();
    setInventory(data1);
    // Map liquorId to bottles for Store 2
    const s2map = {};
    data2.forEach(row => {
      if (row.liquor) {
        s2map[row.liquor._id] = row.bottles;
      }
    });
    setStore2Map(s2map);
  };

  useEffect(() => {
    fetchInventories();
  }, []);

  // Add Liquor + Inventory
  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      // 1. Create liquor
      const liquorRes = await fetch("/api/liquor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: form.brand,
          size: Number(form.size),
          barcode: form.barcode,
          price: Number(form.price),
          shotPrices: form.shotPrices,
        }),
      });
      const liquorData = await liquorRes.json();
      if (!liquorRes.ok) throw new Error(liquorData.message || "Error adding liquor");
      // 2. Add inventory for Store 1
      const invRes = await fetch("/api/inventory/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liquorId: liquorData.liquor._id,
          store: 1,
          bottles: Number(form.bottles),
        }),
      });
      const invData = await invRes.json();
      if (!invRes.ok) throw new Error(invData.message || "Error adding inventory");
      setSuccess("Liquor added to Store 1");
      setShowAddModal(false);
      setForm({ brand: "", size: "", barcode: "", price: "", bottles: "", shotPrices: {} });
      fetchInventories();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit Liquor + Inventory
  const handleEdit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      // 1. Update liquor
      const liquorRes = await fetch(`/api/liquor/${editRow.liquor._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: form.brand,
          size: Number(form.size),
          barcode: form.barcode,
          price: Number(form.price),
          shotPrices: form.shotPrices,
        }),
      });
      const liquorData = await liquorRes.json();
      if (!liquorRes.ok) throw new Error(liquorData.message || "Error updating liquor");
      // 2. Update inventory
      const invRes = await fetch(`/api/inventory/${editRow._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bottles: Number(form.bottles) }),
      });
      const invData = await invRes.json();
      if (!invRes.ok) throw new Error(invData.message || "Error updating inventory");
      setSuccess("Liquor and quantity updated");
      setShowEditModal(false);
      setEditRow(null);
      fetchInventories();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Liquor + Inventory
  const handleDelete = async (row) => {
    if (!window.confirm("Delete this liquor and its inventory?")) return;
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await fetch(`/api/liquor/${row.liquor._id}`, { method: "DELETE" });
      await fetch(`/api/inventory/${row._id}`, { method: "DELETE" });
      setSuccess("Liquor and inventory deleted");
      fetchInventories();
    } catch (err) {
      setError("Error deleting");
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal with row data
  const openEdit = (row) => {
    setEditRow(row);
    setForm({
      brand: row.liquor.brand,
      size: row.liquor.size,
      barcode: row.liquor.barcode,
      price: row.liquor.price,
      bottles: row.bottles,
      shotPrices: row.liquor.shotPrices || {},
    });
    // Detect custom shot sizes for editing
    const allSizes = Object.keys(row.liquor.shotPrices || {});
    const custom = allSizes.filter(size => !SHOT_SIZES.includes(Number(size)));
    setCustomShotSizes(custom);
    setShowEditModal(true);
  };

  // Handle shot price change
  const handleShotPriceChange = (size, value) => {
    setForm((prev) => ({
      ...prev,
      shotPrices: { ...prev.shotPrices, [size]: value },
    }));
  };

  // Open transfer modal
  const openTransfer = (row) => {
    setTransferRow(row);
    setTransferQty(1);
    setShowTransferModal(true);
    setError("");
    setSuccess("");
  };

  // Handle transfer submit
  const handleTransfer = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liquorId: transferRow.liquor._id,
          quantity: Number(transferQty),
          user: "admin", // Replace with real user if available
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error transferring");
      setSuccess("Transfer complete");
      setShowTransferModal(false);
      fetchInventories();
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
          <h1 className="text-3xl font-bold">Inventory</h1>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => { setShowAddModal(true); setForm({ brand: "", size: "", barcode: "", price: "", bottles: "", shotPrices: {} }); setCustomShotSizes([]); }}
          >
            + Add Liquor to Store 1
          </button>
        </div>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        {success && <div className="text-green-600 mb-2">{success}</div>}
        <div className="overflow-x-auto">
          {/* Search input */}
          <div className="mb-4 flex items-center gap-4">
            <input
              type="text"
              className="border rounded px-3 py-2 w-full max-w-xs"
              placeholder="Search by brand or barcode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <table className="min-w-full bg-white border rounded shadow">
            <thead>
              <tr className="bg-blue-100">
                <th className="py-2 px-4 border">Brand</th>
                <th className="py-2 px-4 border">Bottle Size (ml)</th>
                <th className="py-2 px-4 border">Barcode</th>
                <th className="py-2 px-4 border">Price</th>
                <th className="py-2 px-4 border">Store 1 Qty</th>
                <th className="py-2 px-4 border">Store 2 Qty</th>
                <th className="py-2 px-4 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.filter(row => {
                if (!row || !row.liquor) return false;
                const q = search.trim().toLowerCase();
                if (!q) return true;
                return (
                  row.liquor.brand.toLowerCase().includes(q) ||
                  (row.liquor.barcode && row.liquor.barcode.toLowerCase().includes(q))
                );
              }).map((row) => (
                <tr key={row._id} className="text-center">
                  <td className="py-2 px-4 border">{row.liquor.brand}</td>
                  <td className="py-2 px-4 border">{row.liquor.size}</td>
                  <td className="py-2 px-4 border">{row.liquor.barcode}</td>
                  <td className="py-2 px-4 border">{row.liquor.price}</td>
                  <td className="py-2 px-4 border">{row.bottles}</td>
                  <td className="py-2 px-4 border">{store2Map[row.liquor._id] || 0}</td>
                  <td className="py-2 px-4 border flex gap-2 justify-center">
                    <button className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600" onClick={() => openEdit(row)}>Edit</button>
                    <button className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700" onClick={() => handleDelete(row)}>Delete</button>
                    <button className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700" onClick={() => openTransfer(row)}>Transfer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white p-6 rounded shadow w-full max-w-sm">
              <h2 className="text-xl font-bold mb-4">Add Liquor to Store 1</h2>
              <form className="space-y-3" onSubmit={handleAdd}>
                <div>
                  <label className="block mb-1 font-medium">Brand</label>
                  <input name="brand" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="w-full px-3 py-2 border rounded" required />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Bottle Size (ml)</label>
                  <input name="size" type="number" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} className="w-full px-3 py-2 border rounded" required />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Barcode</label>
                  <input name="barcode" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} className="w-full px-3 py-2 border rounded" required />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Bottle Price</label>
                  <input name="price" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full px-3 py-2 border rounded" required />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Initial Quantity</label>
                  <input name="bottles" type="number" value={form.bottles} onChange={e => setForm({ ...form, bottles: e.target.value })} className="w-full px-3 py-2 border rounded" required />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Shot Prices (per size)</label>
                  {/* Default sizes */}
                  {SHOT_SIZES.map(size => (
                    <div key={size} className="flex items-center gap-2 mb-1">
                      <span>{size}ml:</span>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-24"
                        value={form.shotPrices[size] || ""}
                        onChange={e => handleShotPriceChange(size, e.target.value)}
                        min="0"
                      />
                    </div>
                  ))}
                  {/* Custom sizes */}
                  {customShotSizes.map((size, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="border rounded px-2 py-1 w-20"
                        placeholder="Size (ml)"
                        value={size}
                        min="1"
                        onChange={e => {
                          const newVal = sanitizeNumberInput(e.target.value);
                          setCustomShotSizes(sizes => {
                            const arr = [...sizes];
                            arr[idx] = newVal;
                            return arr;
                          });
                          // Move price if size changes
                          const oldSize = size;
                          if (form.shotPrices[oldSize] && newVal !== oldSize) {
                            setForm(f => {
                              const newPrices = { ...f.shotPrices };
                              newPrices[newVal] = newPrices[oldSize];
                              delete newPrices[oldSize];
                              return { ...f, shotPrices: newPrices };
                            });
                          }
                        }}
                      />
                      <span>ml:</span>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-24"
                        value={form.shotPrices[size] || ""}
                        min="0"
                        placeholder="Price"
                        onChange={e => handleShotPriceChange(size, e.target.value)}
                      />
                      <button type="button" className="text-red-600 font-bold px-2" onClick={() => {
                        setCustomShotSizes(sizes => sizes.filter((_, i) => i !== idx));
                        setForm(f => {
                          const newPrices = { ...f.shotPrices };
                          delete newPrices[size];
                          return { ...f, shotPrices: newPrices };
                        });
                      }}>×</button>
                    </div>
                  ))}
                  <button type="button" className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs mt-2" onClick={() => setCustomShotSizes(sizes => [...sizes, ""])}>+ Add Shot Size</button>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>{loading ? "Adding..." : "Add"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white p-6 rounded shadow w-full max-w-sm">
              <h2 className="text-xl font-bold mb-4">Edit Liquor & Quantity</h2>
              <form className="space-y-3" onSubmit={handleEdit}>
                <div>
                  <label className="block mb-1 font-medium">Brand</label>
                  <input name="brand" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="w-full px-3 py-2 border rounded" required />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Bottle Size (ml)</label>
                  <input name="size" type="number" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} className="w-full px-3 py-2 border rounded" required />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Barcode</label>
                  <input name="barcode" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} className="w-full px-3 py-2 border rounded" required />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Bottle Price</label>
                  <input name="price" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full px-3 py-2 border rounded" required />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Quantity</label>
                  <input name="bottles" type="number" value={form.bottles} onChange={e => setForm({ ...form, bottles: e.target.value })} className="w-full px-3 py-2 border rounded" required />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Shot Prices (per size)</label>
                  {/* Default sizes */}
                  {SHOT_SIZES.map(size => (
                    <div key={size} className="flex items-center gap-2 mb-1">
                      <span>{size}ml:</span>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-24"
                        value={form.shotPrices[size] || ""}
                        onChange={e => handleShotPriceChange(size, e.target.value)}
                        min="0"
                      />
                    </div>
                  ))}
                  {/* Custom sizes */}
                  {customShotSizes.map((size, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="border rounded px-2 py-1 w-20"
                        placeholder="Size (ml)"
                        value={size}
                        min="1"
                        onChange={e => {
                          const newVal = sanitizeNumberInput(e.target.value);
                          setCustomShotSizes(sizes => {
                            const arr = [...sizes];
                            arr[idx] = newVal;
                            return arr;
                          });
                          // Move price if size changes
                          const oldSize = size;
                          if (form.shotPrices[oldSize] && newVal !== oldSize) {
                            setForm(f => {
                              const newPrices = { ...f.shotPrices };
                              newPrices[newVal] = newPrices[oldSize];
                              delete newPrices[oldSize];
                              return { ...f, shotPrices: newPrices };
                            });
                          }
                        }}
                      />
                      <span>ml:</span>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-24"
                        value={form.shotPrices[size] || ""}
                        min="0"
                        placeholder="Price"
                        onChange={e => handleShotPriceChange(size, e.target.value)}
                      />
                      <button type="button" className="text-red-600 font-bold px-2" onClick={() => {
                        setCustomShotSizes(sizes => sizes.filter((_, i) => i !== idx));
                        setForm(f => {
                          const newPrices = { ...f.shotPrices };
                          delete newPrices[size];
                          return { ...f, shotPrices: newPrices };
                        });
                      }}>×</button>
                    </div>
                  ))}
                  <button type="button" className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs mt-2" onClick={() => setCustomShotSizes(sizes => [...sizes, ""])}>+ Add Shot Size</button>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>{loading ? "Saving..." : "Save"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Transfer Modal */}
        {showTransferModal && transferRow && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white p-6 rounded shadow w-full max-w-sm">
              <h2 className="text-xl font-bold mb-4">Transfer to Store 2</h2>
              <form onSubmit={handleTransfer} className="space-y-4">
                <div>
                  <div className="mb-2 font-medium">{transferRow.liquor.brand} ({transferRow.liquor.size}ml)</div>
                  <div className="mb-2">Available in Store 1: <b>{transferRow.bottles}</b></div>
                  <label className="block mb-1 font-medium">Quantity to transfer</label>
                  <input
                    type="number"
                    min="1"
                    max={transferRow.bottles}
                    value={transferQty}
                    onChange={e => setTransferQty(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setShowTransferModal(false)}>Cancel</button>
                  <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded" disabled={loading}>{loading ? "Transferring..." : "Transfer"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Inventory; 
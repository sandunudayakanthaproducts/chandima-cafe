import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";

const SHOT_SIZES = [25, 50, 100, 120, 180];

const Sales = () => {
  const [inventory, setInventory] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch Store 2 inventory
  const fetchInventory = async () => {
    const res = await fetch("/api/inventory?store=2");
    const data = await res.json();
    setInventory(data);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Sell bottle
  const handleSellBottle = async (item) => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      // Update inventory: deduct 1 bottle
      const res = await fetch(`/api/inventory/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bottles: item.bottles - 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error selling bottle");
      setSuccess(`Sold 1 bottle of ${item.liquor.brand}`);
      setBill({
        items: [{ brand: item.liquor.brand, type: "bottle", qty: 1, price: item.liquor.price }],
        total: item.liquor.price,
        time: new Date().toLocaleString(),
      });
      fetchInventory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sell shot (button version)
  const handleSellShot = async (item, shotSize) => {
    setError("");
    setSuccess("");
    setLoading(true);
    const shotPrice = item.liquor.shotPrices?.[shotSize] ? Number(item.liquor.shotPrices[shotSize]) : 0;
    let { openVolume = 0, bottles = 0, liquor } = item;
    try {
      let newOpenVolume = openVolume;
      let newBottles = bottles;
      if (openVolume >= shotSize) {
        newOpenVolume = openVolume - shotSize;
      } else {
        if (bottles < 1) throw new Error("No bottles left to open for this brand");
        newOpenVolume = openVolume + liquor.size - shotSize;
        newBottles = bottles - 1;
      }
      // Update inventory
      const res = await fetch(`/api/inventory/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bottles: newBottles, openVolume: newOpenVolume }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error selling shot");
      setSuccess(`Sold ${shotSize}ml shot of ${item.liquor.brand}`);
      setBill({
        items: [{ brand: item.liquor.brand, type: "shot", qty: shotSize, price: shotPrice }],
        total: shotPrice,
        time: new Date().toLocaleString(),
      });
      fetchInventory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Bill modal close
  const closeBill = () => setBill(null);

  return (
    <>
      <Navbar />
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">Sales (Store 2)</h1>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {success && <div className="text-green-600 mb-4">{success}</div>}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded shadow">
            <thead>
              <tr className="bg-blue-100">
                <th className="py-2 px-4 border">Brand</th>
                <th className="py-2 px-4 border">Bottle Size (ml)</th>
                <th className="py-2 px-4 border">Bottles</th>
                <th className="py-2 px-4 border">Open Volume (ml)</th>
                <th className="py-2 px-4 border">Shot Prices</th>
                <th className="py-2 px-4 border">Sell Bottle</th>
                <th className="py-2 px-4 border">Sell Shot</th>
              </tr>
            </thead>
            <tbody>
              {inventory.filter(item => item && item.liquor).map((item) => (
                <tr key={item._id} className="text-center">
                  <td className="py-2 px-4 border">{item.liquor.brand}</td>
                  <td className="py-2 px-4 border">{item.liquor.size}</td>
                  <td className="py-2 px-4 border">{item.bottles}</td>
                  <td className="py-2 px-4 border">{item.openVolume || 0}</td>
                  <td className="py-2 px-4 border text-xs">
                    {SHOT_SIZES.map(size => (
                      <div key={size}>
                        {size}ml: {item.liquor.shotPrices?.[size] ? item.liquor.shotPrices[size] : "-"}
                      </div>
                    ))}
                  </td>
                  <td className="py-2 px-4 border">
                    <button
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      onClick={() => handleSellBottle(item)}
                      disabled={loading || item.bottles < 1}
                    >
                      Sell Bottle
                    </button>
                  </td>
                  <td className="py-2 px-4 border flex flex-wrap gap-2 justify-center">
                    {SHOT_SIZES.map(size => (
                      item.liquor.shotPrices?.[size] ? (
                        <button
                          key={size}
                          className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 text-xs"
                          onClick={() => handleSellShot(item, size)}
                          disabled={loading}
                        >
                          {size}ml - {item.liquor.shotPrices[size]}
                        </button>
                      ) : null
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Bill Modal */}
        {bill && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white p-6 rounded shadow w-full max-w-sm">
              <h2 className="text-xl font-bold mb-4 text-center">Bill / Receipt</h2>
              <div className="mb-2 text-sm">{bill.time}</div>
              <table className="w-full mb-4 text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left">Item</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.brand} {item.type === "shot" ? `(${item.qty}ml)` : "(Bottle)"}</td>
                      <td className="text-right">{item.type === "shot" ? 1 : item.qty}</td>
                      <td className="text-right">{item.price.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="font-bold text-right mb-4">Total: {bill.total.toLocaleString()}</div>
              <div className="flex justify-end gap-2">
                <button onClick={closeBill} className="bg-gray-400 text-white px-4 py-2 rounded">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sales; 
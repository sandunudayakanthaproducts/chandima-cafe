import React, { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";

const BillHistory = () => {
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billSales, setBillSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [filteredBills, setFilteredBills] = useState([]);
  const [showingToday, setShowingToday] = useState(false);
  const [todaySummary, setTodaySummary] = useState(null);
  const [brandSummary, setBrandSummary] = useState([]);
  const [shotSizes, setShotSizes] = useState([]);
  const [inventoryStore1, setInventoryStore1] = useState([]);
  const [inventoryStore2, setInventoryStore2] = useState([]);
  const [foodSummary, setFoodSummary] = useState([]);
  const [cocktailSummary, setCocktailSummary] = useState([]);
  const [cocktailSummaryLoading, setCocktailSummaryLoading] = useState(false); // NEW
  const cocktailCache = useRef({}); // NEW: cache for fetched cocktails
  const [cocktailDefs, setCocktailDefs] = useState([]); // Add this state

  const fetchBills = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bill");
      const data = await res.json();
      setBills(data);
    } catch (err) {
      setError("Failed to fetch bills");
    } finally {
      setLoading(false);
    }
  };

  const fetchInventories = async () => {
    try {
      const [res1, res2] = await Promise.all([
        fetch("/api/inventory?store=1"),
        fetch("/api/inventory?store=2"),
      ]);
      const data1 = await res1.json();
      const data2 = await res2.json();
      setInventoryStore1(data1);
      setInventoryStore2(data2);
    } catch (err) {
      // ignore errors for now
    }
  };

  useEffect(() => {
    fetchBills();
    fetchInventories();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    setFilteredBills(bills);
  }, [bills]);

  useEffect(() => {
    // Fetch all cocktail definitions once
    fetch('/api/cocktail')
      .then(res => res.json())
      .then(setCocktailDefs)
      .catch(() => setCocktailDefs([]));
  }, []);

  const handleFilter = () => {
    if (!filterStart && !filterEnd) {
      setFilteredBills(bills);
      return;
    }
    const start = filterStart ? new Date(filterStart) : null;
    const end = filterEnd ? new Date(filterEnd) : null;
    setFilteredBills(
      bills.filter(bill => {
        const billDate = bill.time ? new Date(bill.time) : null;
        if (!billDate) return false;
        if (start && billDate < start) return false;
        if (end) {
          // Include the end date's entire day
          const endOfDay = new Date(end);
          endOfDay.setHours(23,59,59,999);
          if (billDate > endOfDay) return false;
        }
        return true;
      })
    );
  };

  const handleClear = () => {
    setFilterStart("");
    setFilterEnd("");
    setFilteredBills(bills);
  };

  const handleShowToday = async () => {
    if (showingToday) {
      setFilteredBills(bills);
      setShowingToday(false);
      setTodaySummary(null);
      setBrandSummary([]);
      setShotSizes([]);
      setFoodSummary([]);
      setCocktailSummary([]);
      setCocktailSummaryLoading(false);
      return;
    }
    setCocktailSummaryLoading(true);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const todayBills = bills.filter(bill => {
      const billDate = bill.time ? new Date(bill.time) : null;
      if (!billDate) return false;
      return billDate >= start && billDate <= end;
    });
    setFilteredBills(todayBills);
    setShowingToday(true);
    // Calculate summary
    let totalSales = 0;
    let totalBottles = 0;
    let totalShots = 0;
    const brandMap = {};
    const shotSizeSet = new Set();
    const foodMap = {};
    const cocktailMap = {};
    todayBills.forEach(bill => {
      totalSales += bill.total || 0;
      bill.items?.forEach(item => {
        if (!item.brand) return;
        // Only count bottle and shot items in brandMap
        if (item.type === 'bottle' || item.type === 'shot') {
          if (!brandMap[item.brand]) brandMap[item.brand] = { bottles: 0, shots: 0, shotVolumes: {}, totalShotVolume: 0 };
          if (item.type === 'bottle') {
            totalBottles += item.qty;
            brandMap[item.brand].bottles += item.qty;
          }
          if (item.type === 'shot') {
            totalShots += item.qty;
            brandMap[item.brand].shots += item.qty;
            if (item.shotSize) {
              shotSizeSet.add(item.shotSize);
              if (!brandMap[item.brand].shotVolumes[item.shotSize]) brandMap[item.brand].shotVolumes[item.shotSize] = 0;
              brandMap[item.brand].shotVolumes[item.shotSize] += item.qty;
              brandMap[item.brand].totalShotVolume += item.qty * item.shotSize;
            }
          }
        }
        if (item.type === 'food') {
          if (!foodMap[item.brand]) foodMap[item.brand] = { qty: 0, total: 0 };
          foodMap[item.brand].qty += item.qty;
          foodMap[item.brand].total += item.price;
        }
        if (item.type === 'cocktail') {
          // Use canonical cocktail definition for ingredient breakdown
          const cocktailDef = cocktailDefs.find(c => c._id === item.cocktailId || c.name === item.brand);
          if (!cocktailMap[item.brand]) cocktailMap[item.brand] = { qty: 0, ingredients: {} };
          cocktailMap[item.brand].qty += item.qty;
          if (cocktailDef && Array.isArray(cocktailDef.ingredients)) {
            cocktailDef.ingredients.forEach(ing => {
              if (!cocktailMap[item.brand].ingredients[ing.brand]) cocktailMap[item.brand].ingredients[ing.brand] = 0;
              cocktailMap[item.brand].ingredients[ing.brand] += ing.volume * item.qty;
            });
          }
        }
      });
    });
    setTodaySummary({ totalSales, totalBottles, totalShots });
    setBrandSummary(Object.entries(brandMap).map(([brand, vals]) => ({ brand, ...vals })));
    setShotSizes(Array.from(shotSizeSet).sort((a, b) => a - b));
    setFoodSummary(Object.entries(foodMap).map(([name, vals]) => ({ name, ...vals })));
    setCocktailSummary(Object.entries(cocktailMap).map(([name, vals]) => ({ name, qty: vals.qty, ingredients: vals.ingredients })));
    setCocktailSummaryLoading(false);
  };

  const viewBill = async (billId) => {
    setSelectedBill(billId);
    setBillSales([]);
    setLoading(true);
    try {
      const res = await fetch(`/api/bill/${billId}`);
      const data = await res.json();
      setBillSales(data?.items || []);
    } catch (err) {
      setError("Failed to fetch bill details");
    } finally {
      setLoading(false);
    }
  };

  const deleteBill = async (billId) => {
    if (!window.confirm("Are you sure you want to delete this bill? This action cannot be undone.")) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/bill/${billId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete bill");
      }
      setBills(prev => prev.filter(b => b.billId !== billId));
      if (selectedBill === billId) setSelectedBill(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Bill History</h1>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {/* Date Filter */}
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div>
            <label className="block text-xs font-semibold mb-1">Start Date</label>
            <input
              type="date"
              className="border rounded-3xl bg-white text-black px-3 py-2"
              value={filterStart}
              onChange={e => setFilterStart(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">End Date</label>
            <input
              type="date"
              className="border rounded-3xl bg-white text-black px-3 py-2"
              value={filterEnd}
              onChange={e => setFilterEnd(e.target.value)}
            />
          </div>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-3xl hover:bg-blue-700"
            onClick={handleFilter}
            disabled={loading}
          >
            Filter
          </button>
          <button
            className="bg-gray-400 text-white px-4 py-2 rounded-3xl hover:bg-gray-500"
            onClick={handleClear}
            disabled={loading || (!filterStart && !filterEnd)}
          >
            Clear
          </button>
          <button
            className={`px-4 py-2 rounded-3xl ${showingToday ? 'bg-green-700 text-white' : 'bg-green-500 text-white hover:bg-green-600'}`}
            onClick={handleShowToday}
            disabled={loading}
          >
            {showingToday ? 'Show All' : 'Show Today'}
          </button>
        </div>
        {showingToday && todaySummary && (
          <div className="mb-4">
            <div className="p-4 bg-gray-900 border border-amber-400 rounded-2xl flex flex-wrap gap-8 items-center">
              <div className="font-semibold text-white">Today's Sales Summary:</div>
              <div className="text-white">Total Sales: <span className="font-bold">{todaySummary.totalSales.toLocaleString()}</span></div>
              <div className="text-white">Total Bottles Sold: <span className="font-bold">{todaySummary.totalBottles}</span></div>
              <div className="text-white">Total Shots Sold: <span className="font-bold">{todaySummary.totalShots}</span></div>
            </div>
            {brandSummary.length > 0 && (
              <div className="mt-4">
                <div className="font-semibold mb-2 text-white">Breakdown by Brand:</div>
                <table className="min-w-full bg-gray-900 border rounded shadow text-sm mb-4">
                  <thead>
                    <tr className="bg-gray-900">
                      <th className="py-2 px-4 border">Brand</th>
                      <th className="py-2 px-4 border">Bottles Sold</th>
                      <th className="py-2 px-4 border">Shots Sold</th>
                      {shotSizes.map(size => (
                        <th key={size} className="py-2 px-4 border">{size}ml Shots</th>
                      ))}
                      <th className="py-2 px-4 border">Total Shot Volume (ml)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brandSummary.map((row, idx) => (
                      <tr key={idx} className="text-center">
                        <td className="py-1 px-2 border font-semibold">{row.brand}</td>
                        <td className="py-1 px-2 border">{row.bottles}</td>
                        <td className="py-1 px-2 border">{row.shots}</td>
                        {shotSizes.map(size => (
                          <td key={size} className="py-1 px-2 border">{row.shotVolumes && row.shotVolumes[size] ? row.shotVolumes[size] : 0}</td>
                        ))}
                        <td className="py-1 px-2 border font-bold">{row.totalShotVolume || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {foodSummary.length > 0 && (
              <div className="mt-4">
                <div className="font-semibold mb-2 text-white">Food Sales Summary:</div>
                <table className="min-w-full bg-gray-900 border rounded shadow text-sm mb-4">
                  <thead>
                    <tr className="bg-gray-900">
                      <th className="py-2 px-4 border">Food Item</th>
                      <th className="py-2 px-4 border">Total Portions Sold</th>
                      <th className="py-2 px-4 border">Total Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foodSummary.map((row, idx) => (
                      <tr key={idx} className="text-center">
                        <td className="py-1 px-2 border font-semibold">{row.name}</td>
                        <td className="py-1 px-2 border">{row.qty}</td>
                        <td className="py-1 px-2 border">{row.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Cocktail/Mocktail Sales Summary Table */}
            {cocktailSummaryLoading ? (
              <div className="text-pink-700 font-semibold my-2">Loading cocktail summary...</div>
            ) : cocktailSummary.length > 0 && (
              <div className="mt-4">
                <div className="font-semibold mb-2 text-white">Cocktail/Mocktail Sales Summary:</div>
                <table className="min-w-full bg-gray-900 border rounded shadow text-sm mb-4">
                  <thead>
                    <tr className="bg-gray-900">
                      <th className="py-2 px-4 border">Cocktail Name</th>
                      <th className="py-2 px-4 border">Quantity Sold</th>
                      <th className="py-2 px-4 border">Ingredients (per × qty = total)</th>
                      <th className="py-2 px-4 border">Total Volume (ml)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cocktailSummary.map((row, idx) => {
                      // row.ingredients is { brand: totalVol } (already multiplied by qty)
                      // To get per-cocktail volume, we need to divide by row.qty (if qty > 0)
                      const qty = row.qty || 1;
                      const ingredientBreakdown = Object.entries(row.ingredients).map(([brand, totalVol], i) => {
                        const perCocktailVol = Math.round(totalVol / qty);
                        return (
                          <div key={i}>
                            {brand}: <span className="font-mono">{perCocktailVol}ml × {qty} = {totalVol}ml</span>
                          </div>
                        );
                      });
                      const totalVolume = Object.values(row.ingredients).reduce((sum, v) => sum + v, 0);
                      return (
                        <tr key={idx} className="text-center">
                          <td className="py-1 px-2 border font-semibold">{row.name}</td>
                          <td className="py-1 px-2 border">{qty}</td>
                          <td className="py-1 px-2 border">{ingredientBreakdown}</td>
                          <td className="py-1 px-2 border font-bold">{totalVolume}ml</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {/* Inventory left in both stores */}
            <div className="mt-4">
              <div className="font-semibold mb-2 text-white">Current Inventory (Bottles & Open Volume Left)</div>
              <table className="min-w-full bg-gray-900 border rounded shadow text-sm">
                <thead>
                  <tr className="bg-gray-900">
                    <th className="py-2 px-4 border">Brand</th>
                    <th className="py-2 px-4 border">Store</th>
                    <th className="py-2 px-4 border">Bottles Left</th>
                    <th className="py-2 px-4 border">Open Volume (ml)</th>
                  </tr>
                </thead>
                <tbody>
                  {[1,2].map(store => {
                    const inv = store === 1 ? inventoryStore1 : inventoryStore2;
                    const safeInv = inv.filter(row => row.liquor);
                    return safeInv.map((row, idx) => (
                      <tr key={store + '-' + row.liquor._id} className="text-center">
                        <td className="py-1 px-2 border">{row.liquor.brand}</td>
                        <td className="py-1 px-2 border">Store {store}</td>
                        <td className="py-1 px-2 border">{row.bottles}</td>
                        <td className="py-1 px-2 border">{row.openVolume || 0}</td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="overflow-x-auto mb-8">
          <table className="min-w-full bg-gray-900 border rounded shadow text-sm">
            <thead>
              <tr className="bg-gray-900">
                <th className="py-2 px-4 border">Bill ID</th>
                <th className="py-2 px-4 border">Total</th>
                <th className="py-2 px-4 border">Date</th>
                <th className="py-2 px-4 border">Items</th>
                <th className="py-2 px-4 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map(bill => (
                <React.Fragment key={bill.billId}>
                  <tr className="text-center bg-gray-900">
                    <td className="py-2 px-4 border font-mono text-xs align-top">{bill.billId}</td>
                    <td className="py-2 px-4 border align-top">{bill.total?.toLocaleString()}</td>
                    <td className="py-2 px-4 border align-top">{bill.time ? new Date(bill.time).toLocaleString() : "-"}</td>
                    <td className="py-2 px-4 border align-top">
                      <table className="w-full text-xs bg-gray-900 border rounded">
                        <thead>
                          <tr className="bg-gray-900">
                            <th className="py-1 px-2 border">Brand</th>
                            <th className="py-1 px-2 border">Type</th>
                            <th className="py-1 px-2 border">Qty</th>
                            <th className="py-1 px-2 border">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bill.items?.map((item, idx) => (
                            <tr key={idx} className="text-center">
                              <td className="py-1 px-2 border">{item.brand || "-"}</td>
                              <td className="py-1 px-2 border">{item.type === "bottle" ? "Bottle" : item.type === "shot" ? `${item.shotSize}ml Shot` : item.type === "food" ? "Portion" : ""}</td>
                              <td className="py-1 px-2 border">{item.qty}</td>
                              <td className="py-1 px-2 border">{item.price?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                    <td className="py-2 px-4 border align-top">
                      <button
                        className="bg-red-600 text-white px-3 py-1 rounded-3xl hover:bg-red-700"
                        onClick={() => deleteBill(bill.billId)}
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default BillHistory; 
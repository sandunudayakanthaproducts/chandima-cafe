import React, { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";

const MonthlyReport = () => {
  const [month, setMonth] = useState("");
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [brandSummary, setBrandSummary] = useState([]);
  const [shotSizes, setShotSizes] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [expandedDays, setExpandedDays] = useState({});
  const [cocktailDefs, setCocktailDefs] = useState([]);
  const [store2Inventory, setStore2Inventory] = useState([]);
  const [transfers, setTransfers] = useState([]); // NEW

  // Fetch cocktail definitions once
  useEffect(() => {
    fetch('/api/cocktail')
      .then(res => res.json())
      .then(setCocktailDefs)
      .catch(() => setCocktailDefs([]));
  }, []);

  // Fetch Store 2 inventory once
  useEffect(() => {
    fetch('/api/inventory?store=2')
      .then(res => res.json())
      .then(setStore2Inventory)
      .catch(() => setStore2Inventory([]));
  }, []);

  // Fetch Store 2 transfers for the month
  useEffect(() => {
    if (!month) return;
    fetch('/api/transfer')
      .then(res => res.json())
      .then(data => {
        // Only keep transfers to Store 2 and in the selected month
        const filtered = data.filter(tr => tr.toStore === 2 && tr.createdAt && tr.liquor && tr.liquor.brand && tr.createdAt.startsWith(month));
        setTransfers(filtered);
      })
      .catch(() => setTransfers([]));
  }, [month]);

  // --- Simulate inventory for each day (reverse from current inventory) ---
  const inventoryTimeline = useMemo(() => {
    if (!store2Inventory.length || !bills.length) return {};
    // Group bills by day
    const billsByDay = {};
    bills.forEach(bill => {
      const date = bill.time ? new Date(bill.time) : null;
      if (!date) return;
      const dayKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!billsByDay[dayKey]) billsByDay[dayKey] = [];
      billsByDay[dayKey].push(bill);
    });
    // Group transfers by day and brand
    const transfersByDayBrand = {};
    transfers.forEach(tr => {
      const day = new Date(tr.createdAt).toISOString().slice(0, 10);
      if (!transfersByDayBrand[day]) transfersByDayBrand[day] = {};
      if (!transfersByDayBrand[day][tr.liquor.brand]) transfersByDayBrand[day][tr.liquor.brand] = 0;
      transfersByDayBrand[day][tr.liquor.brand] += tr.quantity;
    });
    // Build a map: brand -> {bottles, openVolume}
    let invMap = {};
    store2Inventory.forEach(row => {
      if (row.liquor && row.liquor.brand) {
        invMap[row.liquor.brand] = {
          bottles: row.bottles || 0,
          openVolume: row.openVolume || 0
        };
      }
    });
    // Get all days sorted descending (latest to earliest)
    const allDays = Object.keys(billsByDay).sort((a, b) => b.localeCompare(a));
    const timeline = {};
    allDays.forEach(day => {
      // Clone current inventory as closing for this day
      const closing = JSON.parse(JSON.stringify(invMap));
      // Replay all sales for this day to get opening
      const bills = billsByDay[day];
      bills.forEach(bill => {
        bill.items?.forEach(item => {
          if (!item.brand) return;
          if (!invMap[item.brand]) invMap[item.brand] = { bottles: 0, openVolume: 0 };
          if (item.type === 'bottle') {
            invMap[item.brand].bottles += item.qty;
          }
          if (item.type === 'shot') {
            // Simulate shot deduction from openVolume and bottles
            let shotSize = item.shotSize || 0;
            for (let i = 0; i < item.qty; i++) {
              if (invMap[item.brand].openVolume >= shotSize) {
                invMap[item.brand].openVolume -= shotSize;
              } else {
                // Open a new bottle
                invMap[item.brand].bottles += 1;
                // Assume bottle size from liquor definition
                const liquor = store2Inventory.find(row => row.liquor && row.liquor.brand === item.brand)?.liquor;
                const bottleSize = liquor?.size || 750;
                invMap[item.brand].openVolume += bottleSize - shotSize;
              }
            }
          }
        });
      });
      // After replay, invMap is now the opening for this day
      const opening = JSON.parse(JSON.stringify(invMap));
      // Add transfer-in for this day/brand to opening
      if (transfersByDayBrand[day]) {
        Object.entries(transfersByDayBrand[day]).forEach(([brand, qty]) => {
          if (!opening[brand]) opening[brand] = { bottles: 0, openVolume: 0 };
          opening[brand].bottles += qty;
        });
      }
      timeline[day] = { opening, closing };
    });
    return timeline;
  }, [store2Inventory, bills, transfers]);

  const fetchReport = async () => {
    if (!month) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/bill?month=${month}`);
      if (!res.ok) throw new Error("Failed to fetch report");
      const data = await res.json();
      setBills(data);
      // Calculate monthly summary (existing logic)
      let totalSales = 0;
      let totalBottles = 0;
      let totalShots = 0;
      const brandMap = {};
      const shotSizeSet = new Set();
      // --- Group bills by day ---
      const billsByDay = {};
      data.forEach(bill => {
        const date = bill.time ? new Date(bill.time) : null;
        if (!date) return;
        const dayKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
        if (!billsByDay[dayKey]) billsByDay[dayKey] = [];
        billsByDay[dayKey].push(bill);
        totalSales += bill.total || 0;
        bill.items?.forEach(item => {
          if (!item.brand) return;
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
        });
      });
      setSummary({ totalSales, totalBottles, totalShots });
      setBrandSummary(Object.entries(brandMap).map(([brand, vals]) => ({ brand, ...vals })));
      setShotSizes(Array.from(shotSizeSet).sort((a, b) => a - b));
      // --- Build daily reports ---
      const daily = Object.entries(billsByDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, bills]) => {
        // Aggregate daily
        let dayTotal = 0;
        let bottles = 0;
        let shots = 0;
        const brandMap = {};
        const shotSizeSet = new Set();
        const foodMap = {};
        const cocktailMap = {};
        bills.forEach(bill => {
          dayTotal += bill.total || 0;
          bill.items?.forEach(item => {
            if (!item.brand) return;
            // Only count bottle and shot items in brandMap
            if (item.type === 'bottle' || item.type === 'shot') {
              if (!brandMap[item.brand]) brandMap[item.brand] = { bottles: 0, shots: 0, shotVolumes: {}, totalShotVolume: 0 };
              if (item.type === 'bottle') {
                bottles += item.qty;
                brandMap[item.brand].bottles += item.qty;
              }
              if (item.type === 'shot') {
                shots += item.qty;
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
        return {
          day,
          summary: { dayTotal, bottles, shots },
          brandSummary: Object.entries(brandMap).map(([brand, vals]) => ({ brand, ...vals })),
          shotSizes: Array.from(shotSizeSet).sort((a, b) => a - b),
          foodSummary: Object.entries(foodMap).map(([name, vals]) => ({ name, ...vals })),
          cocktailSummary: Object.entries(cocktailMap).map(([name, vals]) => ({ name, qty: vals.qty, ingredients: vals.ingredients })),
          bills
        };
      });
      setDailyReports(daily);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Monthly Income Report</h1>
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div>
            <label className="block text-xs font-semibold mb-1">Select Month</label>
            <input
              type="month"
              className="border rounded-3xl bg-white text-black px-3 py-2"
              value={month}
              onChange={e => setMonth(e.target.value)}
              disabled={loading}
            />
          </div>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-3xl hover:bg-blue-700"
            onClick={fetchReport}
            disabled={loading || !month}
          >
            {loading ? "Loading..." : "Generate Report"}
          </button>
        </div>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {summary && (
          <div className="mb-4">
            <div className="p-4 bg-gray-900 border border-amber-400 rounded-3xl flex flex-wrap gap-8 items-center">
              <div className="font-semibold text-white">Summary for {month}:</div>
              <div className="text-white">Total Sales: <span className="font-bold">{summary.totalSales.toLocaleString()}</span></div>
              <div className="text-white">Total Bottles Sold: <span className="font-bold">{summary.totalBottles}</span></div>
              <div className="text-white">Total Shots Sold: <span className="font-bold">{summary.totalShots}</span></div>
            </div>
            {brandSummary.filter(row => (row.bottles > 0 || row.shots > 0)).length > 0 && (
              <div className="mt-4">
                <div className="font-semibold mb-2 text-white">Breakdown by Brand:</div>
                <table className="min-w-full bg-gray-900 border rounded shadow text-sm">
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
                    {brandSummary.filter(row => (row.bottles > 0 || row.shots > 0)).map((row, idx) => (
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
          </div>
        )}
        {dailyReports.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-2">Bar Closing Report (Daily)</h2>
            <table className="min-w-full bg-gray-900 border rounded shadow text-sm mb-4">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="py-2 px-4 border">Date</th>
                  <th className="py-2 px-4 border">Total Sales</th>
                  <th className="py-2 px-4 border">Bottles Sold</th>
                  <th className="py-2 px-4 border">Shots Sold</th>
                  <th className="py-2 px-4 border">Expand</th>
                </tr>
              </thead>
              <tbody>
                {dailyReports.map((day, idx) => (
                  <React.Fragment key={day.day}>
                    <tr className="text-center bg-gray-900">
                      <td className="py-2 px-4 border font-mono">{day.day}</td>
                      <td className="py-2 px-4 border">{day.summary.dayTotal.toLocaleString()}</td>
                      <td className="py-2 px-4 border">{day.summary.bottles}</td>
                      <td className="py-2 px-4 border">{day.summary.shots}</td>
                      <td className="py-2 px-4 border">
                        <button
                          className="bg-blue-500 text-white px-2 py-1 rounded-3xl"
                          onClick={() => setExpandedDays(prev => ({ ...prev, [day.day]: !prev[day.day] }))}
                        >
                          {expandedDays[day.day] ? "Hide" : "Show"}
                        </button>
                      </td>
                    </tr>
                    {expandedDays[day.day] && (
                      <tr>
                        <td colSpan={5} className="bg-gray-900 p-4">
                          {/* Brand breakdown */}
                          {day.brandSummary.filter(row => (row.bottles > 0 || row.shots > 0)).length > 0 && (
                            <div className="mb-4">
                              <div className="font-semibold mb-2 text-white">Breakdown by Brand:</div>
                              <table className="min-w-full bg-gray-900 border rounded shadow text-xs mb-2">
                                <thead>
                                  <tr className="bg-gray-900">
                                    <th className="py-1 px-2 border">Brand</th>
                                    <th className="py-1 px-2 border">Bottles Sold</th>
                                    <th className="py-1 px-2 border">Shots Sold</th>
                                    {day.shotSizes.map(size => (
                                      <th key={size} className="py-1 px-2 border">{size}ml Shots</th>
                                    ))}
                                    <th className="py-1 px-2 border">Total Shot Volume (ml)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {day.brandSummary.filter(row => (row.bottles > 0 || row.shots > 0)).map((row, idx) => (
                                    <tr key={idx} className="text-center">
                                      <td className="py-1 px-2 border font-semibold">{row.brand}</td>
                                      <td className="py-1 px-2 border">{row.bottles}</td>
                                      <td className="py-1 px-2 border">{row.shots}</td>
                                      {day.shotSizes.map(size => (
                                        <td key={size} className="py-1 px-2 border">{row.shotVolumes && row.shotVolumes[size] ? row.shotVolumes[size] : 0}</td>
                                      ))}
                                      <td className="py-1 px-2 border font-bold">{row.totalShotVolume || 0}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {/* Opening & Closing Inventory Table */}
                          {day.brandSummary.length > 0 && (
                            <div className="mb-4">
                              <div className="font-semibold mb-2 text-white">Opening & Closing Inventory (Store 2)</div>
                              <table className="min-w-full bg-gray-900 border rounded shadow text-xs mb-2">
                                <thead>
                                  <tr className="bg-gray-900">
                                    <th className="py-1 px-2 border">Brand</th>
                                    <th className="py-1 px-2 border">Opening Bottles</th>
                                    <th className="py-1 px-2 border">Opening Open Volume (ml)</th>
                                    <th className="py-1 px-2 border">Closing Bottles</th>
                                    <th className="py-1 px-2 border">Closing Open Volume (ml)</th>
                                    <th className="py-1 px-2 border">Used Bottles</th>
                                    <th className="py-1 px-2 border">Used Open Volume (ml)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {day.brandSummary.map((row, idx) => {
                                    const open = inventoryTimeline[day.day]?.opening?.[row.brand] || { bottles: 0, openVolume: 0 };
                                    const close = inventoryTimeline[day.day]?.closing?.[row.brand] || { bottles: 0, openVolume: 0 };
                                    return (
                                      <tr key={idx} className="text-center">
                                        <td className="py-1 px-2 border font-semibold">{row.brand}</td>
                                        <td className="py-1 px-2 border">{open.bottles}</td>
                                        <td className="py-1 px-2 border">{open.openVolume}</td>
                                        <td className="py-1 px-2 border">{close.bottles}</td>
                                        <td className="py-1 px-2 border">{close.openVolume}</td>
                                        <td className="py-1 px-2 border">{open.bottles - close.bottles}</td>
                                        <td className="py-1 px-2 border">{open.openVolume - close.openVolume}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {/* Food summary */}
                          {day.foodSummary.length > 0 && (
                            <div className="mb-4">
                              <div className="font-semibold mb-2 text-white">Food Sales Summary:</div>
                              <table className="min-w-full bg-gray-900 border rounded shadow text-xs mb-2">
                                <thead>
                                  <tr className="bg-gray-900">
                                    <th className="py-1 px-2 border">Food Item</th>
                                    <th className="py-1 px-2 border">Total Portions Sold</th>
                                    <th className="py-1 px-2 border">Total Sales</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {day.foodSummary.map((row, idx) => (
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
                          {/* Cocktail/Mocktail summary */}
                          {day.cocktailSummary.length > 0 && (
                            <div className="mb-4">
                              <div className="font-semibold mb-2 text-white">Cocktail/Mocktail Sales Summary:</div>
                              <table className="min-w-full bg-gray-900 border rounded shadow text-xs mb-2">
                                <thead>
                                  <tr className="bg-gray-900">
                                    <th className="py-1 px-2 border">Cocktail Name</th>
                                    <th className="py-1 px-2 border">Quantity Sold</th>
                                    <th className="py-1 px-2 border">Ingredients (per × qty = total)</th>
                                    <th className="py-1 px-2 border">Total Volume (ml)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {day.cocktailSummary.map((row, idx) => {
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
                          {/* Optionally: List of bills for the day */}
                          <div className="mb-2">
                            <div className="font-semibold mb-2 text-white">Bills for {day.day}:</div>
                            <table className="min-w-full bg-gray-900 border rounded shadow text-xs">
                              <thead>
                                <tr className="bg-gray-900">
                                  <th className="py-1 px-2 border">Bill ID</th>
                                  <th className="py-1 px-2 border">Total</th>
                                  <th className="py-1 px-2 border">Time</th>
                                  <th className="py-1 px-2 border">Items</th>
                                </tr>
                              </thead>
                              <tbody>
                                {day.bills.map((bill, idx) => (
                                  <tr key={bill.billId} className="text-center">
                                    <td className="py-1 px-2 border font-mono text-xs align-top">{bill.billId}</td>
                                    <td className="py-1 px-2 border align-top">{bill.total?.toLocaleString()}</td>
                                    <td className="py-1 px-2 border align-top">{bill.time ? new Date(bill.time).toLocaleTimeString() : "-"}</td>
                                    <td className="py-1 px-2 border align-top">
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
                                              <td className="py-1 px-2 border">{item.type === "bottle" ? "Bottle" : item.type === "shot" ? `${item.shotSize}ml Shot` : item.type === "food" ? "Portion" : item.type === "cocktail" ? "Cocktail" : ""}</td>
                                              <td className="py-1 px-2 border">{item.qty}</td>
                                              <td className="py-1 px-2 border">{item.price?.toLocaleString()}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default MonthlyReport; 
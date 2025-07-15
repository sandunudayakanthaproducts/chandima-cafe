import React, { useState } from "react";
import Navbar from "../components/Navbar";

const MonthlyReport = () => {
  const [month, setMonth] = useState("");
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [brandSummary, setBrandSummary] = useState([]);
  const [shotSizes, setShotSizes] = useState([]);

  const fetchReport = async () => {
    if (!month) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/bill?month=${month}`);
      if (!res.ok) throw new Error("Failed to fetch report");
      const data = await res.json();
      setBills(data);
      // Calculate summary
      let totalSales = 0;
      let totalBottles = 0;
      let totalShots = 0;
      const brandMap = {};
      const shotSizeSet = new Set();
      data.forEach(bill => {
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
              className="border rounded px-2 py-1"
              value={month}
              onChange={e => setMonth(e.target.value)}
              disabled={loading}
            />
          </div>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={fetchReport}
            disabled={loading || !month}
          >
            {loading ? "Loading..." : "Generate Report"}
          </button>
        </div>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {summary && (
          <div className="mb-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded flex flex-wrap gap-8 items-center">
              <div className="font-semibold text-green-900">Summary for {month}:</div>
              <div className="text-green-800">Total Sales: <span className="font-bold">{summary.totalSales.toLocaleString()}</span></div>
              <div className="text-green-800">Total Bottles Sold: <span className="font-bold">{summary.totalBottles}</span></div>
              <div className="text-green-800">Total Shots Sold: <span className="font-bold">{summary.totalShots}</span></div>
            </div>
            {brandSummary.length > 0 && (
              <div className="mt-4">
                <div className="font-semibold mb-2 text-green-900">Breakdown by Brand:</div>
                <table className="min-w-full bg-white border rounded shadow text-sm">
                  <thead>
                    <tr className="bg-green-100">
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
          </div>
        )}
      </div>
    </>
  );
};

export default MonthlyReport; 
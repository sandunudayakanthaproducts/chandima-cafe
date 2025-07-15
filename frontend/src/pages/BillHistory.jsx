import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";

const BillHistory = () => {
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billSales, setBillSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
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
    fetchBills();
  }, []);

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

  return (
    <>
      <Navbar />
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Bill History</h1>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div className="overflow-x-auto mb-8">
          <table className="min-w-full bg-white border rounded shadow text-sm">
            <thead>
              <tr className="bg-blue-100">
                <th className="py-2 px-4 border">Bill ID</th>
                <th className="py-2 px-4 border">Total</th>
                <th className="py-2 px-4 border">Items</th>
                <th className="py-2 px-4 border">Date</th>
                <th className="py-2 px-4 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map(bill => (
                <tr key={bill.billId} className="text-center">
                  <td className="py-2 px-4 border font-mono text-xs">{bill.billId}</td>
                  <td className="py-2 px-4 border">{bill.total?.toLocaleString()}</td>
                  <td className="py-2 px-4 border">{bill.items?.length}</td>
                  <td className="py-2 px-4 border">{bill.time ? new Date(bill.time).toLocaleString() : "-"}</td>
                  <td className="py-2 px-4 border">
                    <button
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      onClick={() => viewBill(bill.billId)}
                      disabled={loading}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selectedBill && (
          <div className="mb-8 p-4 border rounded bg-gray-50">
            <h2 className="text-lg font-bold mb-2">Bill Details</h2>
            <div className="mb-2 text-xs text-gray-500">Bill ID: {selectedBill}</div>
            <table className="min-w-full bg-white border rounded shadow text-sm mb-2">
              <thead>
                <tr className="bg-blue-50">
                  <th className="py-1 px-2 border">Brand</th>
                  <th className="py-1 px-2 border">Type</th>
                  <th className="py-1 px-2 border">Qty</th>
                  <th className="py-1 px-2 border">Price</th>
                </tr>
              </thead>
              <tbody>
                {billSales.map((s, idx) => (
                  <tr key={idx} className="text-center">
                    <td className="py-1 px-2 border">{s.brand || "-"}</td>
                    <td className="py-1 px-2 border">{s.type === "bottle" ? "Bottle" : `${s.shotSize}ml Shot`}</td>
                    <td className="py-1 px-2 border">{s.qty}</td>
                    <td className="py-1 px-2 border">{s.price?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              className="bg-gray-400 text-white px-4 py-2 rounded mt-2"
              onClick={() => setSelectedBill(null)}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default BillHistory; 
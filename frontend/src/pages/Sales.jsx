import React, { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import './SalesReceipt.css';

function generateBillId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 8)
  );
}

const SHOT_SIZES = [25, 50, 100, 120, 180];

const Sales = () => {
  const [inventory, setInventory] = useState([]);
  const [foods, setFoods] = useState([]); // NEW
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [billItems, setBillItems] = useState([]); // {itemId, brand, type, qty, price, inventoryId, shotSize}
  const [search, setSearch] = useState("");
  const [restaurant, setRestaurant] = useState({ name: '', address: '', phone: '', email: '' });
  const receiptRef = useRef();
  const searchInputRef = useRef(null);
  const [virtualOpenVolumes, setVirtualOpenVolumes] = useState({});
  const [cocktails, setCocktails] = useState([]); // NEW

  // Fetch Store 2 inventory
  const fetchInventory = async () => {
    const res = await fetch("/api/inventory?store=2");
    const data = await res.json();
    setInventory(data);
    // Initialize virtual open volumes
    const vov = {};
    data.forEach(row => {
      vov[row._id] = {
        openVolume: row.openVolume || 0,
        bottles: row.bottles || 0,
      };
    });
    setVirtualOpenVolumes(vov);
  };

  // Fetch food items
  const fetchFoods = async () => {
    const res = await fetch("/api/food");
    const data = await res.json();
    setFoods(data);
  };

  // Fetch cocktails
  const fetchCocktails = async () => {
    const res = await fetch("/api/cocktail");
    const data = await res.json();
    setCocktails(data);
  };

  useEffect(() => {
    fetchInventory();
    fetchFoods(); // NEW
    fetchCocktails(); // NEW
    // Fetch restaurant details
    const fetchRestaurant = async () => {
      try {
        const res = await fetch('/api/restaurant');
        if (!res.ok) return;
        const data = await res.json();
        setRestaurant(data);
      } catch {}
    };
    fetchRestaurant();
    // Auto-focus search bar on mount
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, []);

  // Add bottle to bill
  const addBottleToBill = (item) => {
    setBillItems(prev => {
      const idx = prev.findIndex(b => b.inventoryId === item._id && b.type === "bottle");
      if (idx !== -1) {
        // Increment qty immutably
        return prev.map((b, i) =>
          i === idx
            ? { ...b, qty: b.qty + 1, price: b.price + item.liquor.price }
            : b
        );
      }
      return [...prev, {
        itemId: `${item._id}-bottle`,
        brand: item.liquor.brand,
        type: "bottle",
        qty: 1,
        price: item.liquor.price,
        inventoryId: item._id
      }];
    });
  };

  // Add shot to bill
  const addShotToBill = (item, shotSize) => {
    const shotPrice = item.liquor.shotPrices?.[shotSize] ? Number(item.liquor.shotPrices[shotSize]) : 0;
    setBillItems(prev => {
      const idx = prev.findIndex(b => b.inventoryId === item._id && b.type === "shot" && b.shotSize === shotSize);
      if (idx !== -1) {
        // Increment qty immutably
        return prev.map((b, i) =>
          i === idx
            ? { ...b, qty: b.qty + 1, price: b.price + shotPrice }
            : b
        );
      }
      return [...prev, {
        itemId: `${item._id}-shot-${shotSize}`,
        brand: item.liquor.brand,
        type: "shot",
        qty: 1,
        price: shotPrice,
        inventoryId: item._id,
        shotSize
      }];
    });
  };

  // Add food to bill
  const addFoodToBill = (food) => {
    setBillItems(prev => {
      const idx = prev.findIndex(b => b.foodId === food._id && b.type === "food");
      if (idx !== -1) {
        // Increment qty immutably
        return prev.map((b, i) =>
          i === idx
            ? { ...b, qty: b.qty + 1, price: b.price + food.price }
            : b
        );
      }
      return [...prev, {
        itemId: `${food._id}-food`,
        brand: food.name,
        type: "food",
        qty: 1,
        price: food.price,
        foodId: food._id
      }];
    });
  };

  // Add cocktail to bill
  const addCocktailToBill = (cocktail) => {
    setBillItems(prev => {
      const idx = prev.findIndex(b => b.cocktailId === cocktail._id && b.type === "cocktail");
      if (idx !== -1) {
        return prev.map((b, i) =>
          i === idx
            ? { ...b, qty: b.qty + 1, price: b.price + cocktail.price }
            : b
        );
      }
      return [...prev, {
        itemId: `${cocktail._id}-cocktail`,
        brand: cocktail.name,
        type: "cocktail",
        qty: 1,
        price: cocktail.price,
        cocktailId: cocktail._id
      }];
    });
  };

  // Remove item from bill
  const removeBillItem = (itemId) => {
    setBillItems(prev => {
      const item = prev.find(b => b.itemId === itemId);
      if (item && item.type === "shot") {
        // Restore open volume for all removed shots
        // This logic needs to be re-evaluated based on the new useEffect
        // For now, we'll rely on the useEffect to recalculate virtualOpenVolumes
      }
      return prev.filter(b => b.itemId !== itemId);
    });
  };

  // Update qty in bill
  const updateBillItemQty = (itemId, qty) => {
    setBillItems(prev => {
      const item = prev.find(b => b.itemId === itemId);
      if (!item) return prev;
      const newQty = qty < 1 ? 1 : qty;
      let unitPrice = 0;
      if (item.type === "bottle") {
        const inv = inventory.find(i => i._id === item.inventoryId);
        unitPrice = inv?.liquor?.price || 0;
      } else if (item.type === "shot") {
        const inv = inventory.find(i => i._id === item.inventoryId);
        unitPrice = inv?.liquor?.shotPrices?.[item.shotSize] ? Number(inv.liquor.shotPrices[item.shotSize]) : 0;
        // Adjust virtual open volume
        // This logic needs to be re-evaluated based on the new useEffect
      } else if (item.type === "food") {
        const food = foods.find(f => f._id === item.foodId);
        unitPrice = food?.price || 0;
      } else if (item.type === "cocktail") {
        const cocktail = cocktails.find(c => c._id === item.cocktailId);
        unitPrice = cocktail?.price || 0;
      }
      return prev.map(b => b.itemId !== itemId ? b : { ...b, qty: newQty, price: unitPrice * newQty });
    });
  };

  // Process bill
  const handleProcessBill = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    const billId = generateBillId();
    try {
      // For each bill item, update inventory and log sale
      for (const b of billItems) {
        if (b.type === "bottle") {
          // Deduct bottles
          const invRes = await fetch(`/api/inventory/${b.inventoryId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bottles: inventory.find(i => i._id === b.inventoryId).bottles - b.qty })
          });
          const invData = await invRes.json();
          if (!invRes.ok) throw new Error(invData.message || `Error selling bottle for ${b.brand}`);
          // Log sale
          await fetch(`/api/sale`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              liquorId: inventory.find(i => i._id === b.inventoryId).liquor._id,
              store: 2,
              type: "bottle",
              quantity: b.qty,
              price: b.price,
              user: "worker",
              billId
            })
          });
        } else if (b.type === "shot") {
          // Deduct openVolume/bottles for each shot
          let inv = inventory.find(i => i._id === b.inventoryId);
          let { openVolume = 0, bottles = 0, liquor } = inv;
          let newOpenVolume = openVolume;
          let newBottles = bottles;
          for (let i = 0; i < b.qty; i++) {
            if (newOpenVolume >= b.shotSize) {
              newOpenVolume -= b.shotSize;
            } else {
              if (newBottles < 1) throw new Error(`No bottles left to open for ${b.brand}`);
              newOpenVolume += liquor.size - b.shotSize;
              newBottles -= 1;
            }
          }
          // Update inventory
          const invRes = await fetch(`/api/inventory/${b.inventoryId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bottles: newBottles, openVolume: newOpenVolume })
          });
          const invData = await invRes.json();
          if (!invRes.ok) throw new Error(invData.message || `Error selling shot for ${b.brand}`);
          // Log sale
          await fetch(`/api/sale`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              liquorId: inv.liquor._id,
              store: 2,
              type: "shot",
              quantity: b.qty * b.shotSize,
              price: b.price,
              user: "worker",
              billId
            })
          });
        } else if (b.type === "food") {
          // Log sale for food
          await fetch(`/api/sale`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              foodId: b.foodId,
              store: 2,
              type: "food",
              quantity: b.qty,
              price: b.price,
              user: "worker",
              billId
            })
          });
        } else if (b.type === "cocktail") {
          // Log sale for cocktail
          await fetch(`/api/sale`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cocktailId: b.cocktailId,
              store: 2,
              type: "cocktail",
              quantity: b.qty,
              price: b.price,
              user: "worker",
              billId
            })
          });
        }
      }
      // Save the bill as a document
      await fetch('/api/bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId,
          items: billItems.map(b => ({
            brand: b.brand,
            type: b.type,
            qty: b.qty,
            price: b.price,
            shotSize: b.shotSize,
            liquorId: inventory.find(i => i._id === b.inventoryId)?.liquor?._id,
            foodId: b.foodId,
            cocktailId: b.cocktailId,
            ingredients: b.type === "cocktail"
              ? (cocktails.find(c => c._id === b.cocktailId)?.ingredients || [])
              : undefined
          })),
          total: billItems.reduce((sum, b) => sum + b.price, 0),
          time: new Date().toISOString(),
          user: "worker"
        })
      });
      setSuccess("Bill processed successfully!");
      setBill({
        items: billItems,
        total: billItems.reduce((sum, b) => sum + b.price, 0),
        time: new Date().toLocaleString(),
        billId
      });
      setBillItems([]);
      setSearch(""); // Clear search after bill processed
      fetchInventory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Bill modal close
  const closeBill = () => setBill(null);

  const handlePrint = () => {
    const printContents = receiptRef.current.innerHTML;
    const win = window.open('', '', 'width=400,height=800');
    win.document.write('<html><head><title>Print Receipt</title>');
    win.document.write('<style>body{font-family:sans-serif;}@media print{.receipt-area{width:58mm!important;max-width:58mm!important;font-size:11px;margin:0 auto;padding:0;box-shadow:none;}button{display:none!important;}}</style>');
    win.document.write('</head><body>');
    win.document.write(printContents);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const handleDownloadPDF = async () => {
    const input = receiptRef.current;
    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    // 58mm = ~164pt, set height long enough for receipt
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [58, 200] });
    const pageWidth = 58;
    const pageHeight = 200;
    // scale image to fit width
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pageWidth - 4;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 2, 2, imgWidth, imgHeight);
    pdf.save(`receipt-${bill.billId || Date.now()}.pdf`);
  };

  // When bill is processed or canceled, reset virtual open volumes
  useEffect(() => {
    if (bill === null) {
      // Bill closed/canceled, reset virtual open volumes
      fetchInventory();
    }
  }, [bill]);

  // Robust recalculation of virtual open volumes and bottles
  useEffect(() => {
    // Recalculate virtual open volumes and bottles from inventory and billItems
    const vov = {};
    inventory.forEach(row => {
      let openVolume = row.openVolume || 0;
      let bottles = row.bottles || 0;
      // 1. Subtract bottles added to bill
      const bottleBill = billItems.find(b => b.type === "bottle" && b.inventoryId === row._id);
      if (bottleBill) {
        bottles -= bottleBill.qty;
      }
      // 2. Subtract bottles and open volume for shots in bill
      billItems.filter(b => b.type === "shot" && b.inventoryId === row._id).forEach(b => {
        for (let i = 0; i < b.qty; i++) {
          if (openVolume >= b.shotSize) {
            openVolume -= b.shotSize;
          } else {
            if (bottles > 0) {
              openVolume += row.liquor.size - b.shotSize;
              bottles -= 1;
            }
          }
        }
      });
      vov[row._id] = { openVolume, bottles };
    });
    setVirtualOpenVolumes(vov);
  }, [billItems, inventory]);

  return (
    <>
      <Navbar />
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">Sales (Store 2)</h1>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {success && <div className="text-green-600 mb-4">{success}</div>}
        {/* Search input */}
        <div className="mb-4 flex items-center gap-4">
          <input
            type="text"
            ref={searchInputRef}
            className="border rounded-4xl px-6 py-4 w-screen  focus:outline-amber-400 focus:ring-2 focus:ring-amber-400 hover:border-amber-300"
            placeholder="Scan or search by brand or barcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                // Optionally, you could trigger a search or move focus
              }
            }}
          />
        </div>
        <div className="overflow-x-auto mb-8">
          {search.trim() === "" ? (
            <div className="text-gray-500 text-center py-8">Type to search for products by brand or barcode.</div>
          ) : (
            <>
              {/* Liquor Table */}
              <table className="min-w-full bg-gray-900 rounded shadow mb-7">
                <thead>
                  <tr className="bg-gray-900">
                    <th className="py-2 px-4">Brand</th>
                    <th className="py-2 px-4 ">Bottle Size (ml)</th>
                    <th className="py-2 px-4 ">Bottles</th>
                    <th className="py-2 px-4 ">Open Volume (ml)</th>
                    <th className="py-2 px-4 ">Shot Prices</th>
                    <th className="py-2 px-4 ">Add Bottle</th>
                    <th className="py-2 px-4 ">Add Shot</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.filter(item => {
                    if (!item || !item.liquor) return false;
                    const q = search.trim().toLowerCase();
                    if (!q) return false;
                    return (
                      item.liquor.brand.toLowerCase().includes(q) ||
                      (item.liquor.barcode && item.liquor.barcode.toLowerCase().includes(q))
                    );
                  }).map((item) => (
                    <tr key={item._id} className="text-center">
                      <td className="py-2 px-4 border-t border-amber-400">{item.liquor.brand}</td>
                      <td className="py-2 px-4 border-t border-amber-400">{item.liquor.size}</td>
                      <td className="py-2 px-4 border-t border-amber-400">{virtualOpenVolumes[item._id]?.bottles ?? item.bottles}</td>
                      <td className="py-2 px-4 border-t border-amber-400">{virtualOpenVolumes[item._id]?.openVolume ?? item.openVolume ?? 0}</td>
                      <td className="py-2 px-4 border-t border-amber-400 text-xs">
                        {Object.keys(item.liquor.shotPrices || {}).map(size => (
                          <div key={size}>
                            {size}ml: {item.liquor.shotPrices[size]}
                          </div>
                        ))}
                      </td>
                      <td className="py-2 px-4 border-t border-amber-400">
                        <button
                          className="bg-emerald-500 text-white px-5 py-3 rounded-3xl hover:bg-emerald-600 border border-amber-200 "
                          onClick={() => addBottleToBill(item)}
                          disabled={loading || item.bottles < 1}
                        >
                          + Bottle
                        </button>
                        <span className="ml-2 text-xs text-amber-400 font-semibold">LKR {item.liquor.price}</span>
                      </td>
                      <td className="py-6 px-5  flex flex-wrap gap-2 justify-center border-t border-amber-400 text-center">
                        {Object.keys(item.liquor.shotPrices || {}).map(size => (
                          <button
                            key={size}
                            className="bg-emerald-500 text-white px-3 py-3 rounded-3xl hover:bg-emerald-600 border border-amber-200 "
                            onClick={() => addShotToBill(item, Number(size))}
                            disabled={loading}
                          >
                            + {size}ml
                          </button>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Food Table */}
              <table className="min-w-full bg-gray-900  rounded shadow mb-7">
                <thead>
                  <tr className="bg-gray-900">
                    <th className="py-2 px-4 ">Name</th>
                    <th className="py-2 px-4">Price</th>
                    <th className="py-2 px-4">Barcode</th>
                    <th className="py-2 px-4">Add</th>
                  </tr>
                </thead>
                <tbody>
                  {foods.filter(f => {
                    const q = search.trim().toLowerCase();
                    if (!q) return false;
                    return (
                      f.name.toLowerCase().includes(q) ||
                      (f.barcode && f.barcode.toLowerCase().includes(q))
                    );
                  }).map(f => (
                    <tr key={f._id} className="text-center">
                      <td className="py-2 px-4 border-t border-amber-400">{f.name}</td>
                      <td className="py-2 px-4 border-t border-amber-400">{f.price}</td>
                      <td className="py-2 px-4 border-t border-amber-400">{f.barcode}</td>
                      <td className="py-2 px-4 border-t border-amber-400">
                        <button
                          className="bg-emerald-500 text-white px-5 py-3 rounded-3xl hover:bg-emerald-600 border border-amber-200"
                          onClick={() => addFoodToBill(f)}
                          disabled={loading}
                        >
                          + Add
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Cocktail Table */}
              <table className="min-w-full bg-gray-900 rounded shadow mb-6">
                <thead>
                  <tr className="bg-gray-900">
                    <th className="py-2 px-4 ">Name</th>
                    <th className="py-2 px-4 ">Price</th>
                    <th className="py-2 px-4 ">Barcode</th>
                    <th className="py-2 px-4 ">Ingredients</th>
                    <th className="py-2 px-4 ">Add</th>
                  </tr>
                </thead>
                <tbody>
                  {cocktails.filter(c => {
                    const q = search.trim().toLowerCase();
                    if (!q) return false;
                    return (
                      c.name.toLowerCase().includes(q) ||
                      (c.barcode && c.barcode.toLowerCase().includes(q))
                    );
                  }).map(c => (
                    <tr key={c._id} className="text-center">
                      <td className="py-2 px-4 border-t border-amber-400">{c.name}</td>
                      <td className="py-2 px-4 border-t border-amber-400">{c.price}</td>
                      <td className="py-2 px-4 border-t border-amber-400">{c.barcode}</td>
                      <td className="py-2 px-4 border-t border-amber-400 text-xs">
                        {c.ingredients.map((ing, idx) => (
                          <div key={idx}>{ing.brand} ({ing.volume}ml)</div>
                        ))}
                      </td>
                      <td className="py-2 px-4 border-t border-amber-400">
                        <button
                          className="bg-emerald-500 text-white px-5 py-3 rounded-3xl hover:bg-emerald-600 border border-amber-200"
                          onClick={() => addCocktailToBill(c)}
                          disabled={loading}
                        >
                          + Cocktail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
        {/* Bill Builder Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-2">Current Bill</h2>
          {billItems.length === 0 ? (
            <div className="text-gray-500">No items in bill. Add bottles or shots above.</div>
          ) : (
            <table className="min-w-full bg-gray-900 rounded shadow text-sm mb-2">
              <thead>
                <tr className="bg-gray-900">
                  <th className="py-1 px-2 ">Brand</th>
                  <th className="py-1 px-2 ">Type</th>
                  <th className="py-1 px-2 ">Qty</th>
                  <th className="py-1 px-2 ">Unit</th>
                  <th className="py-1 px-2 ">Price</th>
                  <th className="py-1 px-2 ">Remove</th>
                </tr>
              </thead>
              <tbody>
                {billItems.map(b => (
                  <tr key={b.itemId} className="text-center">
                    <td className="py-1 px-2 border-t border-amber-400">{b.brand}</td>
                    <td className="py-1 px-2 border-t border-amber-400">{b.type === "bottle" ? "Bottle" : b.type === "shot" ? `${b.shotSize}ml Shot` : b.type === "food" ? "Portion" : b.type === "cocktail" ? "Cocktail" : ""}</td>
                    <td className="py-1 px-2 border-t border-amber-400">
                      <input
                        type="number"
                        min="1"
                        value={b.qty}
                        onChange={e => updateBillItemQty(b.itemId, Number(e.target.value))}
                        className="w-16 px-2 py-3 border rounded-3xl text-center border-amber-400"
                        disabled={loading}
                      />
                    </td>
                    <td className="py-1 px-2 border-t border-amber-400">{b.type === "bottle" ? "Bottle" : b.type === "shot" ? "ml" : b.type === "food" ? "Portion" : b.type === "cocktail" ? "Portion" : ""}</td>
                    <td className="py-1 px-2 border-t border-amber-400">{b.price.toLocaleString()}</td>
                    <td className="py-1 px-2 border-t border-amber-400">
                      <button
                        className="bg-red-500 text-white px-2 py-1 rounded-3xl hover:bg-red-600"
                        onClick={() => removeBillItem(b.itemId)}
                        disabled={loading}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="flex justify-end mt-2">
            <button
              className="bg-green-600 text-white px-6 py-2 rounded-3xl hover:bg-green-700"
              onClick={handleProcessBill}
              disabled={loading || billItems.length === 0}
            >
              {loading ? "Processing..." : "Process Bill & Print"}
            </button>
          </div>
        </div>
        {/* Bill Modal */}
        {bill && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white p-6 rounded shadow w-full max-w-sm">
              <div className="flex justify-end gap-2 mb-2 print:hidden">
                <button onClick={handlePrint} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Print</button>
                <button onClick={handleDownloadPDF} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Download PDF</button>
              </div>
              <div ref={receiptRef} className="receipt-area mx-auto" style={{background:'#fff',color:'#000',fontFamily:'Arial, sans-serif'}}>
                <h2 style={{fontWeight:'bold',fontSize:'1.25rem',marginBottom:'0.5rem',textAlign:'center',lineHeight:1.3,padding:'0.2em 0'}}>Bill / Receipt</h2>
                <div style={{borderTop:'2px solid #555',margin:'0.5rem 0'}}></div>
                {/* Restaurant details below heading */}
                <div style={{marginBottom:'0.5rem',textAlign:'center'}}>
                  <div style={{fontWeight:'bold',fontSize:'1.1rem',lineHeight:1.3,padding:'0.2em 0'}}>{restaurant.name}</div>
                  <div style={{fontSize:'0.75rem',color:'#333',whiteSpace:'pre-line'}}>{restaurant.address}</div>
                  <div style={{fontSize:'0.75rem',color:'#333'}}>{restaurant.phone}</div>
                  <div style={{fontSize:'0.75rem',color:'#333'}}>{restaurant.email}</div>
                </div>
                <div style={{borderTop:'2px solid #555',margin:'0.5rem 0'}}></div>
                <div style={{marginBottom:'0.5rem',fontSize:'0.75rem',color:'#555'}}>Bill ID: {bill.billId}</div>
                <div style={{marginBottom:'0.5rem',fontSize:'0.9rem'}}>{bill.time}</div>
                <div style={{borderTop:'2px solid #555',margin:'0.5rem 0'}}></div>
                <table style={{width:'100%',marginBottom:'1rem',fontSize:'0.9rem'}}>
                  <thead>
                    <tr style={{borderBottom:'1px solid #bbb'}}>
                      <th style={{textAlign:'left'}}>Item</th>
                      <th style={{textAlign:'right'}}>Qty</th>
                      <th style={{textAlign:'right'}}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{
                          item.type === "shot"
                            ? `${item.brand} (${item.qty} x ${item.shotSize}ml)`
                            : item.type === "food"
                            ? item.brand
                            : item.type === "cocktail"
                            ? `${item.brand} (${item.qty} x ${Array.isArray(item.ingredients) ? item.ingredients.length : 1} Portion)`
                            : item.brand
                        }</td>
                        <td style={{textAlign:'right'}}>{item.qty}</td>
                        <td style={{textAlign:'right'}}>{item.price.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{borderTop:'2px solid #555',margin:'0.5rem 0'}}></div>
                <div style={{fontWeight:'bold',textAlign:'right',marginBottom:'1rem'}}>Total: {bill.total.toLocaleString()}</div>
              </div>
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
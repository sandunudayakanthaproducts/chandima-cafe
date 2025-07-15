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

  // Fetch Store 2 inventory
  const fetchInventory = async () => {
    const res = await fetch("/api/inventory?store=2");
    const data = await res.json();
    setInventory(data);
  };

  // Fetch food items
  const fetchFoods = async () => {
    const res = await fetch("/api/food");
    const data = await res.json();
    setFoods(data);
  };

  useEffect(() => {
    fetchInventory();
    fetchFoods(); // NEW
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
  }, []);

  // Add bottle to bill
  const addBottleToBill = (item) => {
    setBillItems(prev => {
      const idx = prev.findIndex(b => b.inventoryId === item._id && b.type === "bottle");
      if (idx !== -1) {
        // Increment qty
        const updated = [...prev];
        updated[idx].qty += 1;
        updated[idx].price += item.liquor.price;
        return updated;
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
        // Increment qty
        const updated = [...prev];
        updated[idx].qty += 1;
        updated[idx].price += shotPrice;
        return updated;
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
        // Increment qty
        const updated = [...prev];
        updated[idx].qty += 1;
        updated[idx].price += food.price;
        return updated;
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

  // Remove item from bill
  const removeBillItem = (itemId) => {
    setBillItems(prev => prev.filter(b => b.itemId !== itemId));
  };

  // Update qty in bill
  const updateBillItemQty = (itemId, qty) => {
    setBillItems(prev => prev.map(b => {
      if (b.itemId !== itemId) return b;
      const newQty = qty < 1 ? 1 : qty;
      let unitPrice = 0;
      if (b.type === "bottle") {
        const inv = inventory.find(i => i._id === b.inventoryId);
        unitPrice = inv?.liquor?.price || 0;
      } else if (b.type === "shot") {
        const inv = inventory.find(i => i._id === b.inventoryId);
        unitPrice = inv?.liquor?.shotPrices?.[b.shotSize] ? Number(inv.liquor.shotPrices[b.shotSize]) : 0;
      } else if (b.type === "food") {
        const food = foods.find(f => f._id === b.foodId);
        unitPrice = food?.price || 0;
      }
      return { ...b, qty: newQty, price: unitPrice * newQty };
    }));
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
            foodId: b.foodId // NEW
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
            className="border rounded px-3 py-2 w-full max-w-xs"
            placeholder="Search by brand or barcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto mb-8">
          {search.trim() === "" ? (
            <div className="text-gray-500 text-center py-8">Type to search for products by brand or barcode.</div>
          ) : (
            <>
              {/* Liquor Table */}
              <table className="min-w-full bg-white border rounded shadow mb-6">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="py-2 px-4 border">Brand</th>
                    <th className="py-2 px-4 border">Bottle Size (ml)</th>
                    <th className="py-2 px-4 border">Bottles</th>
                    <th className="py-2 px-4 border">Open Volume (ml)</th>
                    <th className="py-2 px-4 border">Shot Prices</th>
                    <th className="py-2 px-4 border">Add Bottle</th>
                    <th className="py-2 px-4 border">Add Shot</th>
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
                      <td className="py-2 px-4 border">{item.liquor.brand}</td>
                      <td className="py-2 px-4 border">{item.liquor.size}</td>
                      <td className="py-2 px-4 border">{item.bottles}</td>
                      <td className="py-2 px-4 border">{item.openVolume || 0}</td>
                      <td className="py-2 px-4 border text-xs">
                        {Object.keys(item.liquor.shotPrices || {}).map(size => (
                          <div key={size}>
                            {size}ml: {item.liquor.shotPrices[size]}
                          </div>
                        ))}
                      </td>
                      <td className="py-2 px-4 border">
                        <button
                          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                          onClick={() => addBottleToBill(item)}
                          disabled={loading || item.bottles < 1}
                        >
                          + Bottle
                        </button>
                      </td>
                      <td className="py-2 px-4 border flex flex-wrap gap-2 justify-center">
                        {Object.keys(item.liquor.shotPrices || {}).map(size => (
                          <button
                            key={size}
                            className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 text-xs"
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
              <table className="min-w-full bg-white border rounded shadow">
                <thead>
                  <tr className="bg-green-100">
                    <th className="py-2 px-4 border">Name</th>
                    <th className="py-2 px-4 border">Price</th>
                    <th className="py-2 px-4 border">Barcode</th>
                    <th className="py-2 px-4 border">Add</th>
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
                      <td className="py-2 px-4 border">{f.name}</td>
                      <td className="py-2 px-4 border">{f.price}</td>
                      <td className="py-2 px-4 border">{f.barcode}</td>
                      <td className="py-2 px-4 border">
                        <button
                          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                          onClick={() => addFoodToBill(f)}
                          disabled={loading}
                        >
                          + Food
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
            <table className="min-w-full bg-white border rounded shadow text-sm mb-2">
              <thead>
                <tr className="bg-blue-50">
                  <th className="py-1 px-2 border">Brand</th>
                  <th className="py-1 px-2 border">Type</th>
                  <th className="py-1 px-2 border">Qty</th>
                  <th className="py-1 px-2 border">Unit</th>
                  <th className="py-1 px-2 border">Price</th>
                  <th className="py-1 px-2 border">Remove</th>
                </tr>
              </thead>
              <tbody>
                {billItems.map(b => (
                  <tr key={b.itemId} className="text-center">
                    <td className="py-1 px-2 border">{b.brand}</td>
                    <td className="py-1 px-2 border">{b.type === "bottle" ? "Bottle" : b.type === "shot" ? `${b.shotSize}ml Shot` : b.type === "food" ? "Portion" : ""}</td>
                    <td className="py-1 px-2 border">
                      <input
                        type="number"
                        min="1"
                        value={b.qty}
                        onChange={e => updateBillItemQty(b.itemId, Number(e.target.value))}
                        className="w-16 px-1 py-0.5 border rounded text-center"
                        disabled={loading}
                      />
                    </td>
                    <td className="py-1 px-2 border">{b.type === "bottle" ? "Bottle" : b.type === "shot" ? "ml" : b.type === "food" ? "Portion" : ""}</td>
                    <td className="py-1 px-2 border">{b.price.toLocaleString()}</td>
                    <td className="py-1 px-2 border">
                      <button
                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
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
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
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
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
  const [cashGiven, setCashGiven] = useState(''); // Start as empty string
  // Add a state to track the last non-empty search
  const [lastSearch, setLastSearch] = useState("");
  // Add state for held bills
  const [heldBills, setHeldBills] = useState(() => {
    const stored = localStorage.getItem('heldBills');
    return stored ? JSON.parse(stored) : [];
  });
  // Add state for held bills UI toggle
  const [showHeldBills, setShowHeldBills] = useState(false);
  // Add state for table name input
  const [tableName, setTableName] = useState("");

  // Save held bills to localStorage when changed
  useEffect(() => {
    localStorage.setItem('heldBills', JSON.stringify(heldBills));
  }, [heldBills]);

  // Helper for API URL
  const apiUrl = (path) => `${import.meta.env.VITE_API_URL}${path}`;

  // Fetch Store 2 inventory
  const fetchInventory = async () => {
    const res = await fetch(apiUrl("/inventory?store=2"));
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
    const res = await fetch(apiUrl("/food"));
    const data = await res.json();
    setFoods(data);
  };

  // Fetch cocktails
  const fetchCocktails = async () => {
    const res = await fetch(apiUrl("/cocktail"));
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
        const res = await fetch(apiUrl('/restaurant'));
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
    // Find available bottles in virtualOpenVolumes or inventory
    const available = virtualOpenVolumes[item._id]?.bottles ?? item.bottles;
    if (available < 1) {
      setError(`Cannot add more bottles. No stock left.`);
      return;
    }
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
    setSearch("");
  };

  // Add shot to bill
  const addShotToBill = (item, shotSize) => {
    const openVolume = virtualOpenVolumes[item._id]?.openVolume ?? item.openVolume ?? 0;
    const bottles = virtualOpenVolumes[item._id]?.bottles ?? item.bottles ?? 0;
    if (openVolume < shotSize && bottles < 1) {
      setError('No stock or open bottle available for shots.');
      return;
    }
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
    setSearch("");
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
    setSearch("");
  };

  const getMissingIngredients = (cocktail, qty = 1) => {
    if (!Array.isArray(cocktail.ingredients)) return [];
    return cocktail.ingredients.map(ing => {
      const inv = inventory.find(row => row.liquor && (row.liquor._id === ing.liquorId || row.liquor.brand === ing.brand));
      if (!inv) return { ...ing, missing: true, reason: 'Not in inventory', available: 0 };
      const openVolume = virtualOpenVolumes[inv._id]?.openVolume ?? inv.openVolume ?? 0;
      const bottles = virtualOpenVolumes[inv._id]?.bottles ?? inv.bottles ?? 0;
      const needed = ing.volume * qty;
      let availableOpen = openVolume;
      let availableBottles = bottles;
      let remaining = needed;
      let available = availableOpen;
      if (availableOpen >= remaining) {
        // Enough open volume
        return null;
      } else {
        remaining -= availableOpen;
        const bottleSize = inv.liquor.size || 750;
        const bottlesNeeded = Math.ceil(remaining / bottleSize);
        if (availableBottles >= bottlesNeeded) {
          // Enough bottles
          return null;
        } else {
          // Not enough
          available += availableBottles * bottleSize;
          return {
            ...ing,
            missing: true,
            reason: `Need ${needed}ml, only ${available}ml available`,
            available
          };
        }
      }
    }).filter(Boolean);
  };

  const canMakeCocktail = (cocktail, qty = 1) => getMissingIngredients(cocktail, qty).length === 0;

  const addCocktailToBill = (cocktail) => {
    const currentQty = billItems.find(b => b.cocktailId === cocktail._id && b.type === "cocktail")?.qty || 0;
    const intendedQty = currentQty + 1;
    const missing = getMissingIngredients(cocktail, intendedQty);
    if (missing.length > 0) {
      setError('Not enough stock for: ' + missing.map(m => `${m.brand || m.name} (${m.reason})`).join(', '));
      return;
    }
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
    setSearch("");
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
      const maxQty = getMaxQtyForBillItem(item);
      const newQty = Math.max(1, Math.min(qty, maxQty));
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
          const invRes = await fetch(`${apiUrl(`/inventory/${b.inventoryId}`)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bottles: inventory.find(i => i._id === b.inventoryId).bottles - b.qty })
          });
          const invData = await invRes.json();
          if (!invRes.ok) throw new Error(invData.message || `Error selling bottle for ${b.brand}`);
          // Log sale
          await fetch(`${apiUrl(`/sale`)}`, {
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
          const invRes = await fetch(`${apiUrl(`/inventory/${b.inventoryId}`)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bottles: newBottles, openVolume: newOpenVolume })
          });
          const invData = await invRes.json();
          if (!invRes.ok) throw new Error(invData.message || `Error selling shot for ${b.brand}`);
          // Log sale
          await fetch(`${apiUrl(`/sale`)}`, {
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
          await fetch(`${apiUrl(`/sale`)}`, {
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
          await fetch(`${apiUrl(`/sale`)}`, {
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
      await fetch(apiUrl('/bill'), {
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

  // Hold current bill
  const handleHoldBill = () => {
    if (billItems.length === 0) return;
    if (!tableName.trim()) {
      setError('Please enter a table name before holding the bill.');
      return;
    }
    if (heldBills.some(b => b.tableName && b.tableName.toLowerCase() === tableName.trim().toLowerCase())) {
      setError('A bill for this table name is already held. Please use a unique table name.');
      return;
    }
    const id = generateBillId();
    setHeldBills(prev => [
      ...prev,
      {
        id,
        billItems,
        cashGiven,
        tableName: tableName.trim(),
        time: new Date().toLocaleString(),
      },
    ]);
    setBillItems([]);
    setCashGiven('');
    setTableName("");
    setSearch("");
    setSuccess('Bill held!');
  };
  // Resume a held bill
  const handleResumeBill = (id) => {
    const bill = heldBills.find(b => b.id === id);
    if (!bill) return;
    setBillItems(bill.billItems);
    setCashGiven(bill.cashGiven);
    setTableName(bill.tableName || ""); // Remember table name
    setHeldBills(heldBills.filter(b => b.id !== id));
    setSuccess('Held bill resumed!');
  };
  // Delete a held bill
  const handleDeleteHeldBill = (id) => {
    setHeldBills(heldBills.filter(b => b.id !== id));
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

  // Helper to calculate max quantity for a bill item
  const getMaxQtyForBillItem = (b) => {
    if (b.type === 'bottle') {
      const inv = inventory.find(i => i._id === b.inventoryId);
      // Use the actual available bottles from virtualOpenVolumes or inventory
      return Math.max(1, virtualOpenVolumes[b.inventoryId]?.bottles ?? inv?.bottles ?? 1);
    } else if (b.type === 'shot') {
      const inv = inventory.find(i => i._id === b.inventoryId);
      const openVolume = virtualOpenVolumes[b.inventoryId]?.openVolume ?? inv?.openVolume ?? 0;
      const bottles = virtualOpenVolumes[b.inventoryId]?.bottles ?? inv?.bottles ?? 0;
      const bottleSize = inv?.liquor?.size || 750;
      let maxShots = 0;
      let remainingOpen = openVolume;
      let remainingBottles = bottles;
      const shotSize = b.shotSize;
      // Use open volume first
      while (remainingOpen >= shotSize) {
        maxShots++;
        remainingOpen -= shotSize;
      }
      // Use bottles
      while (remainingBottles > 0) {
        let bottleOpen = bottleSize;
        while (bottleOpen >= shotSize) {
          maxShots++;
          bottleOpen -= shotSize;
        }
        remainingBottles--;
      }
      return maxShots || 1;
    } else if (b.type === 'cocktail') {
      const cocktail = cocktails.find(c => c._id === b.cocktailId);
      if (!cocktail || !Array.isArray(cocktail.ingredients)) return 1;
      // For each ingredient, calculate max portions
      const maxByIngredient = cocktail.ingredients.map(ing => {
        const inv = inventory.find(row => row.liquor && (row.liquor._id === ing.liquorId || row.liquor.brand === ing.brand));
        if (!inv) return 0;
        const openVolume = virtualOpenVolumes[inv._id]?.openVolume ?? inv.openVolume ?? 0;
        const bottles = virtualOpenVolumes[inv._id]?.bottles ?? inv.bottles ?? 0;
        const bottleSize = inv.liquor.size || 750;
        let available = openVolume + bottles * bottleSize;
        return Math.floor(available / ing.volume);
      });
      return Math.max(1, Math.min(...maxByIngredient));
    } else if (b.type === 'food') {
      // No stock limit for food in this logic
      return 1000;
    }
    return 1;
  };

  if (typeof window !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = `
      input[type=number].no-spinner::-webkit-inner-spin-button, 
      input[type=number].no-spinner::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      input[type=number].no-spinner {
        -moz-appearance: textfield;
      }
    `;
    document.head.appendChild(style);
  }

  return (
    <>
      <Navbar />
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">Sales (Store 2)</h1>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {success && <div className="text-green-600 mb-4">{success}</div>}
        {/* Search input */}
        <div className="mb-4 flex items-center gap-4 relative">
          <input
            type="text"
            ref={searchInputRef}
            className="border rounded-4xl px-6 py-4 w-screen  focus:outline-amber-400 focus:ring-2 focus:ring-amber-400 hover:border-amber-300"
            placeholder="Scan or search by brand or barcode..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              if (e.target.value.trim() !== "") {
                setLastSearch(e.target.value);
              }
            }}
            onFocus={() => setLastSearch("")}
            onKeyDown={e => {
              if (e.key === "Enter") {
                // Optionally, you could trigger a search or move focus
              }
            }}
          />
          {search && (
            <button
              type="button"
              className="absolute right-8 text-gray-400 hover:text-red-500 text-xl focus:outline-none"
              style={{top: '50%', transform: 'translateY(-50%)'}}
              onClick={() => setSearch("")}
              tabIndex={-1}
            >
              ×
            </button>
          )}
        </div>
        {/* Responsive flex layout for search results and bill */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Search Results */}
          <div className="lg:w-2/3 w-full">
            <div className="overflow-x-auto mb-8">
              {(search.trim() === "" && lastSearch.trim() === "") ? (
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
                        const q = search.trim() !== "" ? search.trim().toLowerCase() : lastSearch.trim().toLowerCase();
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
                                {size}ml:LKR {item.liquor.shotPrices[size]}
                              </div>
                            ))}
                          </td>
                          <td className="py-2 px-0.5 border-t border-amber-400">
                            <button
                              className="bg-emerald-500 text-white px-6 py-3 rounded-3xl hover:bg-emerald-600 border border-amber-200 "
                              onClick={() => addBottleToBill(item)}
                              disabled={loading || (virtualOpenVolumes[item._id]?.bottles ?? item.bottles) < 1}
                            >
                              Add
                            </button><br/>
                            <span className=" text-xs text-amber-400 font-semibold">LKR {item.liquor.price}</span>
                          </td>
                          <td className="py-6 px-5  flex flex-wrap gap-2 justify-center border-t border-amber-400 text-center">
                            {Object.keys(item.liquor.shotPrices || {}).map(size => (
                              <button
                                key={size}
                                className="bg-emerald-500 text-white px-3 py-3 rounded-3xl hover:bg-emerald-600 border border-amber-200 "
                                onClick={() => addShotToBill(item, Number(size))}
                                disabled={loading || ((virtualOpenVolumes[item._id]?.openVolume ?? item.openVolume ?? 0) < Number(size) && (virtualOpenVolumes[item._id]?.bottles ?? item.bottles ?? 0) < 1)}
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
                        const q = search.trim() !== "" ? search.trim().toLowerCase() : lastSearch.trim().toLowerCase();
                        if (!q) return false;
                        return (
                          f.name.toLowerCase().includes(q) ||
                          (f.barcode && f.barcode.toLowerCase().includes(q))
                        );
                      }).map(f => (
                        <tr key={f._id} className="text-center">
                          <td className="py-2 px-4 border-t border-amber-400">{f.name}</td>
                          <td className="py-2 px-4 border-t border-amber-400">LKR {f.price}</td>
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
                        const q = search.trim() !== "" ? search.trim().toLowerCase() : lastSearch.trim().toLowerCase();
                        if (!q) return false;
                        return (
                          c.name.toLowerCase().includes(q) ||
                          (c.barcode && c.barcode.toLowerCase().includes(q))
                        );
                      }).map(c => (
                        <tr key={c._id} className="text-center">
                          <td className="py-2 px-4 border-t border-amber-400">{c.name}</td>
                          <td className="py-2 px-4 border-t border-amber-400">LKR {c.price}</td>
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
                              disabled={loading || getMissingIngredients(c, 1).length > 0}
                              title={getMissingIngredients(c, 1).length > 0 ? 'Missing: ' + getMissingIngredients(c, 1).map(m => `${m.brand || m.name} (${m.reason})`).join(', ') : ''}
                            >
                              + Cocktail
                            </button>
                            {getMissingIngredients(c, 1).length > 0 && (
                              <div className="text-xs text-red-500 mt-1">Missing: {getMissingIngredients(c, 1).map(m => `${m.brand || m.name} (${m.reason})`).join(', ')}</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
          {/* Right: Bill Builder Section */}
          <div className="lg:w-1/3 w-full mb-8">
            <h2 className="text-xl font-bold mb-2">Current Bill</h2>
            <div className="flex flex-col gap-2 mb-2">
              <input
                type="text"
                className="border rounded-3xl px-3 py-2 w-full"
                placeholder="Table name (required before hold)"
                value={tableName}
                onChange={e => setTableName(e.target.value)}
              />
              <button
                className="bg-yellow-500 text-white px-4 py-2 rounded-3xl hover:bg-yellow-600"
                onClick={handleHoldBill}
                disabled={billItems.length === 0}
              >
                Hold Bill
              </button>
            </div>
            {/* Add state for held bills UI toggle */}
            <div className="mb-4">
              <button
                className={`bg-gray-700 text-white px-4 py-2 rounded-3xl text-sm hover:bg-gray-800 mb-2 ${showHeldBills ? 'bg-gray-800' : ''}`}
                onClick={() => setShowHeldBills(v => !v)}
              >
                {showHeldBills ? 'Hide Held Bills' : `Show Held Bills (${heldBills.length})`}
              </button>
              {showHeldBills && heldBills.length > 0 && (
                <div className="bg-white text-black rounded shadow-lg p-2 max-h-64 overflow-y-auto mb-2">
                  <div className="font-bold mb-2 text-gray-700">Held Bills</div>
                  {heldBills.map(bill => (
                    <div key={bill.id} className="flex justify-between items-center border-b border-gray-200 py-1">
                      <div>
                        <div className="font-mono text-xs">{bill.time}</div>
                        <div className="text-xs text-gray-500">Table: {bill.tableName || '-'}</div>
                        <div className="text-xs text-gray-500">Items: {bill.billItems.length}</div>
                      </div>
                      <div className="flex gap-1">
                        <button className="bg-green-500 text-white px-2 py-1 rounded-3xl text-xs hover:bg-green-600" onClick={() => handleResumeBill(bill.id)}>Resume</button>
                        <button className="bg-red-500 text-white px-2 py-1 rounded-3xl text-xs hover:bg-red-600" onClick={() => handleDeleteHeldBill(bill.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {billItems.length === 0 ? (
              <div className="text-gray-500">No items in bill. Add bottles or shots above.</div>
            ) : (
              <>
                {/* Cash input for customer payment */}
                <div className="flex items-center mb-2">
                  <label htmlFor="cashGiven" className="mr-2 font-semibold text-sm text-gray-200">Cash Given:</label>
                  <input
                    id="cashGiven"
                    type="number"
                    min="0"
                    value={cashGiven}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d+$/.test(val)) setCashGiven(val);
                    }}
                    className="w-28 px-2 py-1 border rounded-3xl text-right border-amber-400 bg-black text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder=""
                  />
                </div>
                <table className="min-w-full bg-gray-900 rounded shadow text-sm mb-2">
                  <thead>
                    <tr className="bg-gray-900">
                      <th className="py-1 px-2 ">Brand</th>
                      <th className="py-1 px-2 ">Type</th>
                      <th className="py-1 px-2 ">Qty</th>
                      <th className="py-1 px-2 ">Unit</th>
                      <th className="py-1 px-2 ">Price LKR</th>
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
                            max={getMaxQtyForBillItem(b)}
                            value={b.qty}
                            onChange={e => {
                              const val = Number(e.target.value);
                              const max = getMaxQtyForBillItem(b);
                              if (val > max) {
                                setError(`Cannot set quantity above available stock (${max}).`);
                                updateBillItemQty(b.itemId, max);
                              } else {
                                updateBillItemQty(b.itemId, val);
                              }
                            }}
                            className="w-16 px-2 py-3 border rounded-3xl text-center border-amber-400 no-spinner"
                            disabled={loading}
                            style={b.qty === getMaxQtyForBillItem(b) ? { pointerEvents: 'auto' } : {}}
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
                <div className="flex justify-end mb-2">
                  <span className="font-bold text-lg text-amber-400">Total: LKR {billItems.reduce((sum, b) => sum + b.price, 0).toLocaleString()}</span>
                </div>
                {/* Show change to give to customer */}
                <div className="flex justify-end mb-2">
                  <span className="font-semibold text-md text-green-400">
                    Change:LKR {cashGiven !== '' && !isNaN(Number(cashGiven)) ? (Number(cashGiven) - billItems.reduce((sum, b) => sum + b.price, 0)).toLocaleString() : '0'}
                  </span>
                </div>
              </>
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
        </div>
        {/* Bill Modal */}
        {bill && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white p-6 rounded shadow w-full max-w-sm">
              <div className="flex justify-end gap-2 mb-2 print:hidden">
                <button onClick={handlePrint} className="bg-blue-600 text-white px-6 py-2 rounded-3xl hover:bg-blue-700">Print</button>
                <button onClick={handleDownloadPDF} className="bg-green-600 text-white px-3 py-1 rounded-3xl hover:bg-green-700">Download PDF</button>
              </div>
              <div ref={receiptRef} className="receipt-area mx-auto" style={{background:'#fff',color:'#000',fontFamily:'Arial, sans-serif',width:'70mm',maxWidth:'70mm',minWidth:'70mm',padding:'0.5em',fontSize:'15px'}}>
                <h2 style={{fontWeight:'bold',fontSize:'1.5rem',marginBottom:'0.7rem',textAlign:'center',lineHeight:1.3,padding:'0.2em 0'}}>Bill / Receipt</h2>
                <div style={{borderTop:'2px solid #555',margin:'0.7rem 0'}}></div>
                {/* Restaurant details below heading */}
                <div style={{marginBottom:'0.7rem',textAlign:'center'}}>
                  <div style={{fontWeight:'bold',fontSize:'1.3rem',lineHeight:1.3,padding:'0.2em 0'}}>{restaurant.name}</div>
                  <div style={{fontSize:'1.1rem',color:'#333',whiteSpace:'pre-line'}}>{restaurant.address}</div>
                  <div style={{fontSize:'1.1rem',color:'#333'}}>{restaurant.phone}</div>
                  <div style={{fontSize:'1.1rem',color:'#333'}}>{restaurant.email}</div>
                </div>
                <div style={{borderTop:'2px solid #555',margin:'0.7rem 0'}}></div>
                <div style={{marginBottom:'0.7rem',fontSize:'1.1rem',color:'#555'}}>Bill ID: {bill.billId}</div>
                <div style={{marginBottom:'0.7rem',fontSize:'1.1rem'}}>{bill.time}</div>
                <div style={{borderTop:'2px solid #555',margin:'0.7rem 0'}}></div>
                <table style={{width:'100%',marginBottom:'1.2rem',fontSize:'1.1rem',tableLayout:'fixed',wordBreak:'break-word'}}>
                  <thead>
                    <tr style={{borderBottom:'1px solid #bbb'}}>
                      <th style={{textAlign:'left'}}>Item</th>
                      <th style={{textAlign:'right'}}>Qty</th>
                      <th style={{textAlign:'right'}}>Unit Price</th>
                      <th style={{textAlign:'right'}}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.items.map((item, idx) => {
                      let unitPrice = 0;
                      if (item.type === 'bottle') {
                        unitPrice = item.price / item.qty;
                      } else if (item.type === 'shot') {
                        unitPrice = item.price / item.qty;
                      } else if (item.type === 'food') {
                        unitPrice = item.price / item.qty;
                      } else if (item.type === 'cocktail') {
                        unitPrice = item.price / item.qty;
                      }
                      return (
                        <tr key={idx}>
                          <td style={{wordBreak:'break-word'}}>{
                            item.type === "shot"
                              ? `${item.brand} (${item.qty} x ${item.shotSize}ml)`
                              : item.type === "food"
                              ? item.brand
                              : item.type === "cocktail"
                              ? `${item.brand} (${item.qty} x ${Array.isArray(item.ingredients) ? item.ingredients.length : 1} Portion)`
                              : item.brand
                          }</td>
                          <td style={{textAlign:'right'}}>{item.qty}</td>
                          <td style={{textAlign:'right'}}>LKR {unitPrice.toLocaleString()}</td>
                          <td style={{textAlign:'right'}}>LKR {item.price.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{borderTop:'2px solid #555',margin:'0.7rem 0'}}></div>
                <div style={{fontWeight:'bold',textAlign:'right',marginBottom:'1.2rem',fontSize:'1.2rem'}}>Total: {bill.total.toLocaleString()}</div>
                {/* Cash and Change for print */}
                <div style={{textAlign:'right',fontSize:'1.1rem',marginBottom:'0.3rem'}}>Cash: {cashGiven !== '' && !isNaN(Number(cashGiven)) ? Number(cashGiven).toLocaleString() : '0'}</div>
                <div style={{textAlign:'right',fontSize:'1.1rem',marginBottom:'0.7rem'}}>Change: {cashGiven !== '' && !isNaN(Number(cashGiven)) ? (Number(cashGiven) - bill.total).toLocaleString() : '0'}</div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={closeBill} className="bg-gray-400 text-white px-4 py-2 rounded-3xl hover:bg-gray-500">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sales; 

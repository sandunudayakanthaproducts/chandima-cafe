import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from "recharts";

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({ totalSales: 0, bottles: 0, cocktails: 0, food: 0 });
  const [salesTrend, setSalesTrend] = useState([]);
  const [categoryTrend, setCategoryTrend] = useState([]);
  const [todayPie, setTodayPie] = useState([]);

  useEffect(() => {
    const fetchTodaySummary = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/bill");
        const bills = await res.json();
        // Filter bills for today
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const todayBills = bills.filter(bill => {
          const billDate = bill.time ? new Date(bill.time) : null;
          if (!billDate) return false;
          return billDate >= start && billDate <= end;
        });
        let totalSales = 0;
        let bottles = 0;
        let cocktails = 0;
        let food = 0;
        todayBills.forEach(bill => {
          totalSales += bill.total || 0;
          bill.items?.forEach(item => {
            if (item.type === "bottle") bottles += item.qty;
            if (item.type === "cocktail") cocktails += item.qty;
            if (item.type === "food") food += item.qty;
          });
        });
        setSummary({ totalSales, bottles, cocktails, food });

        // --- Sales trend for last 7 days ---
        const billsByDay = {};
        bills.forEach(bill => {
          const billDate = bill.time ? new Date(bill.time) : null;
          if (!billDate) return;
          const dayKey = billDate.toISOString().slice(0, 10); // YYYY-MM-DD
          if (!billsByDay[dayKey]) billsByDay[dayKey] = [];
          billsByDay[dayKey].push(bill);
        });
        // Get last 7 days (including today, even if no data)
        const trend = [];
        const catTrend = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          const dayBills = billsByDay[key] || [];
          let dayTotal = 0, dayBottles = 0, dayCocktails = 0, dayFood = 0;
          dayBills.forEach(bill => {
            dayTotal += bill.total || 0;
            bill.items?.forEach(item => {
              if (item.type === "bottle") dayBottles += item.qty;
              if (item.type === "cocktail") dayCocktails += item.qty;
              if (item.type === "food") dayFood += item.qty;
            });
          });
          trend.push({ date: key.slice(5), sales: dayTotal });
          catTrend.push({ date: key.slice(5), Bottles: dayBottles, Cocktails: dayCocktails, Food: dayFood });
        }
        setSalesTrend(trend);
        setCategoryTrend(catTrend);

        // --- Pie chart for today's sales breakdown ---
        const pieData = [
          { name: "Bottles", value: bottles },
          { name: "Cocktails", value: cocktails },
          { name: "Food", value: food }
        ];
        setTodayPie(pieData);
      } catch (err) {
        setError("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };
    fetchTodaySummary();
  }, []);

  const pieColors = ["#ffe082", "#ffca28", "#ffb300"];

  return (
    <>
      <Navbar />
      <div className="p-0 max-w-6xl mx-auto bg-black min-h-screen">
        <h1 className="text-3xl font-bold mb-6 text-white">Welcome to the Bar Management System</h1>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-gray-900 to-gray-900 text-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
            <div className="text-4xl font-bold mb-2 ">LKR{summary.totalSales.toLocaleString()}</div>
            <div className="uppercase text-xs tracking-widest">Total Sales</div>
          </div>
          <div className="bg-gradient-to-br from-amber-300 to-amber-400 text-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
            <div className="text-4xl font-bold mb-2">{summary.bottles}</div>
            <div className="uppercase text-xs tracking-widest">Bottles Sold</div>
          </div>
          <div className="bg-gradient-to-br from-amber-300 to-amber-400 text-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
            <div className="text-4xl font-bold mb-2">{summary.cocktails}</div>
            <div className="uppercase text-xs tracking-widest">Cocktails Sold</div>
          </div>
          <div className="bg-gradient-to-br from-amber-300 to-amber-400 text-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
            <div className="text-4xl font-bold mb-2">{summary.food}</div>
            <div className="uppercase text-xs tracking-widest">Food Sold</div>
          </div>
        </div>
        {/* Charts Row */}
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          {/* Sales Trend Chart */}
          <div className="bg-gray-900 rounded-3xl shadow p-8 flex-1 min-w-[320px]">
            <h2 className="text-xl font-semibold mb-4 text-white">Sales Trend (Last 7 Days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 4" stroke="#444" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#fff' }} axisLine={{stroke:'#fff'}} tickLine={{stroke:'#fff'}} />
                <YAxis tick={{ fontSize: 12, fill: '#fff' }} axisLine={{stroke:'#fff'}} tickLine={{stroke:'#fff'}} />
                <Tooltip contentStyle={{ background: '#222', border: 'none', color: '#fff' }} labelStyle={{ color: '#ff8f00' }} formatter={v => `LKR${v.toLocaleString()}`} />
                <Line type="monotone" dataKey="sales" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4, fill: '#fff' }} activeDot={{ r: 6, fill: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Category Trend Bar Chart */}
          <div className="bg-gray-900 rounded-3xl shadow p-8 flex-1 min-w-[320px]">
            <h2 className="text-xl font-semibold mb-4 text-white">Category Sales (Last 7 Days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#fff' }} axisLine={{stroke:'#fff'}} tickLine={{stroke:'#fff'}} />
                <YAxis tick={{ fontSize: 12, fill: '#fff' }} axisLine={{stroke:'#fff'}} tickLine={{stroke:'#fff'}} />
                <Tooltip contentStyle={{ background: '#222', border: 'none', color: '#fff' }} labelStyle={{ color: '#fff' }} />
                <Legend wrapperStyle={{ color: '#fff' }} />
                <Bar dataKey="Bottles" fill="#ffe082" />
                <Bar dataKey="Cocktails" fill="#ffca28" />
                <Bar dataKey="Food" fill="#ffb300" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Today's Sales Breakdown Pie Chart */}
          <div className="bg-gray-900 rounded-3xl shadow p-8 flex-1 min-w-[320px]">
            <h2 className="text-xl font-semibold mb-4 text-white">Today's Sales Breakdown</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={todayPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fill="#fff">
                  {todayPie.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#222', border: 'none', color: '#fff' }} labelStyle={{ color: '#fff' }} />
                <Legend wrapperStyle={{ color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-gray-900 rounded-2xl shadow p-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-2 text-white">Quick Actions</h2>
            <ul className="space-y-2">
              <li><span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-2"></span><span className="text-white">View Monthly Report</span></li>
              <li><span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-2"></span><span className="text-white">Manage Inventory</span></li>
              <li><span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-2"></span><span className="text-white">Check Bill History</span></li>
              <li><span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-2"></span><span className="text-white">Manage Users</span></li>
            </ul>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <svg width="120" height="120" fill="none" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="56" stroke="#3B82F6" strokeWidth="8" fill="#18181b" />
              <path d="M40 80c0-11 9-20 20-20s20 9 20 20" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round" />
              <circle cx="60" cy="54" r="8" fill="#3B82F6" />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard; 
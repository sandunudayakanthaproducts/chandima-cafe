import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";

const RestaurantDetails = () => {
  const [details, setDetails] = useState({
    name: "",
    phone: "",
    address: "",
    email: ""
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [hasDetails, setHasDetails] = useState(false);

  const apiUrl = (path) => `${import.meta.env.VITE_API_URL}${path}`;

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(apiUrl("/restaurant"));
        if (!res.ok) return;
        const data = await res.json();
        setDetails(data);
        setHasDetails(!!(data && data.name));
      } catch {}
    };
    fetchDetails();
  }, []);

  const handleChange = e => {
    setDetails({ ...details, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");
    try {
      let payload = { ...details };
      const method = hasDetails ? "PUT" : "POST";
      const res = await fetch(apiUrl("/restaurant"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to save details");
      setSuccess(hasDetails ? "Details updated successfully" : "Details added successfully");
      setHasDetails(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete the restaurant details?")) return;
    setLoading(true);
    setSuccess("");
    setError("");
    try {
      const res = await fetch(apiUrl("/restaurant"), { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete details");
      setDetails({ name: "", phone: "", address: "", email: "" });
      setHasDetails(false);
      setSuccess("Details deleted successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="p-8 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-4">Restaurant Details</h1>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        {success && <div className="text-green-600 mb-2">{success}</div>}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block font-medium mb-1">Name</label>
            <input name="name" value={details.name} onChange={handleChange} className="w-full px-3 py-2 border rounded-3xl" required />
          </div>
          <div>
            <label className="block font-medium mb-1">Phone</label>
            <input name="phone" value={details.phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-3xl" required />
          </div>
          <div>
            <label className="block font-medium mb-1">Email</label>
            <input name="email" value={details.email} onChange={handleChange} className="w-full px-3 py-2 border rounded-3xl" required />
          </div>
          <div>
            <label className="block font-medium mb-1">Address</label>
            <textarea name="address" value={details.address} onChange={handleChange} className="w-full px-3 py-2 border rounded-3xl" required />
          </div>
          <div className="flex justify-end gap-2">
            {!hasDetails && (
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-3xl hover:bg-blue-700" disabled={loading}>
                {loading ? "Adding..." : "Add"}
              </button>
            )}
            {hasDetails && (
              <>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-3xl hover:bg-blue-700" disabled={loading}>
                  {loading ? "Updating..." : "Update"}
                </button>
                <button type="button" className="bg-red-600 text-white px-4 py-2 rounded-3xl hover:bg-red-700" onClick={handleDelete} disabled={loading}>
                  Delete
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </>
  );
};

export default RestaurantDetails; 
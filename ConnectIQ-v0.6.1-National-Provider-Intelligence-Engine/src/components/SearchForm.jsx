import { useState } from "react";

export default function SearchForm({ onSearch, loading }) {
  const [form, setForm] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSearch(form);
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <label>Street Address</label>
      <input name="street" value={form.street} onChange={handleChange} required />

      <label>City</label>
      <input name="city" value={form.city} onChange={handleChange} required />

      <label>State</label>
      <input name="state" value={form.state} onChange={handleChange} required />

      <label>ZIP</label>
      <input name="zip" value={form.zip} onChange={handleChange} required />

      <button type="submit" disabled={loading}>
        {loading ? "Searching..." : "Search Availability"}
      </button>
    </form>
  );
}
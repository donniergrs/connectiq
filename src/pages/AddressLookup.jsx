import { useState } from "react";
import SearchForm from "../components/SearchForm";
import SearchResults from "../components/SearchResults";
import LoadingSpinner from "../components/LoadingSpinner";
import { lookupProviders } from "../services/fccService";
import { saveLookup } from "../services/firestoreService";
import { useAuth } from "../context/AuthContext";

export default function AddressLookup() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [searchedAddress, setSearchedAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(address) {
    setLoading(true);
    setError("");
    setResults([]);
    setSearchedAddress(address);

    try {
      const providers = await lookupProviders(address);
      setResults(providers);

      saveLookup({ address, providers, user }).catch((err) => {
        console.error("Firestore save failed:", err);
      });
    } catch (err) {
      console.error(err);
      setError("Unable to complete lookup. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1>Address Lookup</h1>
      <p className="page-subtitle">
        Search a customer address to identify broadband provider availability.
      </p>

      <div className="lookup-layout">
        <SearchForm onSearch={handleSearch} loading={loading} />

        <div className="lookup-results">
          {loading && <LoadingSpinner />}
          {error && <div className="error">{error}</div>}

          {searchedAddress && results.length > 0 && (
            <div className="lookup-summary">
              <h2>Available Providers</h2>
              <p>
                {searchedAddress.street}, {searchedAddress.city},{" "}
                {searchedAddress.state} {searchedAddress.zip}
              </p>
            </div>
          )}

          <SearchResults results={results} />
        </div>
      </div>
    </>
  );
}
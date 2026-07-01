import { useEffect, useRef, useState } from "react";

export default function AddressAutocomplete({ value, onChange, onSelect }) {
  const inputRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error("Missing VITE_GOOGLE_MAPS_API_KEY");
      return;
    }

    if (window.google?.maps?.places) {
      setLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!loaded || !inputRef.current || !window.google?.maps?.places) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: { country: "us" },
      fields: ["address_components", "formatted_address", "geometry"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();

      const getComponent = (type) =>
        place.address_components?.find((component) =>
          component.types.includes(type)
        )?.long_name || "";

      const getShortComponent = (type) =>
        place.address_components?.find((component) =>
          component.types.includes(type)
        )?.short_name || "";

      const streetNumber = getComponent("street_number");
      const route = getComponent("route");

      const parsed = {
        full: place.formatted_address || inputRef.current.value,
        street: `${streetNumber} ${route}`.trim(),
        city: getComponent("locality") || getComponent("sublocality") || "",
        state: getShortComponent("administrative_area_level_1"),
        zip: getComponent("postal_code"),
        latitude: place.geometry?.location?.lat?.() || null,
        longitude: place.geometry?.location?.lng?.() || null,
      };

      onChange(parsed.full);
      onSelect(parsed);
    });
  }, [loaded, onChange, onSelect]);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Start typing your address"
      required
    />
  );
}

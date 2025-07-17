import React, { useState, useEffect } from "react";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import axios from "axios";

interface PlaceSuggestion {
  description: string;
  place_id: string;
}

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: PlaceSuggestion) => void;
}

const fetchPlaceSuggestions = async (input: string): Promise<PlaceSuggestion[]> => {
  const cleaned = input.replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned.length < 3) return [];
  const url = `/api/places-autocomplete`;
  const params = {
    input,
    language: "en",
    types: "geocode",
    components: 'country:NZ',
  };
  try {
    const res = await axios.get(url, { params });
    if (res.data.status === "OK") {
      return res.data.predictions.map((item: any) => ({
        description: item.description,
        place_id: item.place_id,
      }));
    }
    return [];
  } catch (e) {
    return [];
  }
};

export default function AddressInput({ value, onChange, onSelect }: AddressInputProps) {
  const [options, setOptions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const cleaned = value.replace(/\s+/g, ' ').trim();
    if (!cleaned || cleaned.length < 3) {
      setOptions([]);
      return;
    }
    setLoading(true);
    const handler = setTimeout(() => {
      fetchPlaceSuggestions(value).then((results) => {
        if (active) setOptions(results);
        setLoading(false);
      });
    }, 500);
    return () => {
      active = false;
      clearTimeout(handler);
    };
  }, [value]);

  return (
    <Autocomplete
      freeSolo
      options={options}
      getOptionLabel={(option) => typeof option === "string" ? option : option.description || ""}
      loading={loading}
      inputValue={value}
      onInputChange={(_, newInputValue) => onChange(newInputValue)}
      onChange={(_, newValue) => {
        if (newValue) {
          onSelect(newValue as PlaceSuggestion);
          setTimeout(() => onChange(""), 0); // 延迟清空，确保覆盖 MUI 的自动填充
        }
      }}
      renderInput={(params) => (
        <TextField {...params} label="Enter Address" variant="outlined" fullWidth />
      )}
    />
  );
} 
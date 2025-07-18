"use client";
import dynamic from "next/dynamic";
import { useState } from "react";

const LeafletMap = dynamic(() => import("../../components/LeafletMap"), {
  ssr: false,
});

export default function MapPage() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  return (
    <LeafletMap
      origin={origin}
      destination={destination}
      onOriginChange={setOrigin}
      onDestinationChange={setDestination}
    />
  );
} 
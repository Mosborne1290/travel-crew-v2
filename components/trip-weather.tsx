"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Destination = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
};

type LocationResult = {
  id: number;
  name: string;
  admin1: string | null;
  country: string | null;
  country_code: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
};

type Forecast = {
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    weather_code: number[];
  };
};

function weatherLabel(code: number | undefined) {
  if (code == null) return "Weather";
  if (code === 0) return "Clear";
  if ([1,2,3].includes(code)) return "Partly cloudy";
  if ([45,48].includes(code)) return "Fog";
  if ([51,53,55,56,57].includes(code)) return "Drizzle";
  if ([61,63,65,66,67].includes(code)) return "Rain";
  if ([71,73,75,77].includes(code)) return "Snow";
  if ([80,81,82].includes(code)) return "Showers";
  if ([85,86].includes(code)) return "Snow showers";
  if ([95,96,99].includes(code)) return "Thunderstorm";
  return "Weather";
}

function weatherEmoji(code: number | undefined) {
  if (code == null) return "🌤️";
  if (code === 0) return "☀️";
  if ([1,2,3].includes(code)) return "🌤️";
  if ([45,48].includes(code)) return "🌫️";
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return "🌧️";
  if ([71,73,75,77,85,86].includes(code)) return "❄️";
  if ([95,96,99].includes(code)) return "⛈️";
  return "🌤️";
}

export function TripWeather({
  tripId,
  initialDestination,
}: {
  tripId: string;
  initialDestination: Destination | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [destination, setDestination] = useState(initialDestination);
  const [query, setQuery] = useState(initialDestination?.name || "");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadForecast(dest: Destination) {
    if (dest.latitude == null || dest.longitude == null) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/weather?lat=${dest.latitude}&lon=${dest.longitude}&timezone=${encodeURIComponent(dest.timezone || "auto")}`,
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Weather could not be loaded.");
      setForecast(payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Weather could not be loaded.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (initialDestination?.latitude != null && initialDestination.longitude != null) {
      loadForecast(initialDestination);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function searchLocation() {
    if (!query.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/location/search?q=${encodeURIComponent(query.trim())}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Location search failed.");
      setResults(payload.results ?? []);
      if (!(payload.results ?? []).length) setMessage("No matching locations found.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Location search failed.");
    } finally {
      setBusy(false);
    }
  }

  async function chooseLocation(result: LocationResult) {
    if (!destination) {
      setMessage("This trip needs a destination record before weather can be saved.");
      return;
    }

    setBusy(true);
    const { error } = await supabase
      .from("destinations")
      .update({
        name: result.name,
        city: result.name,
        country: result.country,
        country_code: result.country_code,
        latitude: result.latitude,
        longitude: result.longitude,
        timezone: result.timezone,
      })
      .eq("id", destination.id)
      .eq("trip_id", tripId);

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    const next: Destination = {
      ...destination,
      name: result.name,
      city: result.name,
      country: result.country,
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone,
    };
    setDestination(next);
    setQuery([result.name, result.country].filter(Boolean).join(", "));
    setResults([]);
    await loadForecast(next);
    setBusy(false);
  }

  async function shareWeather() {
    if (!forecast?.current || !destination) return;
    const { error } = await supabase.rpc("share_trip_item_to_chat", {
      p_trip_id: tripId,
      p_message_text: `🌤 ${destination.name}: ${Math.round(forecast.current.temperature_2m)}°C, ${weatherLabel(forecast.current.weather_code)} · Wind ${Math.round(forecast.current.wind_speed_10m)} km/h`,
      p_message_type: "text",
    });
    setMessage(error ? error.message : "Weather shared to trip chat.");
  }

  return (
    <div className="weather-stage4">
      <section className="panel">
        <div className="section-title-row">
          <div>
            <h2>Trip Weather</h2>
            <div className="muted">14-day forecast powered by Open-Meteo.</div>
          </div>
        </div>

        <div className="weather-search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search destination, e.g. Vancouver"
          />
          <button className="secondary" type="button" onClick={searchLocation} disabled={busy}>
            Find location
          </button>
        </div>

        {results.length ? (
          <div className="location-results">
            {results.map((result) => (
              <button key={result.id} type="button" onClick={() => chooseLocation(result)}>
                <strong>{result.name}</strong>
                <span>{[result.admin1, result.country].filter(Boolean).join(", ")}</span>
              </button>
            ))}
          </div>
        ) : null}

        {message ? <div className="error">{message}</div> : null}
      </section>

      {forecast?.current ? (
        <>
          <section className="weather-current">
            <div>
              <div className="eyebrow">Current conditions</div>
              <h2>{destination?.name}</h2>
              <div className="weather-big">{Math.round(forecast.current.temperature_2m)}°C</div>
              <div>{weatherLabel(forecast.current.weather_code)}</div>
            </div>
            <div className="weather-symbol">{weatherEmoji(forecast.current.weather_code)}</div>
            <div className="weather-details">
              <div><span>Feels like</span><strong>{Math.round(forecast.current.apparent_temperature)}°C</strong></div>
              <div><span>Wind</span><strong>{Math.round(forecast.current.wind_speed_10m)} km/h</strong></div>
              <div><span>Rain now</span><strong>{forecast.current.precipitation ?? 0} mm</strong></div>
            </div>
          </section>

          <section className="forecast-grid">
            {forecast.daily?.time.map((date, index) => (
              <article className="forecast-card" key={date}>
                <strong>
                  {new Intl.DateTimeFormat("en-AU", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                  }).format(new Date(`${date}T00:00:00Z`))}
                </strong>
                <div className="forecast-emoji">{weatherEmoji(forecast.daily?.weather_code[index])}</div>
                <div>{weatherLabel(forecast.daily?.weather_code[index])}</div>
                <div className="forecast-temp">
                  <strong>{Math.round(forecast.daily?.temperature_2m_max[index] ?? 0)}°</strong>
                  <span>{Math.round(forecast.daily?.temperature_2m_min[index] ?? 0)}°</span>
                </div>
                <small>Rain {Math.round(forecast.daily?.precipitation_probability_max[index] ?? 0)}%</small>
              </article>
            ))}
          </section>
        </>
      ) : (
        <div className="empty-state">
          <h3>Choose the correct destination</h3>
          <p className="muted">Once the location is confirmed, Travel Crew will show the 14-day forecast here.</p>
        </div>
      )}
    </div>
  );
}

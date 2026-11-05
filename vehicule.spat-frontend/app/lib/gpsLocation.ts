export interface LieuGps {
  quartier: string | null;
  route: string | null;
  commune: string | null;
}

type NominatimResponse = {
  address?: {
    neighbourhood?: string;
    quarter?: string;
    suburb?: string;
    city_district?: string;
    borough?: string;
    road?: string;
    pedestrian?: string;
    residential?: string;
    highway?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
  };
};

const cache = new Map<string, LieuGps>();
let prochaineRequeteDisponible = 0;

function attendre(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Requête annulée", "AbortError"));
      return;
    }
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("Requête annulée", "AbortError"));
    }, { once: true });
  });
}

export async function chercherLieuGps(latitude: number, longitude: number, signal?: AbortSignal): Promise<LieuGps> {
  const cle = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const existant = cache.get(cle);
  if (existant) return existant;

  const delai = Math.max(0, prochaineRequeteDisponible - Date.now());
  await attendre(delai, signal);
  prochaineRequeteDisponible = Date.now() + 1100;

  const params = new URLSearchParams({
    format: "jsonv2",
    lat: latitude.toString(),
    lon: longitude.toString(),
    zoom: "18",
    addressdetails: "1",
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error(`Géolocalisation indisponible (HTTP ${response.status}).`);

  const data = await response.json() as NominatimResponse;
  const address = data.address || {};
  const lieu: LieuGps = {
    quartier: address.neighbourhood || address.quarter || address.suburb || address.city_district || address.borough || null,
    route: address.road || address.pedestrian || address.residential || address.highway || null,
    commune: address.city || address.town || address.village || address.municipality || address.county || null,
  };
  cache.set(cle, lieu);
  return lieu;
}

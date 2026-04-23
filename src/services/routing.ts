import { BRAZIL_CAPITALS } from '../data/capitals';

export async function geocodeCity(city: string) {
  const emailParam = '&email=calculadora.antt.app@example.com';
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ', Brasil')}&limit=1${emailParam}`);
  if (!res.ok) throw new Error(`Falha ao buscar a cidade: ${city}`);
  const data = await res.json();
  if (!data || data.length === 0) throw new Error(`Cidade não encontrada: ${city}`);
  return { lat: Number(data[0].lat), lon: Number(data[0].lon) };
}

export async function getRouteDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  try {
    const resRoute = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`);
    if (!resRoute.ok) throw new Error('OSRM API error');
    const dataRoute = await resRoute.json();
    
    if (dataRoute.code === 'Ok' && dataRoute.routes && dataRoute.routes.length > 0) {
      return dataRoute.routes[0].distance / 1000;
    } else {
      throw new Error('OSRM route not found');
    }
  } catch (osrmError) {
    console.warn("OSRM falhou, usando cálculo de distância em linha reta com fator de correção.", osrmError);
    return calculateStraightLineDistance(lat1, lon1, lat2, lon2) * 1.3;
  }
}

export async function calculateRouteDetails(origin: string, destination: string) {
  try {
    const originCoords = await geocodeCity(origin);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Respect Nominatim limits
    const destCoords = await geocodeCity(destination);

    const distanceKm = await getRouteDistance(originCoords.lat, originCoords.lon, destCoords.lat, destCoords.lon);
    const estimatedTolls = Math.floor(distanceKm / 80) * 9.50;

    return {
      distance: Math.round(distanceKm),
      tolls: estimatedTolls
    };
  } catch (error) {
    console.error("Erro ao calcular rota:", error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Erro de conexão. Verifique sua internet ou tente novamente mais tarde.');
    }
    throw error;
  }
}

export async function calculateBatchRoutes(origin: string) {
  try {
    // 1. Geocode origin
    const originCoords = await geocodeCity(origin);

    // 2. Build OSRM Table API URL
    // Format: {lon},{lat};{lon},{lat}...
    // First coordinate is the origin, the rest are the 27 capitals
    const coords = [
      `${originCoords.lon},${originCoords.lat}`,
      ...BRAZIL_CAPITALS.map(c => `${c.lon},${c.lat}`)
    ].join(';');

    // sources=0 means we only want distances FROM the first coordinate TO all others
    // annotations=distance means we want the distance matrix (in meters)
    const tableUrl = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=distance`;

    const res = await fetch(tableUrl);
    if (!res.ok) throw new Error('Falha ao calcular rotas em lote via OSRM');
    
    const data = await res.json();
    if (data.code !== 'Ok' || !data.distances || data.distances.length === 0) {
      throw new Error('OSRM Table API não retornou distâncias válidas');
    }

    // data.distances[0] contains an array of distances from origin to all coordinates
    // Index 0 is origin->origin (0 meters). Indexes 1..27 are origin->capitals.
    const distancesFromOrigin = data.distances[0];

    const results = BRAZIL_CAPITALS.map((capital, index) => {
      // index + 1 because distancesFromOrigin[0] is the origin itself
      const distanceMeters = distancesFromOrigin[index + 1];
      
      let distanceKm = 0;
      if (distanceMeters !== null && distanceMeters !== undefined) {
        distanceKm = distanceMeters / 1000;
      } else {
        // Fallback to straight line if OSRM couldn't route to this specific capital
        distanceKm = calculateStraightLineDistance(originCoords.lat, originCoords.lon, capital.lat, capital.lon) * 1.3;
      }

      const estimatedTolls = Math.floor(distanceKm / 80) * 9.50;

      return {
        destination: `${capital.city}, ${capital.uf}`,
        distance: Math.round(distanceKm),
        tolls: estimatedTolls
      };
    });

    return results;
  } catch (error) {
    console.error("Erro ao calcular rotas em lote:", error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Erro de conexão com o servidor de rotas. Verifique sua internet.');
    }
    throw error;
  }
}

function calculateStraightLineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

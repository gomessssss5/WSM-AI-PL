import React, { useEffect, useState } from 'react';
import { MapPin, Search, ExternalLink, RefreshCw, Star } from 'lucide-react';

interface WsmMapComponentProps {
  key?: string;
  lat: number;
  lon: number;
  zoom?: number;
  place?: string;
  wiki?: string;
  text?: string;
}

interface WikiData {
  title: string;
  extract: string;
  thumbnailUrl?: string;
  description?: string;
}

export default function WsmMapComponent({
  lat,
  lon,
  zoom = 15,
  place = '',
  wiki = '',
  text = '',
}: WsmMapComponentProps) {
  const [wikiData, setWikiData] = useState<WikiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // If the AI specified custom text, we can use it directly as the wiki summary fallback
  useEffect(() => {
    if (text) {
      setWikiData({
        title: place || 'Localização',
        extract: text,
        description: 'Informação fornecida pela IA',
      });
      return;
    }

    if (!wiki) {
      setWikiData(null);
      return;
    }

    const fetchWikipediaData = async () => {
      setLoading(true);
      setError(false);
      try {
        // Try Portuguese Wikipedia first
        let url = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wiki)}`;
        let response = await fetch(url);
        
        if (!response.ok) {
          // Fall back to English Wikipedia
          url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wiki)}`;
          response = await fetch(url);
        }

        if (response.ok) {
          const data = await response.json();
          setWikiData({
            title: data.title || data.displaytitle || place,
            extract: data.extract || '',
            thumbnailUrl: data.thumbnail?.source || undefined,
            description: data.description || '',
          });
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error fetching Wikipedia summary:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchWikipediaData();
  }, [wiki, text, place]);

  // Calculate bbox bounding box for OpenStreetMap iframe
  // Approx mapping of zoom level to bbox delta in degrees
  const getBbox = (latitude: number, longitude: number, zoomLevel: number) => {
    const baseDelta = 0.005;
    const zoomFactor = Math.pow(2, 15 - zoomLevel);
    const deltaX = baseDelta * zoomFactor;
    const rad = (latitude * Math.PI) / 180;
    const deltaY = baseDelta * zoomFactor * Math.cos(rad);

    const minLon = longitude - deltaX;
    const minLat = latitude - deltaY;
    const maxLon = longitude + deltaX;
    const maxLat = latitude + deltaY;

    return `${minLon},${minLat},${maxLon},${maxLat}`;
  };

  const bbox = getBbox(lat, lon, zoom);
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
  const osmExternalUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

  const hasCard = wikiData || loading || error || place;

  return (
    <div id="wsm-map-container" className="my-6 border border-gray-200 shadow-sm rounded-2xl overflow-hidden bg-[#faf9f6] flex flex-col md:relative md:h-[450px] w-[calc(100%+2rem)] -ml-4 lg:w-[calc(100%+16rem)] lg:-ml-32 max-w-none">
      {/* Search Header/Status */}
      <div className="bg-[#f5f4f0] px-4 py-2 border-b border-gray-200 flex items-center justify-between text-xs text-gray-500 font-medium select-none shrink-0">
        <div className="flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <span>
            {wiki ? `Buscando informações para: "${wiki}"` : place ? `Visualizando: ${place}` : 'Mapa Interativo'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-purple-600 transition-colors inline-flex items-center gap-1 text-[11px]"
            title="Abrir no Google Maps"
          >
            Google Maps <ExternalLink className="w-3 h-3" />
          </a>
          <span className="text-gray-300">|</span>
          <a
            href={osmExternalUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-purple-600 transition-colors inline-flex items-center gap-1 text-[11px]"
            title="Abrir no OpenStreetMap"
          >
            OpenStreetMap <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row md:relative min-h-[450px] md:min-h-[350px]">
        {/* OpenStreetMap Iframe */}
        <div className="flex-1 h-[450px] md:h-full w-full relative shrink-0 md:shrink">
          <iframe
            title={`Mapa de ${place || 'localização'}`}
            src={osmEmbedUrl}
            className="w-full h-full border-0 select-none pointer-events-auto"
            loading="lazy"
          />
        </div>

        {/* Floating Card Overlay */}
        {hasCard && (
          <div className="w-full md:w-[280px] bg-white border-t md:border-t-0 md:border-l border-gray-150 flex flex-col p-4 overflow-y-auto max-h-[300px] md:max-h-none shrink-0">
            {loading ? (
              <div className="flex flex-col gap-3 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="flex gap-3">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-5/6" />
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-6 text-gray-500 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 text-gray-300 animate-spin-slow" />
                <span>Não foi possível carregar detalhes do Wikipedia para "{wiki}".</span>
                {place && <span className="font-semibold text-gray-700 mt-1">{place}</span>}
              </div>
            ) : wikiData ? (
              <div className="flex flex-col h-full">
                {/* Title */}
                <h3 className="font-bold text-gray-900 text-base leading-tight tracking-tight mb-2 select-text">
                  {wikiData.title}
                </h3>

                {/* Main Details Wrapper */}
                <div className="flex gap-3 items-start select-text">
                  {/* Thumbnail */}
                  {wikiData.thumbnailUrl && (
                    <img
                      src={wikiData.thumbnailUrl}
                      alt={wikiData.title}
                      className="w-20 h-20 rounded-lg object-cover border border-gray-100 shadow-3xs shrink-0"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}

                  {/* Rating / Meta Info Block */}
                  <div className="flex-1 flex flex-col min-w-0">
                    {/* Fake Rating & Category mimicking Google maps aesthetic */}
                    <div className="flex items-center gap-1 text-xs text-gray-500 font-medium flex-wrap mb-1">
                      <span className="font-semibold text-gray-800">4.7</span>
                      <div className="flex items-center text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-500 shrink-0" />
                      </div>
                      <span>(Wikipedia)</span>
                      <span className="text-gray-300">•</span>
                      <span className="truncate max-w-[110px] text-gray-600 font-medium">
                        {wikiData.description || 'Ponto Turístico'}
                      </span>
                    </div>

                    {/* Summary Extract */}
                    <p className="text-[12.5px] text-gray-600 leading-relaxed font-medium line-clamp-4">
                      {wikiData.extract}
                    </p>
                  </div>
                </div>

                {/* Footer link to Wikipedia if we fetched from wiki */}
                {wiki && (
                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end shrink-0">
                    <a
                      href={`https://pt.wikipedia.org/wiki/${encodeURIComponent(wiki)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#5c53e5] hover:text-purple-700 transition-colors"
                    >
                      Artigo Completo na Wikipédia <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            ) : place ? (
              // Case: Just show the Place Name with a clean minimalist card
              <div className="flex flex-col items-center justify-center text-center py-6 select-text">
                <div className="bg-purple-50 p-2.5 rounded-full mb-3">
                  <MapPin className="w-6 h-6 text-[#5c53e5]" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm">{place}</h4>
                <p className="text-xs text-gray-500 mt-1">Coordenadas: {lat.toFixed(4)}, {lon.toFixed(4)}</p>
                <div className="flex gap-2 mt-4">
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-[#f5f4f0] hover:bg-gray-200 rounded-lg text-xs font-semibold text-gray-700 transition-colors inline-flex items-center gap-1"
                  >
                    Rotas <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

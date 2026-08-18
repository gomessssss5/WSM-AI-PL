import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, MapPin, Star, Maximize2, X } from 'lucide-react';

interface MarkerData {
  lat: number;
  lon: number;
  title: string;
}

interface WsmMapComponentProps {
  key?: string;
  lat: number;
  lon: number;
  zoom?: number;
  place?: string;
  wiki?: string;
  text?: string;
  markers?: MarkerData[];
  disableExtras?: boolean;
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
  zoom = 12,
  place = '',
  wiki = '',
  text = '',
  markers = [],
  disableExtras = false,
}: WsmMapComponentProps) {
  const [wikiData, setWikiData] = useState<WikiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExtras, setShowExtras] = useState(false);

  useEffect(() => {
    // If disableExtras is requested or if markers are provided without an explicit wiki request, do not auto-fetch Wikipedia
    if (disableExtras || (markers && markers.length > 0 && !wiki)) {
      setWikiData(null);
      return;
    }

    if (text) {
      setWikiData({
        title: place || 'Localização',
        extract: text,
        description: 'Informações sobre a localização',
      });
      return;
    }

    if (!wiki) {
      setWikiData(null);
      return;
    }

    const searchTerm = wiki;

    const fetchWikipediaData = async () => {
      setLoading(true);
      setError(false);
      try {
        let url = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`;
        let response = await fetch(url);
        
        if (!response.ok) {
          url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`;
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
  }, [wiki, text, place, disableExtras, markers]);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  const osmExternalUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;

  const leafletSrcDoc = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body, #map { width: 100%; height: 100%; background: #e5e3df; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .controls {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 1000;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(0,0,0,0.12);
        }
        .control-btn {
          width: 36px;
          height: 36px;
          border: none;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: bold;
          color: #333;
          transition: background 0.15s;
          border-bottom: 1px solid #eee;
        }
        .control-btn:last-child { border-bottom: none; }
        .control-btn:hover { background: #f5f5f5; }
        .control-btn:active { background: #e5e5e5; }
        .leaflet-control-zoom { display: none !important; }
      </style>
    </head>
    <body>
      <div class="controls">
        <button class="control-btn" id="zoomIn" title="Ampliar">+</button>
        <button class="control-btn" id="zoomOut" title="Reduzir">−</button>
      </div>
      <div id="map"></div>
      <script>
        const map = L.map('map', { zoomControl: false }).setView([${lat}, ${lon}], ${zoom});
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        const markersList = ${JSON.stringify(markers && markers.length > 0 ? markers : [{lat, lon, title: place || wiki || 'Localização'}])};
        const featureGroup = L.featureGroup();
        
        markersList.forEach(m => {
          const marker = L.marker([m.lat, m.lon]);
          if (m.title) {
            marker.bindPopup('<strong>' + m.title.replace(/'/g, "\\'") + '</strong>', { closeButton: true });
          }
          marker.addTo(featureGroup);
        });
        
        featureGroup.addTo(map);
        
        if (markersList.length > 1) {
          map.fitBounds(featureGroup.getBounds(), { padding: [20, 20] });
        } else if (markersList.length === 1) {
          map.setView([markersList[0].lat, markersList[0].lon], ${zoom});
        }

        document.getElementById('zoomIn').addEventListener('click', () => map.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => map.zoomOut());
      </script>
    </body>
    </html>
  `;

  const displayTitle = place || wikiData?.title || (markers && markers.length > 0 ? (markers.length === 1 ? markers[0].title : 'Mapa com Marcadores') : 'Localização');

  const renderMapContent = (isModal: boolean) => (
    <div className={`flex flex-col bg-white dark:bg-neutral-900 overflow-hidden ${
      isModal 
        ? 'w-full h-full rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-2xl' 
        : 'relative w-full max-w-full my-5 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm'
    }`}>
      {/* Search Header Bar */}
      <div className="bg-gray-50 dark:bg-neutral-800/80 px-4 py-2.5 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between text-xs text-gray-600 dark:text-neutral-300 font-medium select-none shrink-0 gap-2">
        <div className="flex items-center gap-1.5 truncate">
          <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="truncate font-semibold text-gray-800 dark:text-neutral-200">
            {displayTitle} <span className="font-normal opacity-60">({lat.toFixed(4)}, {lon.toFixed(4)})</span>
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {wikiData && !disableExtras && (
            <>
              <button
                onClick={() => setShowExtras(!showExtras)}
                className={`transition-colors inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md ${
                  showExtras 
                    ? 'text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-300 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-900/50' 
                    : 'text-gray-600 hover:text-purple-600 dark:text-neutral-300 dark:hover:text-purple-400 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded border border-gray-200 dark:border-neutral-700'
                }`}
              >
                {showExtras ? 'Ocultar informações extras' : 'Mostrar informações extras'}
              </button>
              <span className="text-gray-300 dark:text-neutral-700">|</span>
            </>
          )}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors inline-flex items-center gap-1 text-[11px] font-medium"
            title="Abrir no Google Maps"
          >
            Google Maps <ExternalLink className="w-3 h-3" />
          </a>
          <span className="text-gray-300 dark:text-neutral-700">|</span>
          <a
            href={osmExternalUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors inline-flex items-center gap-1 text-[11px] font-medium"
            title="Abrir no OpenStreetMap"
          >
            OpenStreetMap <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={() => setIsFullscreen(!isModal)}
            title={isModal ? 'Fechar Tela Cheia' : 'Abrir Tela Cheia'}
            className="p-1.5 text-gray-700 hover:text-black dark:text-neutral-300 dark:hover:text-white bg-gray-200/80 hover:bg-gray-300 dark:bg-neutral-700/80 dark:hover:bg-neutral-600 rounded-lg transition-colors ml-1"
          >
            {isModal ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Map + Details Layout */}
      <div className={`flex flex-col md:flex-row w-full relative ${
        isModal ? 'flex-1 h-full overflow-hidden' : 'min-h-[420px] md:h-[420px]'
      }`}>
        {/* Map View - takes remaining majority of width */}
        <div className={`flex-1 min-w-0 bg-gray-100 dark:bg-neutral-950 overflow-hidden ${
          isModal ? 'h-full' : 'h-[300px] md:h-full'
        }`}>
          <iframe
            title={`Mapa de ${displayTitle}`}
            srcDoc={leafletSrcDoc}
            className="w-full h-full border-0"
            loading="lazy"
          />
        </div>

        {/* Card Section / Info Sidebar */}
        {showExtras && !disableExtras && (
          <div className={`border-t md:border-t-0 md:border-l border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col overflow-y-auto shrink-0 ${
            isModal
              ? 'w-full md:w-[320px] lg:w-[360px] h-full p-5'
              : 'w-full md:w-[250px] lg:w-[270px] p-3.5 sm:p-4 max-h-[320px] md:max-h-none'
          }`}>
            {loading ? (
              <div className="flex flex-col gap-3 animate-pulse py-2">
                <div className="h-5 bg-gray-200 dark:bg-neutral-800 rounded w-3/4" />
                <div className="h-3.5 bg-gray-200 dark:bg-neutral-800 rounded w-1/2" />
                <div className="h-16 bg-gray-200 dark:bg-neutral-800 rounded-lg my-2" />
                <div className="h-3 bg-gray-200 dark:bg-neutral-800 rounded w-full" />
              </div>
            ) : wikiData ? (
              <div className="flex flex-col justify-between h-full space-y-3">
                <div>
                  {/* Header Info */}
                  <div className="pb-2.5 border-b border-gray-100 dark:border-neutral-800">
                    <h3 className="font-bold text-gray-900 dark:text-neutral-100 text-base sm:text-lg leading-tight truncate">
                      {wikiData.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-neutral-400 font-medium mt-1">
                      <span>Fonte: Wikipédia</span>
                    </div>
                  </div>

                  {/* Sobre / Highlight Box */}
                  <div className="mt-2.5">
                    <div className="text-[10px] font-semibold tracking-wider text-gray-400 dark:text-neutral-500 uppercase mb-1">
                      Sobre
                    </div>
                    <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 p-2.5 rounded-xl">
                      <p className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed font-medium">
                        {wikiData.extract}
                      </p>
                    </div>
                  </div>

                  {/* Thumbnail image if available */}
                  {wikiData.thumbnailUrl && (
                    <div className="mt-2.5 rounded-xl overflow-hidden border border-gray-100 dark:border-neutral-800">
                      <img
                        src={wikiData.thumbnailUrl}
                        alt={wikiData.title}
                        className="w-full h-28 object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Wikipedia Link Footer */}
                {(wiki || place) && (
                  <div className="pt-2.5 border-t border-gray-100 dark:border-neutral-800 shrink-0">
                    <a
                      href={`https://pt.wikipedia.org/wiki/${encodeURIComponent(wiki || place)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-1.5 px-2.5 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-800 dark:text-neutral-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      Artigo na Wikipédia <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col justify-between h-full py-1">
                <div>
                  <div className="pb-2.5 border-b border-gray-100 dark:border-neutral-800">
                    <h3 className="font-bold text-gray-900 dark:text-neutral-100 text-base leading-tight truncate">
                      {displayTitle}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-neutral-400 mt-1">
                      Coordenadas: {lat.toFixed(4)}, {lon.toFixed(4)}
                    </p>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 p-2.5 rounded-xl mt-2.5">
                    <p className="text-xs text-purple-900 dark:text-purple-200 font-medium leading-relaxed">
                      Localização marcada no mapa interativo.
                    </p>
                  </div>
                </div>

                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-1.5 px-2.5 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-800 dark:text-neutral-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 mt-3"
                >
                  Abrir no Google Maps <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {renderMapContent(false)}

      {isFullscreen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center animate-in fade-in duration-200">
            {renderMapContent(true)}
          </div>,
          document.body
        )}
    </>
  );
}

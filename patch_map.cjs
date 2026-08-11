const fs = require('fs');

// 1. Update WsmMapComponentProps
let mapComp = fs.readFileSync('src/components/WsmMapComponent.tsx', 'utf8');

const propsInterfaceTarget = `interface WsmMapComponentProps {
  key?: string;
  lat: number;
  lon: number;
  zoom?: number;
  place?: string;
  wiki?: string;
  text?: string;
}`;

const propsInterfaceReplacement = `interface MarkerData {
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
}`;

mapComp = mapComp.replace(propsInterfaceTarget, propsInterfaceReplacement);

const componentSigTarget = `export default function WsmMapComponent({
  lat,
  lon,
  zoom = 12,
  place = '',
  wiki = '',
  text = '',
}: WsmMapComponentProps) {`;

const componentSigReplacement = `export default function WsmMapComponent({
  lat,
  lon,
  zoom = 12,
  place = '',
  wiki = '',
  text = '',
  markers = [],
}: WsmMapComponentProps) {`;

mapComp = mapComp.replace(componentSigTarget, componentSigReplacement);

// 2. Update leafletSrcDoc
const leafletTarget = `        const map = L.map('map', { zoomControl: false }).setView([\${lat}, \${lon}], \${zoom});
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        const marker = L.marker([\${lat}, \${lon}]).addTo(map);
        marker.bindPopup('<strong>\${(place || wiki || 'Localização').replace(/'/g, "\\\\\\'")}</strong>', { closeButton: true });`;

const leafletReplacement = `        const map = L.map('map', { zoomControl: false }).setView([\${lat}, \${lon}], \${zoom});
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        const markersList = \${JSON.stringify(markers && markers.length > 0 ? markers : [{lat, lon, title: place || wiki || 'Localização'}])};
        const featureGroup = L.featureGroup();
        
        markersList.forEach(m => {
          const marker = L.marker([m.lat, m.lon]);
          if (m.title) {
            marker.bindPopup('<strong>' + m.title.replace(/'/g, "\\\\'") + '</strong>', { closeButton: true });
          }
          marker.addTo(featureGroup);
        });
        
        featureGroup.addTo(map);
        
        if (markersList.length > 1) {
          map.fitBounds(featureGroup.getBounds(), { padding: [20, 20] });
        } else if (markersList.length === 1) {
          map.setView([markersList[0].lat, markersList[0].lon], \${zoom});
        }`;

mapComp = mapComp.replace(leafletTarget, leafletReplacement);

fs.writeFileSync('src/components/WsmMapComponent.tsx', mapComp);


// 3. Update MarkdownRenderer
let mdRender = fs.readFileSync('src/components/MarkdownRenderer.tsx', 'utf8');

const parseMapTarget = `        const textVal = parseAttr(mapLine, 'text');

        if (!isNaN(latVal) && !isNaN(lonVal)) {
          blocks.push(
            <WsmMapComponent
              key={\`map-\${i}\`}
              lat={latVal}
              lon={lonVal}
              zoom={zoomVal}
              place={placeVal}
              wiki={wikiVal}
              text={textVal}
            />
          );`;

const parseMapReplacement = `        const textVal = parseAttr(mapLine, 'text');
        
        let markersVal = [];
        const markersAttr = parseAttr(mapLine, 'markers');
        if (markersAttr) {
          try {
             const decoded = markersAttr.replace(/&quot;/g, '"');
             markersVal = JSON.parse(decoded);
          } catch(e) {
             console.error("Failed to parse map markers:", e);
          }
        }

        if (!isNaN(latVal) && !isNaN(lonVal)) {
          blocks.push(
            <WsmMapComponent
              key={\`map-\${i}\`}
              lat={latVal}
              lon={lonVal}
              zoom={zoomVal}
              place={placeVal}
              wiki={wikiVal}
              text={textVal}
              markers={markersVal}
            />
          );`;

if (mdRender.includes(parseMapTarget)) {
  fs.writeFileSync('src/components/MarkdownRenderer.tsx', mdRender.replace(parseMapTarget, parseMapReplacement));
} else {
  // Try alternative replacement if it doesn't match exactly
  console.log("Could not find parseMapTarget in MarkdownRenderer.tsx");
}

console.log("Map component updated.");

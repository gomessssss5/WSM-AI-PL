const fs = require('fs');
let mapComp = fs.readFileSync('src/components/WsmMapComponent.tsx', 'utf8');

// The replacement of interface and signature worked? Let's check.
const hasMarkers = mapComp.includes('markers?: MarkerData[]');
console.log('Has markers in interface:', hasMarkers);

if (!hasMarkers) {
  const propsTarget = /interface WsmMapComponentProps \{[\s\S]*?\}/;
  mapComp = mapComp.replace(propsTarget, `interface MarkerData {
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
}`);
}

const sigTarget = /export default function WsmMapComponent\(\{[\s\S]*?\}\: WsmMapComponentProps\) \{/;
mapComp = mapComp.replace(sigTarget, `export default function WsmMapComponent({
  lat,
  lon,
  zoom = 12,
  place = '',
  wiki = '',
  text = '',
  markers = [],
}: WsmMapComponentProps) {`);


const scriptRegex = /<script>([\s\S]*?)<\/script>/;
const scriptMatch = mapComp.match(scriptRegex);

if (scriptMatch) {
  const newScript = `<script>
        const map = L.map('map', { zoomControl: false }).setView([\${lat}, \${lon}], \${zoom});
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
        }

        document.getElementById('zoomIn').addEventListener('click', () => map.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => map.zoomOut());
      </script>`;
      
  mapComp = mapComp.replace(scriptMatch[0], newScript);
}

fs.writeFileSync('src/components/WsmMapComponent.tsx', mapComp);
console.log('Map Script patched');

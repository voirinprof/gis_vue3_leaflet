<template>
  <div ref="mapContainer" class="leaflet-map"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, defineEmits } from 'vue';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet/dist/leaflet.css';
import { useZoneStore } from '../stores/zones';

// Import store
const zoneStore = useZoneStore();
const mapContainer = ref(null);
const map = ref<L.Map | null>(null);
const zoneLayer = ref<L.GeoJSON | null>(null);
const selectedFeatures = ref<L.Layer[]>([]); // Store selected Leaflet layers

const center = ref([
  Number(import.meta.env.VITE_MAP_CENTER_LNG), Number(import.meta.env.VITE_MAP_CENTER_LAT)
]);
const zoom = ref(Number(import.meta.env.VITE_DEFAULT_ZOOM));
const layerOpacity = ref(1.0);
const layerVisible = ref(true);

const emit = defineEmits(['select']);

const wmsUrl = import.meta.env.VITE_WMS_URL;
const wmsLayers = import.meta.env.VITE_WMS_LAYERS;


// Initialize Leaflet map
onMounted(() => {
  map.value = L.map(mapContainer.value, {
    center: [center.value[1], center.value[0]], // Leaflet uses [lat, lng]
    zoom: zoom.value,
    // zoom max
    maxZoom: 21,
    zoomControl: true,
  });

  // Add OpenStreetMap tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    zIndex: 1000,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map.value);

  // Add WMS layer
  const wmsLayer = L.tileLayer.wms(wmsUrl, {
    layers: wmsLayers,
    format: 'image/png',
    transparent: true,
    zIndex: 1001,
    opacity: layerOpacity.value,
    tiled: true,
    maxZoom: 21,
  });
  if (layerVisible.value) wmsLayer.addTo(map.value);

  // Watch WMS layer visibility and opacity
  watch(layerVisible, (visible) => {
    if (visible) wmsLayer.addTo(map.value!);
    else wmsLayer.remove();
  });
  watch(layerOpacity, (opacity) => {
    wmsLayer.setOpacity(opacity);
  });

  // Initialize zone layer
  zoneLayer.value = L.geoJSON(zoneStore.zones, {
    style: {
      color: 'blue',
      weight: 3,
      fillColor: 'rgba(0, 0, 255, 0.4)',
      fillOpacity: 0.4,
    },
    onEachFeature: (feature, layer) => {
      layer.on('click', () => handleFeatureClick(layer));
    },
  }).addTo(map.value);

  // Watch store zones and update layer
  watch(
    () => zoneStore.zones,
    (newZones) => {
      
      if (zoneLayer.value) {
        
        zoneLayer.value.clearLayers();
        zoneLayer.value.addData(newZones);
      }
    },
    { deep: true }
  );

  // Initialize Geoman controls
  map.value.pm.addControls({
    drawPolygon: true,
    editMode: true,
    removeLayer: true,
    cutPolygon: false,
    dragMode: false,
    rotateMode: false,
    drawMarker: false,
    drawPolyline: false,
    drawRectangle: false,
    drawCircle: false,
    drawCircleMarker: false,
    editPolygon: true,
    editPolyline: false,
    editRectangle: false,
    editMarker: false,
    editCircle: false,
    editCircleMarker: false,
    cutPolygon: false,
    dragMarker: false,
    drawText: false,
  });
  map.value.pm.setLang('en');

  // Geoman events
  map.value.on('pm:create', (e) => {
    const layer = e.layer;
    layer.feature = layer.feature || { type: 'Feature', properties: {} };
    layer.feature.geometry = layer.toGeoJSON().geometry;
    layer.feature.id = `zone_${Date.now()}`;
    layer.feature.properties.name = 'Sans nom';
    layer.feature.properties.type = 'Aucun type';
    zoneStore.addZone(layer.feature);
    selectedFeatures.value = [layer];
    // zoneStore.toggleModify();
    emit('select', layer.feature.properties.id);
    console.log('Zone dessinée:', layer.feature);
  });

  zoneLayer.value.on('pm:update', (e) => {
    console.log('pm:change event:', e);
    const layer = e.layer;
    if (layer.feature && layer.feature.id) {
      layer.feature.geometry = layer.toGeoJSON().geometry;
      zoneStore.modifyZone(layer.feature);
      console.log('Zone modifiée:', layer.feature);
    }
  });

  map.value.on('pm:remove', (e) => {
    console.log('pm:remove event:', e);
    const layer = e.layer;
    if (layer.feature && layer.feature.id) {
      zoneStore.deleteZone(layer.feature.id);
      console.log('Zone supprimée:', layer.feature.id);
    }
  });

  // Map click to clear selection
  // map.value.on('click', (e) => {
    // if (!map.value!.hasLayer(e.target)) {
    //   selectedFeatures.value = [];
    //   emit('select', null);
    // }
  // });

  // Watch draw and modify modes
  watch(
    () => zoneStore.drawEnabled,
    (enabled) => {
      if (enabled) {
        map.value!.pm.enableDraw('Polygon');
        map.value!.pm.disableGlobalEditMode();
      } else {
        map.value!.pm.disableDraw();
      }
    }
  );

  // watch(
  //   () => zoneStore.modifyEnabled,
  //   (enabled) => {
  //     if (enabled) {
  //       map.value!.pm.enableGlobalEditMode();
  //       map.value!.pm.disableDraw();
  //     } else {
  //       map.value!.pm.disableGlobalEditMode();
  //     }
  //   }
  // );
});

// Cleanup on unmount
onUnmounted(() => {
  if (map.value) {
    map.value.remove();
    map.value = null;
  }
});

// Handle feature click
const handleFeatureClick = (layer: L.Layer) => {
  selectedFeatures.value = [layer];
  const featureId = (layer as any).feature.id;
  layer.setStyle({
    color: 'red',
    weight: 2,
    fillColor: 'rgba(255, 0, 0, 0.4)',
    fillOpacity: 0.4,
  });
  // Reset style for other features
  zoneLayer.value!.eachLayer((l: any) => {
    if (l.feature.id !== layer.feature.id) {
      l.setStyle({
        color: 'blue',
        weight: 3,
        fillColor: 'rgba(0, 0, 255, 0.4)',
        fillOpacity: 0.4,
      });
    }
  });
  emit('select', featureId);
  console.log('Feature selected:', featureId);
};

// Zoom to feature
const zoomToFeature = (id: string) => {
  const feature = zoneStore.zones.find((z) => z.id === id);
  if (feature && map.value && zoneLayer.value) {
    const layer = zoneLayer.value.getLayers().find((l: any) => l.feature.id === id);
    if (layer) {
      map.value.fitBounds((layer as L.Layer).getBounds(), { padding: [100, 100] });
      selectedFeatures.value = [layer];
      handleFeatureClick(layer);
      console.log('Zoomed to feature with ID:', id);
    } else {
      console.log('Feature not found for ID:', id);
    }
  }
};

// Zoom in
const handleZoomIn = () => {
  if (map.value) {
    map.value.zoomIn();
    zoom.value = map.value.getZoom();
  }
};

// Zoom out
const handleZoomOut = () => {
  if (map.value) {
    map.value.zoomOut();
    zoom.value = map.value.getZoom();
  }
};

defineExpose({
  zoomToFeature,
});
</script>

<style scoped>
.leaflet-map {
  width: 100%;
  height: 100%;
}
</style>
<template>
  <div class="h-full flex flex-col">
    <Toolbar />
    <Map ref="map" class="flex-grow" @select="handleSelectMap" />
    <DataTable :selectedZoneId="selectedZoneId" @selectrow="handleSelect" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Toolbar from '../components/Toolbar.vue';
import Map from '../components/Map.vue';
import DataTable from '../components/DataTable.vue';
import { useZoneStore } from '../stores/zones';

const zoneStore = useZoneStore();

const selectedZoneId = ref<string | null>(null);
const map = ref<InstanceType<typeof Map> | null>(null);

const handleSelectMap = (id: string | null) => {
  console.log('HomeView: Received select event from map with ID:', id);
  selectedZoneId.value = id;
}

const handleSelect = (id: string | null) => {
  console.log('HomeView: Received select event with ID:', id);
  selectedZoneId.value = id;
  if (id && map.value) {
    console.log('HomeView: Zooming to feature with ID:', id);
    map.value.zoomToFeature(id);
  }
};

onMounted(() => {
  console.log('HomeView: Loading zones, store:', zoneStore);
  zoneStore.loadZones(
    'http://192.168.0.146/geoserver/geoimage/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=geoimage:zones&outputFormat=application/json&srsname=EPSG:4326',
  );
});
</script>
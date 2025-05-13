<template>
  <div class="bg-gray-800 text-white p-1 flex justify-between items-center">
    <div class="text-lg font-bold">Map Toolbar (with geoman-io/leaflet-geoman-free)</div>
    <div class="space-x-2">
      
      
      <button
        @click="saveChanges"
        :disabled="!hasChanges"
        :class="[
          hasChanges
            ? 'bg-blue-500 hover:bg-blue-600'
            : 'bg-gray-500 cursor-not-allowed',
          'px-3 py-1 rounded'
        ]"
      >
        Save Changes
      </button>
    </div>
  </div>
  <div
    v-if="zoneStore.saveError"
    class="p-2 bg-red-100 text-red-700 rounded mx-4 mt-2"
  >
    {{ zoneStore.saveError }}
  </div>
</template>

<script setup lang="ts">
import { useZoneStore } from '../stores/zones';
import { computed } from 'vue';

// Import the store
const zoneStore = useZoneStore();

// Function to save changes
const saveChanges = async () => {
  await zoneStore.saveChanges();
};

// Computed property to check if there are changes to save
const hasChanges = computed(() => {
  return (
    zoneStore.insertedZones.length > 0 ||
    zoneStore.modifiedZones.length > 0 ||
    zoneStore.deletedZones.length > 0
  );
});
</script>

<style scoped>
.space-x-4 > :not(:last-child) {
  margin-right: 1rem;
}
</style>
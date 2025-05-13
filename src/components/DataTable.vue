<template>
  <div class="bg-gray-100 p-4">
    <h2 class="text-lg font-semibold mb-2">Feature Data</h2>
    
    <div class="mb-4">
      <input
        v-model="searchTerm"
        type="text"
        placeholder="Filter by name or type..."
        class="w-full p-2 border rounded"
      />
    </div>
    <div class="max-h-96 overflow-y-auto border">
      <table class="w-full border-collapse">
        <thead>
          <tr class="bg-gray-200 sticky top-0">
            <th class="border p-2">ID</th>
            <th class="border p-2">Name</th>
            <th class="border p-2">Type</th>
            <th class="border p-2">Status</th>
            <th class="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredTableData" :key="item.id" :class="{ 'hover:bg-gray-50': true, 'highlighted': item.id === selectedZoneId }">
            <td class="border p-2">{{ item.id }}</td>
            <td class="border p-2">
              <input
                v-if="editingId === item.id"
                v-model="editForm.name"
                type="text"
                class="w-full p-1 border rounded"
                @keyup.enter="saveEdit(item.id)"
              />
              <span v-else>{{ item.name }}</span>
            </td>
            <td class="border p-2">
              <input
                v-if="editingId === item.id"
                v-model="editForm.type"
                type="text"
                class="w-full p-1 border rounded"
                @keyup.enter="saveEdit(item.id)"
              />
              <span v-else>{{ item.type }}</span>
            </td>
            <td class="border p-2">
              <span
                v-if="isInserted(item.id)"
                class="inline-block px-2 py-1 text-xs font-semibold text-white bg-green-500 rounded"
              >
                New
              </span>
              <span
                v-else-if="isModified(item.id)"
                class="inline-block px-2 py-1 text-xs font-semibold text-white bg-yellow-500 rounded"
              >
                Modified
              </span>
            </td>
            <td class="border p-2 space-x-2">
              <button
                v-if="editingId === item.id"
                class="bg-green-500 text-white px-2 py-1 rounded"
                @click="saveEdit(item.id)"
              >
                Save
              </button>
              <button
                v-if="editingId === item.id"
                class="bg-gray-500 text-white px-2 py-1 rounded"
                @click="cancelEdit"
              >
                Cancel
              </button>
              <button
                v-else
                class="bg-blue-500 text-white px-2 py-1 rounded"
                @click="startEdit(item)"
              >
                Edit
              </button>
              <button
                class="bg-red-500 text-white px-2 py-1 rounded"
                @click="zoneStore.deleteZone(item.id)"
              >
                Delete
              </button>
              <button
                class="bg-blue-500 text-white px-2 py-1 rounded"
                @click="viewZone(item.id)"
              >
                View
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, defineEmits } from 'vue';
import { useZoneStore } from '../stores/zones';
import type { Feature } from 'ol';

defineProps<{
  selectedZoneId: string | null;
}>();

const zoneStore = useZoneStore();
const tableData = ref<{ id: string; name: string; type: string }[]>([]);
const searchTerm = ref('');
const editingId = ref<string | null>(null);
const editForm = ref<{ name: string; type: string }>({
  name: '',
  type: '',
});

const emit = defineEmits(['selectrow']);

// Watch for changes in zoneStore.zones and update tableData
watch(
  () => zoneStore.zones,
  (newZones: Feature[]) => {
    tableData.value = newZones.map((zone) => ({
      id: zone.id || 'N/A',
      name: zone.properties['name'] || 'Sans nom',
      type: zone.properties['type'] || 'Aucun type',
    }));
  },
  { immediate: true, deep: true }
);

// Computed property to filter tableData based on searchTerm
const filteredTableData = computed(() => {
  if (!searchTerm.value.trim()) return tableData.value;
  const lowerSearch = searchTerm.value.toLowerCase();
  return tableData.value.filter(
    (item) =>
      item.name.toLowerCase().includes(lowerSearch) ||
      item.type.toLowerCase().includes(lowerSearch)
  );
});

// Check if a zone is inserted
const isInserted = (id: string) => {
  return zoneStore.insertedZones.some((zone) => zone.id?.toString() === id);
};

// Check if a zone is modified
const isModified = (id: string) => {
  return zoneStore.modifiedZones.some((zone) => zone.id?.toString() === id);
};

// Start editing a row
const startEdit = (item: { id: string; name: string; type: string }) => {
  editingId.value = item.id;
  editForm.value = {
    name: item.name,
    type: item.type,
  };
};

// Save edited data
const saveEdit = (id: string) => {
  const zone = zoneStore.zones.find((z) => z.id?.toString() === id);
  if (zone) {
    zone.properties['name'] = editForm.value.name || 'Sans nom';
    zone.properties['type'] = editForm.value.type || 'Aucun type';
    zoneStore.modifyZone(zone); // Track as modified
    // Trigger reactivity
    // zoneStore.zones.value = [...zoneStore.zones.value];
  }
  editingId.value = null;
};

const viewZone = (id: string) => {
  console.log('View zone with ID:', id);
  emit('selectrow', id);
};

// Cancel editing
const cancelEdit = () => {
  editingId.value = null;
  editForm.value = { name: '', type: '' };
};
</script>

<style scoped>
.max-h-96 {
  max-height: 24rem;
}
.sticky {
  position: sticky;
  top: 0;
  z-index: 10;
}
.space-x-2 > :not(:last-child) {
  margin-right: 0.5rem;
}

.data-table {
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

th {
  background-color: #f2f2f2;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.highlighted {
  background-color: #e0f7fa; /* Light cyan for selected row */
  font-weight: bold;
  border: 2px solid #00796b; /* Darker cyan for border */
}
</style>
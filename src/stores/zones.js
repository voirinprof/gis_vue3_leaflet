import { defineStore } from 'pinia';
import { ref } from 'vue';
import L from 'leaflet';

export const useZoneStore = defineStore('zones', () => {
  const zones = ref([]);
  
  const drawEnabled = ref(false);
  const modifyEnabled = ref(false);
  const insertedZones = ref([]);
  const modifiedZones = ref([]);
  const deletedZones = ref([]);
  const saveError = ref(null);

  const wfsUrl = import.meta.env.VITE_WFS_URL;
  const wfsFeatureType = import.meta.env.VITE_WFS_FEATURE_TYPE;

  // Load zones from WFS
  const loadZones = async (url) => {
    try {
      const response = await fetch(url);
      const data = await response.json();
      // Convert GeoJSON features to Leaflet-compatible features
      const features = L.geoJSON(data).getLayers().map((layer) => layer.feature);
      zones.value = features;

      // Reset operation lists on load
      insertedZones.value = [];
      modifiedZones.value = [];
      deletedZones.value = [];
      saveError.value = null;
    } catch (error) {
      console.error('Erreur lors du chargement des zones:', error);
      saveError.value = 'Failed to load zones';
    }
  };

  // Add a new zone
  const addZone = (zone) => {
    zones.value.push(zone);
    insertedZones.value.push(zone);
  };
  // Delete a zone
  const deleteZone = (id) => {
    zones.value = zones.value.filter((zone) => zone.id !== id);
    deletedZones.value.push(id);
    // Remove from inserted/modified if present
    insertedZones.value = insertedZones.value.filter((zone) => zone.id !== id);
    modifiedZones.value = modifiedZones.value.filter((zone) => zone.id !== id);

  };
  // Modify an existing zone
  const modifyZone = (zone) => {
    const index = zones.value.findIndex((z) => z.id === zone.id);
    if (index !== -1) {
      zones.value[index] = zone;
      // Add to modifiedZones if not already inserted
      if (!insertedZones.value.some((z) => z.id === zone.id)) {
        modifiedZones.value.push(zone);
      }
    }
  };


  // Get all operations (inserted, modified, deleted)
  const getAllOperations = () => {
    return {
      inserted: insertedZones.value.map((zone) => zone.getId()),
      modified: modifiedZones.value.map((zone) => zone.getId()),
      deleted: deletedZones.value,
    };
  };

  // Convert GeoJSON to GML for WFS-T
  // This function converts GeoJSON geometries to GML format
  // the function is not complete and needs to be improved, leaflet does not
  // has a function to convert geojson to gml, so we need to do it manually
  const geoJsonToGml = (geometry) => {
    if (geometry.type === 'Polygon') {
      const coordinates = geometry.coordinates[0]
        .map((coord) => `${coord[1]} ${coord[0]}`)
        .join(' ');
      return `
        <gml:Polygon srsName="urn:x-ogc:def:crs:EPSG:4326">
          <gml:exterior>
            <gml:LinearRing>
              <gml:posList>${coordinates}</gml:posList>
            </gml:LinearRing>
          </gml:exterior>
        </gml:Polygon>`;
    } else if (geometry.type === 'MultiPolygon') {
      const polygons = geometry.coordinates
        .map(
          (poly) => `
            <gml:Polygon srsName="urn:x-ogc:def:crs:EPSG:4326">
              <gml:exterior>
                <gml:LinearRing>
                  <gml:posList>${poly[0]
                    .map((coord) => `${coord[1]} ${coord[0]}`)
                    .join(' ')}</gml:posList>
                </gml:LinearRing>
              </gml:exterior>
            </gml:Polygon>`
        )
        .join('');
      return `
        <gml:MultiPolygon srsName="urn:x-ogc:def:crs:EPSG:4326">
          <gml:polygonMember>
            ${polygons}
          </gml:polygonMember>
        </gml:MultiPolygon>`;
    } else if (geometry.type === 'Point') {
      const [x, y] = geometry.coordinates;
      return `
        <gml:Point srsName="urn:x-ogc:def:crs:EPSG:4326">
          <gml:pos>${x} ${y}</gml:pos>
        </gml:Point>`;
    }
    console.warn('Unsupported geometry type:', geometry.type);
    return '';
  };

  const saveChanges = async () => {
    try {
        const serializer = new XMLSerializer();
      const wfsTransaction = `
        <wfs:Transaction
          service="WFS"
          version="1.1.0"
          xmlns:wfs="http://www.opengis.net/wfs"
          xmlns:ogc="http://www.opengis.net/ogc"
          xmlns:gml="http://www.opengis.net/gml"
          xmlns:geoimage="http://www.geoimagesolutions.com"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.1.0/wfs.xsd">
          ${insertedZones.value
            .map(
              (zone) => `
            <wfs:Insert>
              <geoimage:zones>
               <geoimage:geom>
                  ${geoJsonToGml(zone.geometry)}
                </geoimage:geom>
                <geoimage:name>${zone.properties['name'] || 'Sans nom'}</geoimage:name>
                <geoimage:type>${
                  zone.properties['type'] || 'Aucun type'
                }</geoimage:type>
              </geoimage:zones>
            </wfs:Insert>`
            )
            .join('')}
          ${modifiedZones.value
            .map(
              (zone) => `
            <wfs:Update typeName="geoimage:zones">
              <wfs:Property>
                <wfs:Name>geom</wfs:Name>
                <wfs:Value>
                  ${geoJsonToGml(zone.geometry)}
                </wfs:Value>
              </wfs:Property>
              <wfs:Property>
                <wfs:Name>name</wfs:Name>
                <wfs:Value>${zone.properties['name'] || 'Sans nom'}</wfs:Value>
              </wfs:Property>
              <wfs:Property>
                <wfs:Name>type</wfs:Name>
                <wfs:Value>${
                  zone.properties['type'] || 'Aucun type'
                }</wfs:Value>
              </wfs:Property>
              <ogc:Filter>
                <ogc:FeatureId fid="${zone.id}"/>
              </ogc:Filter>
            </wfs:Update>`
            )
            .join('')}
          ${deletedZones.value
            .map(
              (id) => `
            <wfs:Delete typeName="geoimage:zones">
              <ogc:Filter>
                <ogc:FeatureId fid="${id}"/>
              </ogc:Filter>
            </wfs:Delete>`
            )
            .join('')}
        </wfs:Transaction>
      `;

      if (
        insertedZones.value.length === 0 &&
        modifiedZones.value.length === 0 &&
        deletedZones.value.length === 0
      ) {
        saveError.value = 'No changes to save';
        return;
      }

      const response = await fetch(wfsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
        },
        body: wfsTransaction,
      });

      if (!response.ok) {
        throw new Error(`WFS-T request failed: ${response.statusText}`);
      }

      // Clear operations after successful save
      insertedZones.value = [];
      modifiedZones.value = [];
      deletedZones.value = [];
      saveError.value = null;

      // Reload zones to sync with server
      await loadZones(
        wfsUrl + '?service=WFS&version=1.1.0&request=GetFeature&typeName=' + wfsFeatureType + '&outputFormat=application/json&srsname=EPSG:4326'
      );
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des changements:', error);
      saveError.value = `Failed to save changes: ${error.message}`;
    }
  };

  const toggleDraw = () => {
    drawEnabled.value = !drawEnabled.value;
    if (drawEnabled.value) modifyEnabled.value = false;
  };

  const toggleModify = () => {
    modifyEnabled.value = !modifyEnabled.value;
    if (drawEnabled.value) drawEnabled.value = false;
  };

  return {
    zones,
    drawEnabled,
    modifyEnabled,
    insertedZones,
    modifiedZones,
    deletedZones,
    saveError,
    loadZones,
    addZone,
    deleteZone,
    modifyZone,
    // selectZone,
    getAllOperations,
    saveChanges,
    toggleDraw,
    toggleModify,
  };
});
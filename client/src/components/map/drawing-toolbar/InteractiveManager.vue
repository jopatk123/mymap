<!-- 交互管理器组件 - 管理所有弹窗和菜单 -->
<template>
  <div class="interactive-manager">
    <ExportDialog v-model="showExportDialog" />

    <PointInfoPopup
      :visible="showPointPopup"
      :point="selectedPoint"
      :trigger-ref="popupTriggerRef"
      @close="closePointPopup"
      @edit-properties="openPointProperties"
      @delete-point="deletePoint"
    />

    <PointContextMenu
      :visible="showPointContextMenu"
      :position="contextMenuPosition"
      @close="closePointContextMenu"
      @edit-properties="openPointProperties"
      @delete-point="deletePoint"
    />

    <PointPropertiesDialog
      v-model="showPointPropertiesDialog"
      :point="selectedPoint"
      @save="handleSaveFromDialog"
    />

    <LineInfoPopup
      :visible="showLinePopup"
      :line="selectedLine"
      :trigger-ref="popupTriggerRef"
      @close="closeLinePopup"
      @edit-properties="openLineProperties"
      @delete-line="deleteLine"
    />

    <LineContextMenu
      :visible="showLineContextMenu"
      :position="contextMenuPosition"
      @close="closeLineContextMenu"
      @edit-properties="openLineProperties"
      @delete-line="deleteLine"
    />

    <LinePropertiesDialog
      v-model="showLinePropertiesDialog"
      :line="selectedLine"
      @save="saveLineProperties"
    />

    <PolygonInfoPopup
      :visible="showPolygonPopup"
      :polygon="selectedPolygon"
      :trigger-ref="popupTriggerRef"
      @close="closePolygonPopup"
      @edit-properties="openPolygonProperties"
      @delete-polygon="deletePolygon"
    />

    <PolygonContextMenu
      :visible="showPolygonContextMenu"
      :position="contextMenuPosition"
      @close="closePolygonContextMenu"
      @edit-properties="openPolygonProperties"
      @delete-polygon="deletePolygon"
    />

    <PolygonPropertiesDialog
      v-model="showPolygonPropertiesDialog"
      :polygon="selectedPolygon"
      @save="savePolygonProperties"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import ExportDialog from './ExportDialog.vue';

import PointInfoPopup from './PointInfoPopup.vue';
import PointContextMenu from './PointContextMenu.vue';
import PointPropertiesDialog from './PointPropertiesDialog.vue';

import LineInfoPopup from './LineInfoPopup.vue';
import LineContextMenu from './LineContextMenu.vue';
import LinePropertiesDialog from './LinePropertiesDialog.vue';

import PolygonInfoPopup from './PolygonInfoPopup.vue';
import PolygonContextMenu from './PolygonContextMenu.vue';
import PolygonPropertiesDialog from './PolygonPropertiesDialog.vue';

import { createPointIcon, setupMarkerEvents } from '@/composables/drawing-tools/tools/point.js';
import L from 'leaflet';
import { updateLineStyle } from '@/composables/drawing-tools/tools/line.js';
import { updatePolygonStyle } from '@/composables/drawing-tools/tools/polygon.js';

const props = defineProps({
  mapInstance: { type: Object, default: null },
  drawings: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:drawings']);

// local reactive copy of drawings to avoid mutating prop directly
const localDrawings = ref(props.drawings ? [...props.drawings] : []);

// keep local copy in sync when parent updates drawings
watch(
  () => props.drawings,
  (v) => {
    localDrawings.value = v ? [...v] : [];
  },
  { deep: true }
);

// emit updates when localDrawings changes
watch(
  localDrawings,
  (v) => {
    emit('update:drawings', v ? [...v] : []);
  },
  { deep: true }
);

const showExportDialog = ref(false);
const popupTriggerRef = ref(null);
const contextMenuPosition = ref({ x: 0, y: 0 });

const showPointPopup = ref(false);
const showPointContextMenu = ref(false);
const showPointPropertiesDialog = ref(false);
const selectedPoint = ref(null);

const showLinePopup = ref(false);
const showLineContextMenu = ref(false);
const showLinePropertiesDialog = ref(false);
const selectedLine = ref(null);

const showPolygonPopup = ref(false);
const showPolygonContextMenu = ref(false);
const showPolygonPropertiesDialog = ref(false);
const selectedPolygon = ref(null);

const closePointPopup = () => {
  showPointPopup.value = false;
  selectedPoint.value = null;
  popupTriggerRef.value = null;
};
const closePointContextMenu = () => {
  showPointContextMenu.value = false;
  selectedPoint.value = null;
};
const openPointProperties = () => {
  const current = selectedPoint.value;
  closePointPopup();
  closePointContextMenu();
  selectedPoint.value = current;
  showPointPropertiesDialog.value = true;
};

const deletePoint = async () => {
  if (!selectedPoint.value) return;
  try {
    await ElMessageBox.confirm(`确定要删除点位"${selectedPoint.value.name}"吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger',
    });
    if (selectedPoint.value.marker)
      props.mapInstance.drawingLayerGroup.removeLayer(selectedPoint.value.marker);
    const index = localDrawings.value.findIndex((d) => d.id === selectedPoint.value.id);
    if (index !== -1) localDrawings.value.splice(index, 1);
    closePointPopup();
    closePointContextMenu();
    ElMessage.success('点位已删除');
  } catch (error) {}
};

const savePointProperties = (updatedProperties) => {
  // normalize and validate latlng if provided
  if (updatedProperties && updatedProperties.latlng) {
    const lat = Number(updatedProperties.latlng.lat);
    const lng = Number(updatedProperties.latlng.lng);
    updatedProperties.latlng = { lat, lng };
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      ElMessage.error('请输入有效的经纬度坐标');
      return;
    }
  }

  // resolve target by id (primary) or selectedPoint (fallback)
  let idx = -1;
  if (updatedProperties && updatedProperties.id) {
    idx = localDrawings.value.findIndex((d) => d.id === updatedProperties.id);
  } else if (selectedPoint.value) {
    idx = localDrawings.value.findIndex(
      (d) =>
        d === selectedPoint.value || (selectedPoint.value.id && d.id === selectedPoint.value.id)
    );
  }
  if (idx === -1) return;
  const target = localDrawings.value[idx];

  // capture previous state before applying updates
  const prevIcon = target.icon;
  const prevLatLng = target.latlng && { ...target.latlng };

  // apply updates to canonical object (props.drawings)
  Object.assign(target, updatedProperties);

  // update marker position if latlng changed
  if (target.marker && updatedProperties.latlng && prevLatLng) {
    if (
      prevLatLng.lat !== updatedProperties.latlng.lat ||
      prevLatLng.lng !== updatedProperties.latlng.lng
    ) {
      try {
        target.marker.setLatLng([updatedProperties.latlng.lat, updatedProperties.latlng.lng]);
        try {
          props.mapInstance.setView(
            [updatedProperties.latlng.lat, updatedProperties.latlng.lng],
            props.mapInstance.getZoom()
          );
        } catch (e) {}
      } catch (e) {}
    }
  }

  // if icon changed, recreate marker to ensure DOM refresh; otherwise setIcon
  if (target.marker) {
    try {
      if (updatedProperties.icon && updatedProperties.icon !== prevIcon) {
        const oldMarker = target.marker;
        const currentLatLng = oldMarker.getLatLng();
        try {
          props.mapInstance.drawingLayerGroup.removeLayer(oldMarker);
        } catch (e) {}
        const newMarker = L.marker(currentLatLng, {
          icon: createPointIcon(target),
          pointId: target.id,
          riseOnHover: true,
        }).addTo(props.mapInstance.drawingLayerGroup);
        setupMarkerEvents(newMarker, target, localDrawings.value, props.mapInstance);
        target.marker = newMarker;
      } else {
        try {
          target.marker.setIcon(createPointIcon(target));
        } catch (err) {}
      }
    } catch (e) {
      try {
        target.marker.setIcon(createPointIcon(target));
      } catch (err) {}
    }
  }

  ElMessage.success('点位属性已更新');
};

const handleSaveFromDialog = (updatedProperties) => {
  try {
    savePointProperties(updatedProperties);
  } catch (e) {
    void console.error('[InteractiveManager] savePointProperties threw error:', e);
  }
};

// Note: 'save-ref' event and handleSaveRefFromDialog were removed; keep code path minimal and id-based.

const closeLinePopup = () => {
  showLinePopup.value = false;
  selectedLine.value = null;
  popupTriggerRef.value = null;
};
const closeLineContextMenu = () => {
  showLineContextMenu.value = false;
  selectedLine.value = null;
};
const openLineProperties = () => {
  const current = selectedLine.value;
  closeLinePopup();
  closeLineContextMenu();
  selectedLine.value = current;
  showLinePropertiesDialog.value = true;
};

const deleteLine = async () => {
  if (!selectedLine.value) return;
  try {
    await ElMessageBox.confirm(`确定要删除线段"${selectedLine.value.name}"吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger',
    });
    if (selectedLine.value.polyline)
      props.mapInstance.drawingLayerGroup.removeLayer(selectedLine.value.polyline);
    const index = localDrawings.value.findIndex((d) => d.id === selectedLine.value.id);
    if (index !== -1) localDrawings.value.splice(index, 1);
    closeLinePopup();
    closeLineContextMenu();
    ElMessage.success('线段已删除');
  } catch (error) {}
};

const saveLineProperties = (updatedProperties) => {
  if (!selectedLine.value) return;
  // update canonical drawing in localDrawings
  const index = localDrawings.value.findIndex((d) => d.id === selectedLine.value.id);
  if (index === -1) return;
  Object.assign(localDrawings.value[index], updatedProperties);
  // update polyline style if present
  if (localDrawings.value[index].polyline)
    updateLineStyle(localDrawings.value[index].polyline, localDrawings.value[index]);
  // ensure selectedLine references the canonical object
  selectedLine.value = localDrawings.value[index];
  ElMessage.success('线段属性已更新');
};

const closePolygonPopup = () => {
  showPolygonPopup.value = false;
  selectedPolygon.value = null;
  popupTriggerRef.value = null;
};
const closePolygonContextMenu = () => {
  showPolygonContextMenu.value = false;
  selectedPolygon.value = null;
};
const openPolygonProperties = () => {
  const current = selectedPolygon.value;
  closePolygonPopup();
  closePolygonContextMenu();
  selectedPolygon.value = current;
  showPolygonPropertiesDialog.value = true;
};

const deletePolygon = async () => {
  if (!selectedPolygon.value) return;
  try {
    await ElMessageBox.confirm(`确定要删除面积"${selectedPolygon.value.name}"吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger',
    });
    if (selectedPolygon.value.polygon)
      props.mapInstance.drawingLayerGroup.removeLayer(selectedPolygon.value.polygon);
    const index = localDrawings.value.findIndex((d) => d.id === selectedPolygon.value.id);
    if (index !== -1) localDrawings.value.splice(index, 1);
    closePolygonPopup();
    closePolygonContextMenu();
    ElMessage.success('面积已删除');
  } catch (error) {}
};

const savePolygonProperties = (updatedProperties) => {
  if (!selectedPolygon.value) return;
  const index = localDrawings.value.findIndex((d) => d.id === selectedPolygon.value.id);
  if (index === -1) return;
  Object.assign(localDrawings.value[index], updatedProperties);
  if (localDrawings.value[index].polygon)
    updatePolygonStyle(localDrawings.value[index].polygon, localDrawings.value[index]);
  selectedPolygon.value = localDrawings.value[index];
  ElMessage.success('面积属性已更新');
};

const handlePointClick = (e) => {
  selectedPoint.value = e.point;
  const triggerEl = document.createElement('div');
  triggerEl.style.position = 'absolute';
  triggerEl.style.left = e.containerPoint.x + 'px';
  triggerEl.style.top = e.containerPoint.y + 'px';
  triggerEl.style.width = '1px';
  triggerEl.style.height = '1px';
  triggerEl.style.pointerEvents = 'none';
  props.mapInstance.getContainer().appendChild(triggerEl);
  popupTriggerRef.value = triggerEl;
  showPointPopup.value = true;
  setTimeout(() => {
    if (triggerEl.parentNode) triggerEl.parentNode.removeChild(triggerEl);
  }, 100);
};

const handlePointContextMenu = (e) => {
  selectedPoint.value = e.point;
  contextMenuPosition.value = e.position;
  showPointContextMenu.value = true;
};
const handleLineClick = (e) => {
  selectedLine.value = e.line;
  const triggerEl = document.createElement('div');
  triggerEl.style.position = 'absolute';
  triggerEl.style.left = e.containerPoint.x + 'px';
  triggerEl.style.top = e.containerPoint.y + 'px';
  triggerEl.style.width = '1px';
  triggerEl.style.height = '1px';
  triggerEl.style.pointerEvents = 'none';
  props.mapInstance.getContainer().appendChild(triggerEl);
  popupTriggerRef.value = triggerEl;
  showLinePopup.value = true;
  setTimeout(() => {
    if (triggerEl.parentNode) triggerEl.parentNode.removeChild(triggerEl);
  }, 100);
};
const handleLineContextMenu = (e) => {
  selectedLine.value = e.line;
  contextMenuPosition.value = e.position;
  showLineContextMenu.value = true;
};
const handlePolygonClick = (e) => {
  selectedPolygon.value = e.polygon;
  const triggerEl = document.createElement('div');
  triggerEl.style.position = 'absolute';
  triggerEl.style.left = e.containerPoint.x + 'px';
  triggerEl.style.top = e.containerPoint.y + 'px';
  triggerEl.style.width = '1px';
  triggerEl.style.height = '1px';
  triggerEl.style.pointerEvents = 'none';
  props.mapInstance.getContainer().appendChild(triggerEl);
  popupTriggerRef.value = triggerEl;
  showPolygonPopup.value = true;
  setTimeout(() => {
    if (triggerEl.parentNode) triggerEl.parentNode.removeChild(triggerEl);
  }, 100);
};
const handlePolygonContextMenu = (e) => {
  selectedPolygon.value = e.polygon;
  contextMenuPosition.value = e.position;
  showPolygonContextMenu.value = true;
};

const handleShowExport = () => {
  showExportDialog.value = true;
};

defineExpose({
  handlePointClick,
  handlePointContextMenu,
  handleLineClick,
  handleLineContextMenu,
  handlePolygonClick,
  handlePolygonContextMenu,
  handleShowExport,
});
</script>

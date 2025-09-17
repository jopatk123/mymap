import L from 'leaflet';
import { ElMessage } from 'element-plus';
import { drawings, state } from '../state.js';
import { showPointEditDialog } from '../ui/point-edit-dialog.js';

export function startDrawPoint(deactivateTool) {
  if (!state.mapInstance) return;

  const handlePointClick = (e) => {
    const idx = drawings.value.filter((d) => d.type === 'Point').length + 1;
    const defaultName = `点位${idx}`;

    const marker = L.circleMarker(e.latlng, {
      radius: 8,
      fillColor: '#ff0000',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1,
    }).addTo(state.drawingLayer);

    const pointData = {
      type: 'Point',
      coordinates: [e.latlng.lng, e.latlng.lat],
      layer: marker,
      name: defaultName,
      description: '',
      id: Date.now(),
    };

    drawings.value.push(pointData);

    let lastOpenTs = 0;
    const openEdit = (evt) => {
      const now = Date.now();
      if (now - lastOpenTs < 300) return;
      lastOpenTs = now;
      try {
        const domEvt = evt?.originalEvent || evt;
        L.DomEvent.stop(domEvt);
      } catch {}
      showPointEditDialog(pointData, state.mapInstance);
    };
    marker.on('click', openEdit);
    marker.on('touchend', openEdit);
    marker.on('pointerup', openEdit);

    deactivateTool?.();
    ElMessage.success('添加点成功，点击点位可编辑信息');
  };

  state.mapInstance.once('click', handlePointClick);
}

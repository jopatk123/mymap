import L from 'leaflet';
import { ElMessage } from 'element-plus';
import { drawings, state } from '../state.js';
import { showPointEditDialog } from '../ui/point-edit-dialog.js';
import { gcj02ToWgs84, wgs84ToGcj02 } from '@/utils/coordinate-transform.js';

export function startDrawPoint(deactivateTool) {
  if (!state.mapInstance) return;

  const handlePointClick = (e) => {
    const idx = drawings.value.filter((d) => d.type === 'Point').length + 1;
    const defaultName = `点位${idx}`;

    // create an interactive marker and place it on the marker pane so clicks are handled
    const marker = L.circleMarker(e.latlng, {
      radius: 8,
      fillColor: '#ff0000',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1,
      // ensure interactivity
      interactive: true,
      // prefer placing on default marker pane so popups and events behave normally
      pane: 'markerPane',
    }).addTo(state.drawingLayer);

    // 将地图点击得到的 GCJ-02 坐标转换为 WGS84 进行存储与展示
    const [wgsLng, wgsLat] = gcj02ToWgs84(e.latlng.lng, e.latlng.lat);

    const pointData = {
      type: 'Point',
      coordinates: [wgsLng, wgsLat], // 内部与对话框均使用 WGS84
      coordinateSystem: 'wgs84',
      layer: marker,
      name: defaultName,
      description: '',
      id: Date.now(),
    };

    drawings.value.push(pointData);

    let lastOpenTs = 0;
    const openEdit = (evt) => {
      console.debug('[drawing-tools] marker event fired', { evt, pointData });
      const now = Date.now();
      if (now - lastOpenTs < 300) return;
      lastOpenTs = now;
      try {
        const domEvt = evt?.originalEvent || evt;
        // stop propagation to avoid map click handlers consuming the event
        L.DomEvent.stop(domEvt);
      } catch (err) {
        console.warn('[drawing-tools] failed to stop dom event', err);
      }
      // open edit dialog（对话框展示/编辑 WGS84；更新图层时转换为 GCJ-02 渲染）
      showPointEditDialog(pointData, state.mapInstance, {
        onPositionChange: (lngWgs, latWgs) => {
          try {
            const [gcjLng, gcjLat] = wgs84ToGcj02(lngWgs, latWgs);
            const newLatLng = L.latLng(gcjLat, gcjLng);
            pointData.layer.setLatLng(newLatLng);
            state.mapInstance?.setView(newLatLng, state.mapInstance.getZoom());
          } catch (_) {}
        },
      });
    };
    marker.on('click', openEdit);
    marker.on('touchend', openEdit);
    marker.on('pointerup', openEdit);

    deactivateTool?.();
    ElMessage.success('添加点成功，点击点位可编辑信息');
  };

  state.mapInstance.once('click', handlePointClick);
}

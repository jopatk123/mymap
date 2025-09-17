import L from 'leaflet';
import { ElMessage, ElMessageBox } from 'element-plus';

export function showPointEditDialog(pointData, mapInstance) {
  const dialogContent = `
      <div style="padding: 20px;">
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">点位名称：</label>
          <input id="point-name" type="text" value="${pointData.name}" 
                 style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" />
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">描述信息：</label>
          <textarea id="point-description" rows="3" 
                    style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"
                    placeholder="请输入描述信息">${pointData.description}</textarea>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">经纬度 (WGS84)：</label>
          <div style="display: flex; gap: 10px;">
            <div style="flex: 1;">
              <label style="font-size: 12px; color: #666;">经度：</label>
              <input id="point-lng" type="number" step="any" value="${pointData.coordinates[0]}" 
                     style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;" />
            </div>
            <div style="flex: 1;">
              <label style="font-size: 12px; color: #666;">纬度：</label>
              <input id="point-lat" type="number" step="any" value="${pointData.coordinates[1]}" 
                     style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;" />
            </div>
          </div>
        </div>
        <div style="margin-bottom: 15px;">
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button id="copy-coords" type="button" 
                    style="padding: 8px 12px; background: #409eff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
              复制经纬度
            </button>
            <button id="open-amap" type="button" 
                    style="padding: 8px 12px; background: #00a6fb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
              高德地图
            </button>
            <button id="open-baidu" type="button" 
                    style="padding: 8px 12px; background: #3385ff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
              百度地图
            </button>
          </div>
        </div>
      </div>
    `;

  ElMessageBox({
    title: '编辑点位信息',
    message: dialogContent,
    dangerouslyUseHTMLString: true,
    showCancelButton: true,
    confirmButtonText: '保存',
    cancelButtonText: '取消',
    beforeClose: (action, instance, done) => {
      if (action === 'confirm') {
        const nameInput = document.getElementById('point-name');
        const descInput = document.getElementById('point-description');
        const lngInput = document.getElementById('point-lng');
        const latInput = document.getElementById('point-lat');

        const newName = nameInput.value.trim();
        const newDesc = descInput.value.trim();
        const newLng = parseFloat(lngInput.value);
        const newLat = parseFloat(latInput.value);

        if (!newName) {
          ElMessage.error('点位名称不能为空');
          return;
        }
        if (isNaN(newLng) || isNaN(newLat)) {
          ElMessage.error('经纬度格式不正确');
          return;
        }

        pointData.name = newName;
        pointData.description = newDesc;

        const coordsChanged = pointData.coordinates[0] !== newLng || pointData.coordinates[1] !== newLat;
        if (coordsChanged) {
          pointData.coordinates = [newLng, newLat];
          const newLatLng = L.latLng(newLat, newLng);
          pointData.layer.setLatLng(newLatLng);
          mapInstance.setView(newLatLng, mapInstance.getZoom());
        }

        ElMessage.success('点位信息已更新');
      }
      done();
    },
  })
    .then(() => {})
    .catch(() => {});

  setTimeout(() => {
    const copyBtn = document.getElementById('copy-coords');
    const amapBtn = document.getElementById('open-amap');
    const baiduBtn = document.getElementById('open-baidu');

    if (copyBtn) {
      copyBtn.onclick = () => {
        const lng = parseFloat(document.getElementById('point-lng').value);
        const lat = parseFloat(document.getElementById('point-lat').value);
        const coordsText = `${lng.toFixed(6)},${lat.toFixed(6)}`;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(coordsText).then(() => ElMessage.success('经纬度已复制到剪贴板'));
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = coordsText;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          ElMessage.success('经纬度已复制到剪贴板');
        }
      };
    }

    if (amapBtn) {
      amapBtn.onclick = () => {
        const lng = document.getElementById('point-lng').value;
        const lat = document.getElementById('point-lat').value;
        const url = `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(pointData.name)}`;
        window.open(url, '_blank');
      };
    }

    if (baiduBtn) {
      baiduBtn.onclick = () => {
        const lng = document.getElementById('point-lng').value;
        const lat = document.getElementById('point-lat').value;
        const url = `https://api.map.baidu.com/marker?location=${lat},${lng}&title=${encodeURIComponent(pointData.name)}&content=${encodeURIComponent(pointData.description || '')}&output=html&src=webapp.baidu.openAPIdemo`;
        window.open(url, '_blank');
      };
    }
  }, 100);
}

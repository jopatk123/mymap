import L from 'leaflet';
import { ElMessage, ElMessageBox } from 'element-plus';
import { drawings, state } from '../state.js';
import { gcj02ToWgs84 } from '@/utils/coordinate-transform.js';

// 启动画圆工具
export function startDrawCircle(deactivateTool) {
  if (!state.mapInstance) return;

  // 弹出对话框让用户输入半径
  ElMessageBox.prompt('请输入圆的半径（单位：千米）', '画圆工具', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /^[0-9]+(\.[0-9]+)?$/,
    inputErrorMessage: '请输入有效的数字',
    inputValue: '10',
  })
    .then(({ value }) => {
      const radiusKm = parseFloat(value);
      if (radiusKm <= 0) {
        ElMessage.error('半径必须大于0');
        deactivateTool?.();
        return;
      }

      const radiusMeters = radiusKm * 1000; // 转换为米
      ElMessage.info('请在地图上点击一个位置来放置圆');

      // 设置地图点击事件
      const onClick = (e) => {
        // 转换为WGS84坐标
        const [wgsLng, wgsLat] = gcj02ToWgs84(e.latlng.lng, e.latlng.lat);

        // 创建圆形
        const circle = L.circle(e.latlng, {
          radius: radiusMeters,
          color: '#3388ff',
          fillColor: '#3388ff',
          fillOpacity: 0.2,
          weight: 2,
        }).addTo(state.drawingLayer);

        // 添加到绘制列表
        drawings.value.push({
          type: 'Circle',
          coordinates: [wgsLng, wgsLat], // 圆心WGS84坐标
          coordinateSystem: 'wgs84',
          radius: radiusMeters, // 半径（米）
          layer: circle,
          name: `圆形 (半径: ${radiusKm}km)`,
        });

        ElMessage.success(`已添加圆形，半径 ${radiusKm} 千米`);

        // 清理事件并结束工具
        cleanup();
        deactivateTool?.();
      };

      const cleanup = () => {
        state.mapInstance.off('click', onClick);
      };

      state.mapInstance.on('click', onClick);
    })
    .catch(() => {
      // 用户取消输入
      ElMessage.info('已取消画圆');
      deactivateTool?.();
    });
}

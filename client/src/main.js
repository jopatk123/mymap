import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import router from './router';
import App from './App.vue';
import './styles/global.scss';
import './styles/popup-overrides.scss';
import './styles/pannellum-fixes.css';
import './assets/css/drawing-tools.css';
// 引入 Leaflet.markercluster 依赖样式（JS 通过插件包引入）
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import L from 'leaflet';
import 'leaflet.markercluster';
import pinia, { useAuthStore } from './store';

// 防御性补丁：避免 Leaflet 在动画缩放时对已移除的 Marker 调用 _animateZoom 导致报错
// 某些聚合/移除的时机下，marker._map 可能为 null，但仍收到 zoomanim 事件
try {
  const originalAnimateZoom = L.Marker && L.Marker.prototype && L.Marker.prototype._animateZoom;
  if (originalAnimateZoom) {
    L.Marker.prototype._animateZoom = function (e) {
      if (!this._map) return;
      return originalAnimateZoom.call(this, e);
    };
  }
  // 对 markercluster 在缩放/平移结束时的回调增加空映射保护
  if (L.MarkerClusterGroup && L.MarkerClusterGroup.prototype) {
    const mcgProto = L.MarkerClusterGroup.prototype;
    const originalMoveEnd = mcgProto._moveEnd;
    if (originalMoveEnd) {
      mcgProto._moveEnd = function () {
        if (!this._map) return;
        return originalMoveEnd.apply(this, arguments);
      };
    }
    const originalGetExpanded = mcgProto._getExpandedVisibleBounds;
    if (originalGetExpanded) {
      mcgProto._getExpandedVisibleBounds = function () {
        if (!this._map) {
          // 返回一个空范围，避免访问空 map
          return L.latLngBounds([]);
        }
        return originalGetExpanded.apply(this, arguments);
      };
    }
  }
} catch (e) {
  // 忽略补丁失败
}

const app = createApp(App);

app.use(pinia);
app.use(router);
app.use(ElementPlus, {
  // 全局配置Element Plus消息提示的默认显示时间为1秒
  message: {
    duration: 1000,
  },
});

const authStore = useAuthStore(pinia);
const isSuperAdminPage =
  typeof window !== 'undefined' && window.location.pathname.startsWith('/super-admin');

if (isSuperAdminPage) {
  app.mount('#app');
} else {
  authStore
    .loadUser()
    .catch(() => {
      // 未登录时忽略错误
    })
    .finally(() => {
      app.mount('#app');
    });
}

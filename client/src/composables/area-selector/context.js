// 区域选择 - 上下文与基础状态
import { ref, computed } from 'vue';
import { useKMLBaseMapStore } from '@/store/kml-basemap.js';

export function createAreaSelectorContext() {
  const store = useKMLBaseMapStore();

  // 模式 & 状态
  const currentMode = ref(null); // 'circle' | 'polygon' | null
  const circleRadius = ref(1000);
  const isDrawingCircle = ref(false);
  const isDrawingPolygon = ref(false);
  const polygonPoints = ref([]);
  const tempPolygonName = ref('');

  // 地图与图层
  const mapInstance = ref(null);
  const tempLayers = ref([]); // 正在绘制预览
  const persistentLayers = ref({}); // 已保存区域

  // 计算属性
  const isActive = computed(() => currentMode.value !== null);
  const isDrawing = computed(() => isDrawingCircle.value || isDrawingPolygon.value);
  const areas = computed(() => store.areas);
  const areasCount = computed(() => store.areasCount);

  return {
    // store
    store,
    // refs
    currentMode,
    circleRadius,
    isDrawingCircle,
    isDrawingPolygon,
    polygonPoints,
    tempPolygonName,
    mapInstance,
    tempLayers,
    persistentLayers,
    // computed
    isActive,
    isDrawing,
    areas,
    areasCount,
  };
}

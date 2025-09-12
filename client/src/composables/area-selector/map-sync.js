// 区域图层与地图同步逻辑
import { watch } from 'vue'
import { wgs84ToGcj02 } from '@/utils/coordinate-transform.js'

export function createMapSync(context) {
  const { store, mapInstance, persistentLayers } = context

  const syncPersistentLayers = () => {
    try {
      if (!mapInstance.value || !window.L) return

      const existing = persistentLayers.value || {}
      const areaIds = new Set(store.areas.map(a => a.id))

      // 移除缺失区域
      for (const id of Object.keys(existing)) {
        if (!areaIds.has(id)) {
          try { mapInstance.value.removeLayer(existing[id]) } catch (_) {}
          delete existing[id]
        }
      }

      // 添加/更新
      for (const area of store.areas) {
        if (existing[area.id]) {
          const layer = existing[area.id]
          if (area.visible === false) {
            try { mapInstance.value.removeLayer(layer) } catch (_) {}
          } else {
            try { layer.addTo(mapInstance.value) } catch (_) {}
          }
          continue
        }

        let layer = null
        if (area.type === 'circle' && window.L) {
          try {
            const [gcjLng, gcjLat] = wgs84ToGcj02(area.center.longitude, area.center.latitude)
            layer = window.L.circle([gcjLat, gcjLng], {
              radius: area.radius,
              color: 'blue',
              weight: 2,
              opacity: 0.6,
              fill: false
            })
          } catch (err) {
            layer = window.L.circle([area.center.latitude, area.center.longitude], {
              radius: area.radius,
              color: 'blue',
              weight: 2,
              opacity: 0.6,
              fill: false
            })
          }
        } else if (area.type === 'polygon' && window.L) {
          const latlngs = (area.polygon || []).map(p => {
            try {
              const [gcjLng, gcjLat] = wgs84ToGcj02(p.longitude, p.latitude)
              return [gcjLat, gcjLng]
            } catch (err) {
              return [p.latitude, p.longitude]
            }
          })
          layer = window.L.polygon(latlngs, {
            color: 'blue',
            weight: 2,
            opacity: 0.7,
            fill: false
          })
        }

        if (layer) {
          try { layer.addTo(mapInstance.value) } catch (_) {}
          existing[area.id] = layer
        }
      }

      persistentLayers.value = existing
    } catch (err) {
      console.warn('[useAreaSelector] syncPersistentLayers error', err)
    }
  }

  // 监听
  watch(() => store.areas, () => syncPersistentLayers(), { deep: true })
  watch(mapInstance, v => { if (v) syncPersistentLayers() })

  return { syncPersistentLayers }
}

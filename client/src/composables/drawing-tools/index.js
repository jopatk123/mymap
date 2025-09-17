import { ref, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import L from 'leaflet';

// 全局状态
const activeTool = ref(null);
const drawings = ref([]);
let mapInstance = null;
let drawingLayer = null;
let currentPath = null;
let isDrawing = false;
let measureTooltip = null;

export function useDrawingTools() {
  // 计算属性
  const hasDrawings = computed(() => drawings.value.length > 0);

  // 初始化工具
  const initializeTools = (map) => {
    mapInstance = map;
    if (!drawingLayer) {
      drawingLayer = L.layerGroup().addTo(mapInstance);
    }
  };

  // 激活工具
  const activateTool = (toolType) => {
    if (!mapInstance) return;
    
    // 先停用当前工具
    deactivateTool();
    
    activeTool.value = toolType;
    
    switch (toolType) {
      case 'measure':
        startMeasure();
        break;
      case 'point':
        startDrawPoint();
        break;
      case 'line':
        startDrawLine();
        break;
      case 'polygon':
        startDrawPolygon();
        break;
      case 'draw':
        startFreehand();
        break;
    }
  };

  // 停用工具
  const deactivateTool = () => {
    if (mapInstance) {
      mapInstance.off('click');
      mapInstance.off('mousemove');
      mapInstance.off('mousedown');
      mapInstance.off('mouseup');
      mapInstance.off('dblclick');
      
      // 确保重新启用地图拖拽（特别是画笔工具）
      if (mapInstance.dragging && !mapInstance.dragging.enabled()) {
        mapInstance.dragging.enable();
      }
    }
    
    // 清理测距工具的临时提示框（未完成的测距）
    if (measureTooltip) {
      mapInstance.removeLayer(measureTooltip);
      measureTooltip = null;
    }
    
    currentPath = null;
    isDrawing = false;
    activeTool.value = null;
  };

  // 测距工具
  const startMeasure = () => {
    let measureLine = null;
    let totalDistance = 0;
    let points = [];
    let segmentTooltips = []; // 存储每段距离的提示框

    mapInstance.on('click', (e) => {
      points.push(e.latlng);
      
      if (points.length === 1) {
        // 第一个点，创建线
        measureLine = L.polyline(points, {
          color: '#ff0000',
          weight: 2,
          dashArray: '5, 5'
        }).addTo(drawingLayer);
      } else {
        // 更新线
        measureLine.setLatLngs(points);
        
        // 计算当前段距离
        const currentSegmentDistance = points[points.length - 2].distanceTo(points[points.length - 1]);
        const segmentOutput = currentSegmentDistance > 1000 ? 
          Math.round(currentSegmentDistance / 1000 * 100) / 100 + ' km' : 
          Math.round(currentSegmentDistance * 100) / 100 + ' m';
        
        // 在当前段的中点显示距离
        const midPoint = L.latLng(
          (points[points.length - 2].lat + points[points.length - 1].lat) / 2,
          (points[points.length - 2].lng + points[points.length - 1].lng) / 2
        );
        
        const segmentTooltip = L.tooltip({
          permanent: true,
          direction: 'center',
          className: 'segment-distance-tooltip'
        }).setLatLng(midPoint).setContent(segmentOutput).addTo(mapInstance);
        
        segmentTooltips.push(segmentTooltip);
        
        // 计算总距离
        totalDistance = 0;
        for (let i = 0; i < points.length - 1; i++) {
          totalDistance += points[i].distanceTo(points[i + 1]);
        }
        
        // 显示总距离
        const totalOutput = '总距离: ' + (totalDistance > 1000 ? 
          Math.round(totalDistance / 1000 * 100) / 100 + ' km' : 
          Math.round(totalDistance * 100) / 100 + ' m');
        
        if (measureTooltip) {
          measureTooltip.setLatLng(e.latlng).setContent(totalOutput);
        } else {
          measureTooltip = L.tooltip({
            permanent: true,
            direction: 'top',
            className: 'total-distance-tooltip'
          }).setLatLng(e.latlng).setContent(totalOutput).addTo(mapInstance);
        }
      }
    });

    mapInstance.on('dblclick', () => {
      if (measureLine) {
        drawings.value.push({
          type: 'Measure',
          coordinates: points.map(p => [p.lng, p.lat]),
          layer: measureLine,
          distance: totalDistance,
          tooltips: [...segmentTooltips, measureTooltip] // 保存所有提示框
        });
      }
      // 重置变量，但不清除提示框（它们已经保存到drawings中）
      segmentTooltips = [];
      measureTooltip = null;
      deactivateTool();
      ElMessage.success('测距完成');
    });
  };

  // 添加点工具
  const startDrawPoint = () => {
    const handlePointClick = (e) => {
      // 生成默认点位名称
      const pointIndex = drawings.value.filter(d => d.type === 'Point').length + 1;
      const defaultName = `点位${pointIndex}`;
      
      const marker = L.circleMarker(e.latlng, {
        radius: 8,
        fillColor: '#ff0000',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1
      }).addTo(drawingLayer);
      
      // 创建点位数据
      const pointData = {
        type: 'Point',
        coordinates: [e.latlng.lng, e.latlng.lat],
        layer: marker,
        name: defaultName,
        description: '',
        id: Date.now() // 用于唯一标识
      };
      
      drawings.value.push(pointData);
      
      // 添加点击事件处理
      marker.on('click', (markerEvent) => {
        L.DomEvent.stopPropagation(markerEvent);
        showPointEditDialog(pointData);
      });
      
      // 添加成功后立即结束添加点工具
      deactivateTool();
      ElMessage.success('添加点成功，点击点位可编辑信息');
    };

    // 只监听一次点击事件
    mapInstance.once('click', handlePointClick);
  };

  // 添加线工具
  const startDrawLine = () => {
    let points = [];
    let polyline = null;

    mapInstance.on('click', (e) => {
      points.push(e.latlng);
      
      if (points.length === 1) {
        polyline = L.polyline(points, {
          color: '#0000ff',
          weight: 3
        }).addTo(drawingLayer);
      } else {
        polyline.setLatLngs(points);
      }
    });

    mapInstance.on('dblclick', () => {
      if (polyline && points.length > 1) {
        drawings.value.push({
          type: 'LineString',
          coordinates: points.map(p => [p.lng, p.lat]),
          layer: polyline
        });
        ElMessage.success('添加线成功');
      }
      deactivateTool();
    });
  };

  // 添加面工具
  const startDrawPolygon = () => {
    let points = [];
    let polygon = null;

    mapInstance.on('click', (e) => {
      points.push(e.latlng);
      
      if (points.length === 1) {
        polygon = L.polygon(points, {
          fillColor: '#00ff00',
          fillOpacity: 0.3,
          color: '#00ff00',
          weight: 2
        }).addTo(drawingLayer);
      } else {
        polygon.setLatLngs(points);
      }
    });

    mapInstance.on('dblclick', () => {
      if (polygon && points.length > 2) {
        drawings.value.push({
          type: 'Polygon',
          coordinates: [points.map(p => [p.lng, p.lat])],
          layer: polygon
        });
        ElMessage.success('添加面成功');
      }
      deactivateTool();
    });
  };

  // 画笔工具
  const startFreehand = () => {
    let points = [];
    let polyline = null;
    
    // 禁用地图拖拽
    mapInstance.dragging.disable();

    mapInstance.on('mousedown', (e) => {
      isDrawing = true;
      points = [e.latlng];
      polyline = L.polyline(points, {
        color: '#ff6600',
        weight: 4,
        smoothFactor: 1
      }).addTo(drawingLayer);
      
      // 阻止事件冒泡
      L.DomEvent.stopPropagation(e.originalEvent);
    });

    mapInstance.on('mousemove', (e) => {
      if (isDrawing && polyline) {
        points.push(e.latlng);
        polyline.setLatLngs(points);
      }
    });

    mapInstance.on('mouseup', () => {
      isDrawing = false;
    });

    // 双击结束画笔绘制
    mapInstance.on('dblclick', () => {
      if (polyline && points.length > 1) {
        drawings.value.push({
          type: 'Freehand',
          coordinates: points.map(p => [p.lng, p.lat]),
          layer: polyline
        });
        ElMessage.success('画笔绘制完成');
        deactivateTool();
      }
    });
  };

  // 显示点位编辑对话框
  const showPointEditDialog = (pointData) => {
    // 创建对话框内容
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
          
          // 更新点位数据
          pointData.name = newName;
          pointData.description = newDesc;
          
          // 检查坐标是否有变化
          const coordsChanged = pointData.coordinates[0] !== newLng || pointData.coordinates[1] !== newLat;
          
          if (coordsChanged) {
            pointData.coordinates = [newLng, newLat];
            // 更新地图上的点位位置
            const newLatLng = L.latLng(newLat, newLng);
            pointData.layer.setLatLng(newLatLng);
            // 跳转到新位置
            mapInstance.setView(newLatLng, mapInstance.getZoom());
          }
          
          ElMessage.success('点位信息已更新');
        }
        done();
      }
    }).then(() => {
      // 确认保存
    }).catch(() => {
      // 取消操作
    });

    // 添加按钮事件监听器
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
            navigator.clipboard.writeText(coordsText).then(() => {
              ElMessage.success('经纬度已复制到剪贴板');
            });
          } else {
            // 兼容旧浏览器
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
          // 百度地图使用不同的坐标系，这里直接使用WGS84坐标
          const url = `https://api.map.baidu.com/marker?location=${lat},${lng}&title=${encodeURIComponent(pointData.name)}&content=${encodeURIComponent(pointData.description || '')}&output=html&src=webapp.baidu.openAPIdemo`;
          window.open(url, '_blank');
        };
      }
    }, 100);
  };

  // 清除所有绘制
  const clearAllDrawings = () => {
    return new Promise((resolve) => {
      if (drawingLayer) {
        drawingLayer.clearLayers();
      }
      
      if (measureTooltip) {
        mapInstance.removeLayer(measureTooltip);
        measureTooltip = null;
      }
      
      // 清除所有测距工具的提示框
      drawings.value.forEach(drawing => {
        if (drawing.tooltips) {
          drawing.tooltips.forEach(tooltip => {
            if (tooltip && mapInstance.hasLayer(tooltip)) {
              mapInstance.removeLayer(tooltip);
            }
          });
        }
      });
      
      drawings.value = [];
      deactivateTool();
      
      ElMessage.success('已清除所有绘制内容');
      resolve();
    });
  };

  // 导出KML
  const exportToKml = () => {
    if (drawings.value.length === 0) {
      ElMessage.warning('没有可导出的内容');
      return;
    }

    let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>地图绘制内容</name>
    <description>从地图工具导出的绘制内容</description>
`;

    drawings.value.forEach((drawing, index) => {
      const name = drawing.name || `${getDrawingTypeName(drawing.type)}_${index + 1}`;
      const description = drawing.description || `用户绘制的${getDrawingTypeName(drawing.type)}`;
      
      kmlContent += `    <Placemark>
      <name>${name}</name>
      <description>${description}</description>
`;

      if (drawing.type === 'Point') {
        kmlContent += `      <Point>
        <coordinates>${drawing.coordinates[0]},${drawing.coordinates[1]},0</coordinates>
      </Point>
`;
      } else if (drawing.type === 'LineString' || drawing.type === 'Freehand' || drawing.type === 'Measure') {
        kmlContent += `      <LineString>
        <coordinates>
`;
        drawing.coordinates.forEach(coord => {
          kmlContent += `          ${coord[0]},${coord[1]},0\n`;
        });
        kmlContent += `        </coordinates>
      </LineString>
`;
      } else if (drawing.type === 'Polygon') {
        kmlContent += `      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
`;
        drawing.coordinates[0].forEach(coord => {
          kmlContent += `              ${coord[0]},${coord[1]},0\n`;
        });
        // 确保多边形闭合
        if (drawing.coordinates[0].length > 0) {
          const firstCoord = drawing.coordinates[0][0];
          kmlContent += `              ${firstCoord[0]},${firstCoord[1]},0\n`;
        }
        kmlContent += `            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
`;
      }

      kmlContent += `    </Placemark>
`;
    });

    kmlContent += `  </Document>
</kml>`;

    // 下载文件
    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `地图绘制_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.kml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    ElMessage.success('KML文件导出成功');
  };

  // 获取绘制类型中文名称
  const getDrawingTypeName = (type) => {
    const typeNames = {
      'Point': '点',
      'LineString': '线',
      'Polygon': '面',
      'Freehand': '画笔',
      'Measure': '测距'
    };
    return typeNames[type] || type;
  };

  return {
    // 状态
    activeTool,
    hasDrawings,
    drawings,

    // 方法
    initializeTools,
    activateTool,
    deactivateTool,
    clearAllDrawings,
    exportToKml,
  };
}

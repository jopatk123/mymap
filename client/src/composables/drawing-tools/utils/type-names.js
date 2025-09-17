export function getDrawingTypeName(type) {
  const typeNames = {
    Point: '点',
    LineString: '线',
    Polygon: '面',
    Freehand: '画笔',
    Measure: '测距',
  };
  return typeNames[type] || type;
}

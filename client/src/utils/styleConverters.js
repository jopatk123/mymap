// 转换API格式到组件格式
export const convertFromApiFormat = (apiData) => {
  const converted = {
    color: apiData.point_color,
    size: Number(apiData.point_size),
    opacity: parseFloat(apiData.point_opacity),
    labelSize: Number(apiData.point_label_size),
    labelColor: apiData.point_label_color
  }
  return converted
}

// 转换组件格式到API格式
export const convertToApiFormat = (componentData) => {
  const converted = {
    point_color: componentData.color,
    point_size: componentData.size,
    point_opacity: componentData.opacity,
    point_icon_type: 'marker', // 固定使用marker形状
    point_label_size: componentData.labelSize,
    point_label_color: componentData.labelColor
  }
  return converted
}
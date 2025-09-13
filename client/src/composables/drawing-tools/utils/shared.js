export const TYPE_LABEL = {
  point: '点位',
  line: '线段',
  polygon: '区域',
  measure: '测距',
  draw: '自由绘'
}

export const getTypeLabel = (type) => TYPE_LABEL[type] || type

export function saveBlob(data, mimeType, filename) {
  const blob = new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

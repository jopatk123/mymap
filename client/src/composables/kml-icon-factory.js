// 简单图标形状缓存：按 size/color/opacity 缓存 SVG 片段，减少重复字符串构造
const iconShapeCache = new Map() // key -> svgHtml

export function createPointIcon(pointSize, pointColor, pointOpacity, labelSize = 0, labelColor = null, labelText = '') {
  // 确保数值类型
  const safePointSize = Number(pointSize) || 8
  const safePointOpacity = Number(pointOpacity) || 1.0
  const safeLabelSize = Number(labelSize) || 0

  const getIconShapeHtml = (size) => {
    const key = `${size}|${pointColor}|${safePointOpacity}`
    let cached = iconShapeCache.get(key)
    if (!cached) {
      cached = `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 3.2}" viewBox="0 0 25 41" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <path fill="${pointColor}" stroke="#fff" stroke-width="2" d="M12.5,0C5.6,0,0,5.6,0,12.5c0,6.9,12.5,28.5,12.5,28.5s12.5-21.6,12.5-28.5C25,5.6,19.4,0,12.5,0z" opacity="${safePointOpacity}"/>
        <circle fill="#fff" cx="12.5" cy="12.5" r="6"/>
        <circle fill="${pointColor}" cx="12.5" cy="12.5" r="3" opacity="${safePointOpacity}"/>
      </svg>`
      iconShapeCache.set(key, cached)
    }
    return cached
  };

  // 当字体大小为0时，不显示标签，只显示点
  if (safeLabelSize === 0) {
    const iconHtml = `
      <div style="position: relative; width: 100%; height: 100%; background: transparent !important; border: none !important;">
        ${getIconShapeHtml(safePointSize)}
      </div>
    `;

    const iconSize = [safePointSize * 2, safePointSize * 3.2];
    const iconAnchor = [safePointSize, safePointSize * 3.2];

    return {
      html: iconHtml,
      className: '',
      iconSize: iconSize,
      iconAnchor: iconAnchor,
    };
  }

  // 字体大小大于0时，显示点和标签
  const getLabelPosition = (size, lblSize) => {
    return {
      top: `-${size * 1.2 + lblSize + 4}px`,
      marginBottom: '2px'
    };
  };

  const labelPosition = getLabelPosition(safePointSize, safeLabelSize);

  const iconHtml = `
    <div style="position: relative; width: 100%; height: 100%; background: transparent !important; border: none !important;">
      <div style="
        position: absolute;
        left: 50%;
        top: ${labelPosition.top};
        transform: translateX(-50%);
        margin-bottom: ${labelPosition.marginBottom};
        padding: 2px 5px;
        background-color: rgba(255, 255, 255, 0.75);
        border-radius: 3px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        white-space: nowrap;
        font-weight: 500;
        text-shadow: 1px 1px 2px rgba(255,255,255,0.8);
        font-size: ${labelSize}px;
        color: ${labelColor};
        writing-mode: horizontal-tb !important;
        text-orientation: mixed !important;
        display: inline-block !important;
        font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
        z-index: 1000;
      ">
        ${labelText}
      </div>
      ${getIconShapeHtml(safePointSize)}
    </div>
  `;

  const iconHeight = safePointSize * 3.2;
  const totalHeight = iconHeight + safeLabelSize + 8;
  const iconSize = [safePointSize * 2, totalHeight];
  
  const anchorY = iconHeight + safeLabelSize + 4;
  const iconAnchor = [safePointSize, anchorY];

  return {
    html: iconHtml,
    className: '',
    iconSize: iconSize,
    iconAnchor: iconAnchor,
  };
}
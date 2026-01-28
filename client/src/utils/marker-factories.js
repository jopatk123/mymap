import L from 'leaflet';

function getIconShapeHtml(size, color, opacity) {
  const safeSize = Number(size) || 8;
  const safeOpacity = Number(opacity) || 1.0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${safeSize * 2}" height="${
    safeSize * 3.2
  }" viewBox="0 0 25 41" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
    <path fill="${color}" stroke="#fff" stroke-width="2" d="M12.5,0C5.6,0,0,5.6,0,12.5c0,6.9,12.5,28.5,12.5,28.5s12.5-21.6,12.5-28.5C25,5.6,19.4,0,12.5,0z" opacity="${safeOpacity}"/>
    <circle fill="#fff" cx="12.5" cy="12.5" r="6"/>
    <circle fill="${color}" cx="12.5" cy="12.5" r="3" opacity="${safeOpacity}"/>
  </svg>`;
}

/**
 * 创建自定义全景图标记
 * @param {Array} latlng [lat, lng]
 * @param {Object} options 选项
 * @param {Object} styleConfig 样式配置
 * @returns {L.Marker}
 */
export function createPanoramaMarker(latlng, options = {}, styleConfig = null) {
  if (!window.panoramaPointStyles) {
    window.panoramaPointStyles = {
      point_visible: true,
      point_color: '#2ed573',
      point_size: 10,
      point_opacity: 1.0,
      point_icon_type: 'marker',
      point_label_size: 12,
      point_label_color: '#000000',
    };
  }

  const styles = styleConfig ?? window.panoramaPointStyles;
  const labelText = options.title || '全景图';
  const labelSize = Number(styles.point_label_size ?? 12);

  if (labelSize === 0) {
    const iconHtml = getIconShapeHtml(styles.point_size, styles.point_color, styles.point_opacity);
    const iconSize = [styles.point_size * 2, styles.point_size * 3.2];
    const iconAnchor = [styles.point_size, styles.point_size * 3.2];
    const icon = L.divIcon({
      className: 'panorama-marker',
      html: iconHtml,
      iconSize: iconSize,
      iconAnchor: iconAnchor,
    });
    return L.marker(latlng, { icon, updateWhenZoom: false, ...options });
  }

  const getLabelPosition = (size, labelSize) => {
    return { top: `-${size * 1.2 + labelSize + 4}px`, marginBottom: '2px' };
  };

  const labelPosition = getLabelPosition(styles.point_size, labelSize);
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
        color: ${styles.point_label_color};
        writing-mode: horizontal-tb !important;
        text-orientation: mixed !important;
        display: inline-block !important;
        font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
        z-index: 1000;
      ">
        ${labelText}
      </div>
      ${getIconShapeHtml(styles.point_size, styles.point_color, styles.point_opacity)}
    </div>
  `;

  const iconHeight = styles.point_size * 3.2;
  const totalHeight = iconHeight + labelSize + 8;
  const iconSize = [styles.point_size * 2, totalHeight];
  const anchorY = iconHeight + labelSize + 4;
  const iconAnchor = [styles.point_size, anchorY];

  const icon = L.divIcon({
    className: 'panorama-marker',
    html: iconHtml,
    iconSize: iconSize,
    iconAnchor: iconAnchor,
  });

  return L.marker(latlng, { icon, updateWhenZoom: false, ...options });
}

/**
 * 创建自定义视频点位标记
 * @param {Array} latlng [lat, lng]
 * @param {Object} options 选项
 * @param {Object} styleConfig 样式配置
 * @returns {L.Marker}
 */
export function createVideoMarker(latlng, options = {}, styleConfig = null) {
  if (!window.videoPointStyles) {
    window.videoPointStyles = {
      point_visible: true,
      point_color: '#ff4757',
      point_size: 10,
      point_opacity: 1.0,
      point_icon_type: 'marker',
      point_label_size: 14,
      point_label_color: '#000000',
    };
  }

  const styles = styleConfig ?? window.videoPointStyles;
  const labelText = options.title || '视频点位';
  const labelSize = Number(styles.point_label_size ?? 14);

  if (labelSize === 0) {
    const iconHtml = getIconShapeHtml(styles.point_size, styles.point_color, styles.point_opacity);
    const iconSize = [styles.point_size * 2, styles.point_size * 3.2];
    const iconAnchor = [styles.point_size, styles.point_size * 3.2];
    const icon = L.divIcon({
      className: 'video-marker',
      html: iconHtml,
      iconSize: iconSize,
      iconAnchor: iconAnchor,
    });
    return L.marker(latlng, { icon, ...options });
  }

  const getLabelPosition = (size, labelSize) => {
    return { top: `-${size * 1.2 + labelSize + 4}px`, marginBottom: '2px' };
  };

  const labelPosition = getLabelPosition(styles.point_size, labelSize);
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
        color: ${styles.point_label_color};
        writing-mode: horizontal-tb !important;
        text-orientation: mixed !important;
        display: inline-block !important;
        font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
        z-index: 1000;
      ">
        ${labelText}
      </div>
      ${getIconShapeHtml(styles.point_size, styles.point_color, styles.point_opacity)}
    </div>
  `;

  const iconHeight = styles.point_size * 3.2;
  const totalHeight = iconHeight + labelSize + 8;
  const iconSize = [styles.point_size * 2, totalHeight];

  const anchorY = iconHeight + labelSize + 4;
  const iconAnchor = [styles.point_size, anchorY];

  const icon = L.divIcon({
    className: 'video-marker',
    html: iconHtml,
    iconSize: iconSize,
    iconAnchor: iconAnchor,
  });

  return L.marker(latlng, { icon, ...options });
}

/**
 * 根据点位类型创建对应的标记
 * @param {Array} latlng [lat, lng]
 * @param {string} type 点位类型 'panorama' | 'video' | 'image-set'
 * @param {Object} options 选项
 * @param {Object} styleConfig 样式配置
 * @returns {L.Marker}
 */
export function createPointMarker(latlng, type, options = {}, styleConfig = null) {
  switch (type) {
    case 'video':
      return createVideoMarker(latlng, options, styleConfig);
    case 'image-set':
      return createImageSetMarker(latlng, options, styleConfig);
    case 'panorama':
    default:
      return createPanoramaMarker(latlng, options, styleConfig);
  }
}

/**
 * 创建图片集标记
 * @param {Array} latlng [lat, lng]
 * @param {Object} options 选项
 * @param {Object} styleConfig 样式配置
 * @returns {L.Marker}
 */
export function createImageSetMarker(latlng, options = {}, styleConfig = null) {
  if (!window.imageSetPointStyles) {
    window.imageSetPointStyles = {
      point_visible: true,
      point_color: '#9b59b6',
      point_size: 10,
      point_opacity: 1.0,
      point_icon_type: 'marker',
      point_label_size: 14,
      point_label_color: '#000000',
      cluster_enabled: false,
    };
  }

  const styles = styleConfig ?? window.imageSetPointStyles;
  const labelText = options.title || '图片集';
  const labelSize = Number(styles.point_label_size ?? 14);

  if (labelSize === 0) {
    const iconHtml = getIconShapeHtml(styles.point_size, styles.point_color, styles.point_opacity);
    const iconSize = [styles.point_size * 2, styles.point_size * 3.2];
    const iconAnchor = [styles.point_size, styles.point_size * 3.2];
    const icon = L.divIcon({
      className: 'image-set-marker',
      html: iconHtml,
      iconSize: iconSize,
      iconAnchor: iconAnchor,
    });
    return L.marker(latlng, { icon, ...options });
  }

  const getLabelPosition = (size, labelSize) => {
    return { top: `-${size * 1.2 + labelSize + 4}px`, marginBottom: '2px' };
  };

  const labelPosition = getLabelPosition(styles.point_size, labelSize);
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
        color: ${styles.point_label_color};
        writing-mode: horizontal-tb !important;
        text-orientation: mixed !important;
        display: inline-block !important;
        font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
        z-index: 1000;
      ">
        ${labelText}
      </div>
      ${getIconShapeHtml(styles.point_size, styles.point_color, styles.point_opacity)}
    </div>
  `;

  const iconHeight = styles.point_size * 3.2;
  const totalHeight = iconHeight + labelSize + 8;
  const iconSize = [styles.point_size * 2, totalHeight];

  const anchorY = iconHeight + labelSize + 4;
  const iconAnchor = [styles.point_size, anchorY];

  const icon = L.divIcon({
    className: 'image-set-marker',
    html: iconHtml,
    iconSize: iconSize,
    iconAnchor: iconAnchor,
  });

  return L.marker(latlng, { icon, ...options });
}

/**
 * 根据聚合颜色与数量创建聚合簇图标
 * @param {string} color 背景色
 * @param {number} count 聚合数量
 * @returns {L.DivIcon}
 */
export function createClusterIcon(color, count) {
  const textColor = getContrastColor(color);
  const html = `
    <div style="
      background:${color};
      color:${textColor};
      border-radius:20px;
      padding:2px 8px;
      box-shadow:0 2px 6px rgba(0,0,0,0.2);
      font-weight:600;
      border:2px solid #fff;
    ">${count}</div>
  `;
  return L.divIcon({
    html,
    className: 'custom-cluster-icon',
    iconSize: [30, 30],
  });
}

function getContrastColor(bg) {
  let r = 0,
    g = 0,
    b = 0;
  if (typeof bg === 'string' && bg.startsWith('#')) {
    const hex = bg.replace('#', '');
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex;
    r = parseInt(full.slice(0, 2), 16);
    g = parseInt(full.slice(2, 4), 16);
    b = parseInt(full.slice(4, 6), 16);
  } else if (typeof bg === 'string' && bg.startsWith('rgb')) {
    const nums = bg
      .replace(/rgba?\(|\)/g, '')
      .split(',')
      .map((n) => parseFloat(n.trim()));
    [r, g, b] = nums;
  }
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000' : '#fff';
}

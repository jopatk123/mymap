function isInvalid(value, noDataValue) {
  if (value === undefined || value === null) return true;
  if (Number.isNaN(value)) return true;
  if (noDataValue !== undefined && noDataValue !== null) {
    return Number(value) === Number(noDataValue);
  }
  return false;
}

export function bilinearInterpolation(xRatio, yRatio, gridValues, noDataValue) {
  if (!Array.isArray(gridValues) || gridValues.length !== 4) {
    return null;
  }

  const [topLeft, topRight, bottomLeft, bottomRight] = gridValues.map((value) =>
    value != null ? Number(value) : value
  );

  const candidates = [topLeft, topRight, bottomLeft, bottomRight].filter(
    (value) => !isInvalid(value, noDataValue)
  );
  if (candidates.length === 0) {
    return null;
  }

  // 若部分像元缺失，则退化为加权平均（忽略缺失值）
  if (candidates.length < 4) {
    const sum = candidates.reduce((acc, value) => acc + value, 0);
    return sum / candidates.length;
  }

  const top = topLeft + (topRight - topLeft) * xRatio;
  const bottom = bottomLeft + (bottomRight - bottomLeft) * xRatio;
  return top + (bottom - top) * yRatio;
}

export function formatCoordinate(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Number.parseFloat(value.toFixed(6));
}

export function roundElevation(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Math.round(value);
}

const QueryBuilder = require('../utils/QueryBuilder');
const Logger = require('../utils/logger');
const { wgs84ToGcj02 } = require('../utils/coordinate');

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const normalizePaging = (page, pageSize) => ({
  page: parseInt(page),
  pageSize: parseInt(pageSize),
  offset: (parseInt(page) - 1) * parseInt(pageSize),
});

const findAllPanoramas = async (options, execute) => {
  const {
    page = 1,
    pageSize = 20,
    sortBy = 'created_at',
    sortOrder = 'DESC',
    keyword = '',
    bounds = null,
    folderId = null,
    includeHidden = false,
    visibleFolderIds = null,
  } = options;

  try {
    const { conditions, params } = QueryBuilder.buildPanoramaConditions({
      includeHidden,
      folderId,
      keyword,
      bounds,
      visibleFolderIds,
    });

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM panoramas p ${whereClause}`;
    const [countResult] = await execute(countSql, params);
    const total = countResult[0].total;

    const { page: normalizedPage, pageSize: normalizedPageSize, offset } = normalizePaging(
      page,
      pageSize
    );
    const dataSql = `
      SELECT p.*, f.name as folder_name 
      FROM panoramas p 
      LEFT JOIN folders f ON p.folder_id = f.id 
      ${whereClause}
      ${QueryBuilder.buildOrderClause(
        sortBy,
        sortOrder,
        ['created_at', 'title', 'latitude', 'longitude', 'sort_order'],
        'p'
      )}
      LIMIT ${normalizedPageSize} OFFSET ${offset}
    `;

    const [rows] = await execute(dataSql, params);

    return {
      data: rows,
      total: parseInt(total),
      page: normalizedPage,
      pageSize: normalizedPageSize,
      totalPages: Math.ceil(total / normalizedPageSize),
    };
  } catch (error) {
    Logger.error('获取全景图列表失败:', error);
    throw error;
  }
};

const updatePanorama = async (id, panoramaData, { findById, execute }) => {
  const before = await findById(id);
  if (!before) return null;

  const updates = [];
  const params = [];

  if (hasOwn(panoramaData, 'title')) {
    updates.push('title = ?');
    params.push(panoramaData.title);
  }
  if (hasOwn(panoramaData, 'description')) {
    updates.push('description = ?');
    params.push(panoramaData.description || null);
  }
  if (hasOwn(panoramaData, 'imageUrl')) {
    updates.push('image_url = ?');
    params.push(panoramaData.imageUrl);
  }
  if (hasOwn(panoramaData, 'thumbnailUrl')) {
    updates.push('thumbnail_url = ?');
    params.push(panoramaData.thumbnailUrl || null);
  }
  if (hasOwn(panoramaData, 'folderId')) {
    if (panoramaData.folderId !== null && panoramaData.folderId !== undefined) {
      updates.push('folder_id = ?');
      params.push(panoramaData.folderId);
    }
  }
  if (hasOwn(panoramaData, 'isVisible')) {
    updates.push('is_visible = ?');
    params.push(Boolean(panoramaData.isVisible));
  }
  if (hasOwn(panoramaData, 'sortOrder')) {
    updates.push('sort_order = ?');
    params.push(parseInt(panoramaData.sortOrder) || 0);
  }

  const hasLat = hasOwn(panoramaData, 'latitude') || hasOwn(panoramaData, 'lat');
  const hasLng = hasOwn(panoramaData, 'longitude') || hasOwn(panoramaData, 'lng');
  if (hasLat || hasLng) {
    const current = await findById(id);
    if (!current) return null;

    const latitude = hasOwn(panoramaData, 'latitude')
      ? panoramaData.latitude
      : hasOwn(panoramaData, 'lat')
      ? panoramaData.lat
      : current.latitude;
    const longitude = hasOwn(panoramaData, 'longitude')
      ? panoramaData.longitude
      : hasOwn(panoramaData, 'lng')
      ? panoramaData.lng
      : current.longitude;

    updates.push('latitude = ?');
    params.push(latitude);
    updates.push('longitude = ?');
    params.push(longitude);

    try {
      const [gcj02Lng, gcj02Lat] = wgs84ToGcj02(longitude, latitude);
      updates.push('gcj02_lat = ?');
      params.push(gcj02Lat || null);
      updates.push('gcj02_lng = ?');
      params.push(gcj02Lng || null);
    } catch (e) {
      updates.push('gcj02_lat = ?');
      params.push(null);
      updates.push('gcj02_lng = ?');
      params.push(null);
    }
  }

  if (updates.length === 0) {
    return await findById(id);
  }

  const sql = `UPDATE panoramas SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  params.push(id);
  await execute(sql, params);
  const after = await findById(id);
  try {
    const keys = [
      'id',
      'folder_id',
      'title',
      'description',
      'image_url',
      'thumbnail_url',
      'latitude',
      'longitude',
      'gcj02_lat',
      'gcj02_lng',
      'is_visible',
      'sort_order',
      'updated_at',
    ];
    const pick = (obj) => {
      const out = {};
      keys.forEach((k) => (out[k] = obj ? obj[k] : undefined));
      return out;
    };
    const beforePicked = pick(before);
    const afterPicked = pick(after);
    const changed = {};
    keys.forEach((k) => {
      if (beforePicked[k] !== afterPicked[k])
        changed[k] = { before: beforePicked[k], after: afterPicked[k] };
    });
    Logger.debug('[PanoramaModel.update] id=%s changedKeys=%o diff=%o', {
      id,
      changedKeys: Object.keys(changed),
      diff: changed,
    });
  } catch (_) {}
  return after;
};

const searchPanoramas = async (searchParams, execute) => {
  const {
    keyword = '',
    lat = null,
    lng = null,
    radius = null,
    dateFrom = null,
    dateTo = null,
    page = 1,
    pageSize = 20,
    ownerId = null,
  } = searchParams;

  const { conditions, params } = QueryBuilder.buildPanoramaConditions({
    keyword,
    dateFrom,
    dateTo,
    includeHidden: true,
    ownerId,
  });

  let sql = 'SELECT * FROM panoramas';
  let finalParams = [...params];

  if (lat && lng && radius) {
    const nearbyQuery = QueryBuilder.buildNearbyQuery(lat, lng, radius);
    sql = `SELECT *, ${nearbyQuery.selectDistance} FROM panoramas`;
    finalParams = [...nearbyQuery.params, ...finalParams];

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')} HAVING ${nearbyQuery.havingCondition}`;
    } else {
      sql += ` HAVING ${nearbyQuery.havingCondition}`;
    }
    finalParams.push(nearbyQuery.havingParam);
    sql += ' ORDER BY distance ASC';
  } else {
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY created_at DESC';
  }

  sql += ` ${QueryBuilder.buildLimitClause(page, pageSize)}`;

  const [rows] = await execute(sql, finalParams);

  let countSql = 'SELECT COUNT(*) as total FROM panoramas';
  let countParams = [...params];

  if (lat && lng && radius) {
    const nearbyQuery = QueryBuilder.buildNearbyQuery(lat, lng, radius);
    countSql = `SELECT COUNT(*) as total FROM (
      SELECT *, ${nearbyQuery.selectDistance} FROM panoramas
      ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}
      HAVING ${nearbyQuery.havingCondition}
    ) as filtered`;
    countParams = [...nearbyQuery.params, ...countParams, nearbyQuery.havingParam];
  } else if (conditions.length > 0) {
    countSql += ` WHERE ${conditions.join(' AND ')}`;
  }

  const [countResult] = await execute(countSql, countParams);
  const total = countResult[0].total;

  return {
    data: rows,
    total: parseInt(total),
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    totalPages: Math.ceil(total / pageSize),
  };
};

module.exports = {
  findAllPanoramas,
  searchPanoramas,
  updatePanorama,
};

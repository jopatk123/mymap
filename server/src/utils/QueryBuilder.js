class QueryBuilder {
  // 构建文件夹查询条件
  static buildFolderCondition(folderId, tableAlias = '') {
    const conditions = [];
    const params = [];
    const prefix = tableAlias ? `${tableAlias}.` : '';

    if (folderId !== null && folderId !== undefined && folderId !== '') {
      if (folderId === 0 || folderId === '0') {
        conditions.push(`${prefix}folder_id IS NULL`);
      } else {
        conditions.push(`${prefix}folder_id = ?`);
        params.push(parseInt(folderId));
      }
    }
    // 如果folderId为null/undefined，不添加任何文件夹筛选条件，返回所有数据

    return { conditions, params };
  }

  // 构建全景图查询条件
  static buildPanoramaConditions(options) {
    let conditions = [];
    let params = [];

    // 可见性筛选
    if (!options.includeHidden) {
      conditions.push('p.is_visible = TRUE');
    }

    // 文件夹筛选
    if (options.folderId !== null && options.folderId !== undefined) {
      const folderConditions = this.buildFolderCondition(options.folderId, 'p');
      conditions = conditions.concat(folderConditions.conditions);
      params = params.concat(folderConditions.params);
    }

    // 文件夹可见性筛选
    if (options.visibleFolderIds && Array.isArray(options.visibleFolderIds)) {
      if (options.visibleFolderIds.length === 0) {
        // 如果没有可见文件夹，只返回根目录下的项目
        conditions.push('p.folder_id IS NULL');
      } else {
        // 包含可见文件夹和根目录
        const placeholders = options.visibleFolderIds.map(() => '?').join(',');
        conditions.push(`(p.folder_id IS NULL OR p.folder_id IN (${placeholders}))`);
        params.push(...options.visibleFolderIds);
      }
    }

    // 关键词搜索（忽略仅包含空白的关键词）
    const keyword =
      options.keyword !== undefined && options.keyword !== null
        ? String(options.keyword).trim()
        : '';
    if (keyword) {
      conditions.push('(p.title LIKE ? OR p.description LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    // 地图边界筛选
    if (options.bounds) {
      const { north, south, east, west } = options.bounds;
      conditions.push('p.latitude BETWEEN ? AND ? AND p.longitude BETWEEN ? AND ?');
      params.push(south, north, west, east);
    }

    // 日期范围筛选
    if (options.dateFrom) {
      conditions.push('p.created_at >= ?');
      params.push(options.dateFrom);
    }

    if (options.dateTo) {
      conditions.push('p.created_at <= ?');
      params.push(options.dateTo);
    }

    return { conditions, params };
  }

  // 构建附近查询（使用Haversine公式）
  static buildNearbyQuery(lat, lng, radius) {
    const distanceFormula = `
      (6371000 * acos(
        cos(radians(?)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(?)) + 
        sin(radians(?)) * sin(radians(latitude))
      ))
    `;

    return {
      selectDistance: `${distanceFormula} AS distance`,
      havingCondition: 'distance <= ?',
      params: [lat, lng, lat],
      havingParam: radius,
    };
  }

  // 构建排序子句
  static buildOrderClause(sortBy, sortOrder, allowedFields, tableAlias = '') {
    const field = allowedFields.includes(sortBy) ? sortBy : allowedFields[0];
    const order = ['ASC', 'DESC'].includes(sortOrder?.toUpperCase())
      ? sortOrder.toUpperCase()
      : 'DESC';
    const prefix = tableAlias ? `${tableAlias}.` : '';

    return `ORDER BY ${prefix}${field} ${order}`;
  }

  // 构建分页子句
  static buildLimitClause(page, pageSize) {
    const offset = (page - 1) * pageSize;
    return `LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}`;
  }

  // 构建批量操作的IN子句
  static buildInClause(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { clause: '', params: [] };
    }

    const placeholders = ids.map(() => '?').join(',');
    return {
      clause: `IN (${placeholders})`,
      params: ids,
    };
  }
}

module.exports = QueryBuilder;

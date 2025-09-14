const xml2js = require('xml2js');
const fs = require('fs').promises;

class KmlParserService {
  constructor() {
    this.parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false, mergeAttrs: true });
  }
  async parseKmlFile(filePath) {
    const xmlContent = await fs.readFile(filePath, 'utf8');
    const result = await this.parser.parseStringPromise(xmlContent);
    return this.extractPlacemarks(result);
  }
  async parseKmlString(xmlContent) {
    const result = await this.parser.parseStringPromise(xmlContent);
    return this.extractPlacemarks(result);
  }
  extractPlacemarks(kmlData) {
    const placemarks = [];
    const document = kmlData.kml?.Document || kmlData.kml;
    if (!document) throw new Error('无效的KML结构');
    const placemarkData = document.Placemark;
    if (!placemarkData) return placemarks;
    const placemarkArray = Array.isArray(placemarkData) ? placemarkData : [placemarkData];
    for (const placemark of placemarkArray) {
      const extracted = this.extractPlacemark(placemark);
      if (extracted) placemarks.push(extracted);
    }
    return placemarks;
  }
  extractPlacemark(placemark) {
    const name = placemark.name || placemark.n || '未命名地标';
    const description = placemark.description || '';
    const styleData = this.extractStyleData(placemark);
    const geometry = this.extractGeometry(placemark);
    if (!geometry) return null;
    return { name, description, ...geometry, styleData };
  }
  extractGeometry(placemark) {
    if (placemark.Point) {
      const coordinates = this.parseCoordinates(placemark.Point.coordinates);
      if (coordinates.length > 0) {
        const [longitude, latitude, altitude = 0] = coordinates[0];
        return {
          pointType: 'Point',
          latitude,
          longitude,
          altitude,
          coordinates: { points: coordinates },
        };
      }
    }
    if (placemark.LineString) {
      const coordinates = this.parseCoordinates(placemark.LineString.coordinates);
      if (coordinates.length > 0) {
        const [longitude, latitude, altitude = 0] = coordinates[0];
        return {
          pointType: 'LineString',
          latitude,
          longitude,
          altitude,
          coordinates: { points: coordinates },
        };
      }
    }
    if (placemark.Polygon) {
      const outerBoundary =
        placemark.Polygon.outerBoundaryIs?.LinearRing?.coordinates ||
        placemark.Polygon.outerBoundaryIs?.coordinates;
      if (outerBoundary) {
        const coordinates = this.parseCoordinates(outerBoundary);
        if (coordinates.length > 0) {
          const center = this.calculatePolygonCenter(coordinates);
          return {
            pointType: 'Polygon',
            latitude: center.latitude,
            longitude: center.longitude,
            altitude: center.altitude,
            coordinates: {
              outer: coordinates,
              inner: this.extractInnerBoundaries(placemark.Polygon),
            },
          };
        }
      }
    }
    return null;
  }
  parseCoordinates(coordinateString) {
    if (!coordinateString) return [];
    const coordStr = coordinateString.trim();
    const points = coordStr.split(/\s+/);
    return points
      .map((p) => {
        const coords = p.split(',').map(Number);
        return coords.length >= 2 ? coords : null;
      })
      .filter(Boolean);
  }
  calculatePolygonCenter(coordinates) {
    if (coordinates.length === 0) return { latitude: 0, longitude: 0, altitude: 0 };
    let totalLat = 0,
      totalLng = 0,
      totalAlt = 0,
      count = 0;
    for (const c of coordinates) {
      if (c.length >= 2) {
        totalLng += c[0];
        totalLat += c[1];
        totalAlt += c[2] || 0;
        count++;
      }
    }
    return {
      longitude: count ? totalLng / count : 0,
      latitude: count ? totalLat / count : 0,
      altitude: count ? totalAlt / count : 0,
    };
  }
  extractInnerBoundaries(polygon) {
    const inner = [];
    const innerBoundaryIs = polygon.innerBoundaryIs;
    if (innerBoundaryIs) {
      const arr = Array.isArray(innerBoundaryIs) ? innerBoundaryIs : [innerBoundaryIs];
      for (const i of arr) {
        const coords = this.parseCoordinates(i.LinearRing?.coordinates);
        if (coords.length > 0) inner.push(coords);
      }
    }
    return inner;
  }
  extractStyleData(placemark) {
    const styleData = {};
    if (placemark.ExtendedData?.Data) {
      const dataArray = Array.isArray(placemark.ExtendedData.Data)
        ? placemark.ExtendedData.Data
        : [placemark.ExtendedData.Data];
      for (const d of dataArray) {
        if (d.name && d.value) styleData[d.name] = d.value;
      }
    }
    if (placemark.styleUrl) styleData.styleUrl = placemark.styleUrl;
    return styleData;
  }
  async validateKmlFile(filePath) {
    try {
      const xmlContent = await fs.readFile(filePath, 'utf8');
      return this.validateKmlString(xmlContent);
    } catch (error) {
      return { valid: false, error: '无法读取文件: ' + error.message };
    }
  }
  async validateKmlString(xmlContent) {
    try {
      const result = await this.parser.parseStringPromise(xmlContent);
      if (!result.kml) return { valid: false, error: '不是有效的KML文件格式' };
      const placemarks = this.extractPlacemarks(result);
      return { valid: true, placemarkCount: placemarks.length, placemarks: placemarks.slice(0, 5) };
    } catch (error) {
      return { valid: false, error: 'KML格式错误: ' + error.message };
    }
  }
}

module.exports = new KmlParserService();

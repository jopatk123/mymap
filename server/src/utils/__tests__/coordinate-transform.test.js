const {
  isInChina,
  wgs84ToGcj02,
  gcj02ToWgs84,
  gcj02ToBd09,
  bd09ToGcj02,
  wgs84ToBd09,
  bd09ToWgs84,
  calculateDistance,
  convertCoordinate,
} = require('../coordinate-transform');

describe('coordinate-transform utilities', () => {
  const beijingWgs84 = [116.404, 39.915];

  test('detects whether a coordinate lies within China', () => {
    expect(isInChina(...beijingWgs84)).toBe(true);
    expect(isInChina(10, 60)).toBe(false);
  });

  test('converts between WGS84 and GCJ02', () => {
    const gcj = wgs84ToGcj02(...beijingWgs84);
    expect(gcj[0]).toBeCloseTo(116.4103, 3);
    expect(gcj[1]).toBeCloseTo(39.9165, 3);

    const wgs = gcj02ToWgs84(...gcj);
    expect(wgs[0]).toBeCloseTo(beijingWgs84[0], 3);
    expect(wgs[1]).toBeCloseTo(beijingWgs84[1], 3);
  });

  test('converts between GCJ02 and BD09', () => {
    const gcj = wgs84ToGcj02(...beijingWgs84);
    const bd = gcj02ToBd09(...gcj);
  expect(bd[0]).toBeCloseTo(116.4166, 3);
  expect(bd[1]).toBeCloseTo(39.9227, 3);

    const gcjRecovered = bd09ToGcj02(...bd);
    expect(gcjRecovered[0]).toBeCloseTo(gcj[0], 3);
    expect(gcjRecovered[1]).toBeCloseTo(gcj[1], 3);
  });

  test('supports chained conversions via helper', () => {
    const bd = convertCoordinate(...beijingWgs84, 'wgs84', 'bd09');
    const wgs = convertCoordinate(...bd, 'bd09', 'wgs84');
    expect(wgs[0]).toBeCloseTo(beijingWgs84[0], 3);
    expect(wgs[1]).toBeCloseTo(beijingWgs84[1], 3);
  });

  test('throws on unsupported coordinate pair', () => {
    expect(() => convertCoordinate(0, 0, 'foo', 'bar')).toThrow('不支持的坐标转换');
  });

  test('calculates haversine distance in meters', () => {
    const forbiddenCity = [39.9163, 116.3971];
    const tiananmen = [39.9087, 116.3975];
    const distance = calculateDistance(forbiddenCity[0], forbiddenCity[1], tiananmen[0], tiananmen[1]);

    expect(distance).toBeGreaterThan(700);
    expect(distance).toBeLessThan(900);
  });
});

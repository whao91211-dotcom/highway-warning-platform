import coordtransform from 'coordtransform';

export function useCoordTransform() {
  /**
   * WGS-84 → GCJ-02
   * coordtransform 原生: (lng, lat) → [lng, lat]
   * 封装为 Leaflet [lat, lng] 约定
   */
  function wgs84ToGcj02(lat, lng) {
    const [gcjLng, gcjLat] = coordtransform.wgs84togcj02(lng, lat);
    return { lat: gcjLat, lng: gcjLng };
  }

  /** Haversine 球面距离（米） */
  function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6_371_000;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  return { wgs84ToGcj02, haversineDistance };
}

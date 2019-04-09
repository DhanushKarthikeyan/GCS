/**
 * This class contains various commonly used helper functions
 */

// mean radius of earth in meters
const R = 6371008.8;

/**
 * Calculate the distance (in meters) between the two points given as
 * point objects containing latitude and longitude in degrees.
 *
 * @param {Object} x point 1, must contain a lat and a lng property
 * @param {Object} y point 2, must contain a lat and a lng property
 * @returns {float} distance in meters
 */
export function distance(x, y) {
  const xLat = x.lat * (Math.PI / 180);
  const xLng = x.lng * (Math.PI / 180);

  const yLat = y.lat * (Math.PI / 180);
  const yLng = y.lng * (Math.PI / 180);

  return Math.acos(
    (Math.sin(xLat) * Math.sin(yLat)) +
    (Math.cos(xLat) * Math.cos(yLat) * Math.cos(Math.abs(yLng - xLng)))
  ) * R;
}

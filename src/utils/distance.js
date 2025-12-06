// src/utils/distance.js - Distance Calculation Utilities

import { EARTH_RADIUS_KM } from '../constants/config';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - First coordinate {latitude, longitude}
 * @param {Object} coord2 - Second coordinate {latitude, longitude}
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (coord1, coord2) => {
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.latitude * Math.PI / 180) * 
    Math.cos(coord2.latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return EARTH_RADIUS_KM * c;
};

/**
 * Calculate estimated walking time in minutes
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} speedKmPerMin - Walking speed in km per minute (default: 0.083)
 * @returns {number} Estimated time in minutes
 */
export const calculateWalkingTime = (distanceKm, speedKmPerMin = 0.083) => {
  return Math.ceil(distanceKm / speedKmPerMin);
};


// src/constants/categories.js - Building Category Constants
// Matches database schema and admin panel categories

export const BUILDING_CATEGORIES = [
  { label: 'Academic', value: 'academic' },
  { label: 'Administrative', value: 'administrative' },
  { label: 'Facility', value: 'facility' },
  { label: 'Sports', value: 'sports' },
  { label: 'Residential', value: 'residential' },
  { label: 'Other', value: 'other' },
];

export const BUILDING_CATEGORIES_WITH_ALL = [
  { label: 'All Categories', value: '' },
  ...BUILDING_CATEGORIES,
];

/**
 * Get category label by value
 * @param {string} value - Category value
 * @returns {string} Category label
 */
export const getCategoryLabel = (value) => {
  const category = BUILDING_CATEGORIES.find(cat => cat.value === value);
  return category ? category.label : 'Unknown';
};

/**
 * Check if category is valid
 * @param {string} value - Category value
 * @returns {boolean} True if valid
 */
export const isValidCategory = (value) => {
  if (value === '') return true; // Empty string is valid (show all)
  return BUILDING_CATEGORIES.some(cat => cat.value === value);
};


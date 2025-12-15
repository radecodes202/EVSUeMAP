// src/services/mapService.js - Map data service using Supabase
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockBuildings } from '../utils/mockData';

export const mapService = {
  /**
   * Get all buildings
   * @returns {Promise<Array>} Array of buildings
   */
  async getBuildings() {
    // Use mock data if Supabase not configured
    if (!isSupabaseConfigured()) {
      console.log('📦 Using mock data - Supabase not configured');
      return mockBuildings.map(b => ({
        id: b.building_id.toString(),
        building_id: b.building_id, // For compatibility with MapScreen key
        name: b.building_name,
        building_name: b.building_name, // For compatibility
        code: b.building_code,
        building_code: b.building_code, // For compatibility
        latitude: parseFloat(b.latitude),
        longitude: parseFloat(b.longitude),
        category: 'academic',
        description: b.description,
        image_url: null,
        floors: b.floors || 1,
      }));
    }

    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .order('name');

      if (error) {
        // Handle schema cache errors gracefully
        if (error.code === 'PGRST205' || 
            (error.message && error.message.includes('schema cache'))) {
          console.warn('Buildings table not found in database. Please run database-setup.sql');
          // Fallback to mock data
          return mockBuildings.map(b => ({
            id: b.building_id.toString(),
            building_id: b.building_id,
            name: b.building_name,
            building_name: b.building_name,
            code: b.building_code,
            building_code: b.building_code,
            latitude: parseFloat(b.latitude),
            longitude: parseFloat(b.longitude),
            category: 'academic',
            description: b.description,
            image_url: null,
            floors: b.floors || 1,
          }));
        }
        console.error('Error fetching buildings:', error);
        throw error;
      }

      // Transform data to match app format
      return data.map(building => ({
        id: building.id,
        building_id: building.id, // For compatibility with MapScreen key
        name: building.name,
        building_name: building.name, // For compatibility
        code: building.code,
        building_code: building.code, // For compatibility
        latitude: parseFloat(building.latitude),
        longitude: parseFloat(building.longitude),
        category: building.category || 'academic',
        description: building.description,
        image_url: building.image_url,
        floors: 1, // Default, can be added to schema later
      }));
    } catch (error) {
      console.error('Error in getBuildings:', error);
      // Fallback to mock data on error
      return mockBuildings.map(b => ({
        id: b.building_id.toString(),
        building_id: b.building_id, // For compatibility
        name: b.building_name,
        building_name: b.building_name, // For compatibility
        code: b.building_code,
        building_code: b.building_code, // For compatibility
        latitude: parseFloat(b.latitude),
        longitude: parseFloat(b.longitude),
        category: 'academic',
        description: b.description,
        floors: b.floors || 1,
      }));
    }
  },

  /**
   * Search buildings by query
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of matching buildings
   */
  async search(query) {
    if (!isSupabaseConfigured()) {
      // Fallback to mock data search
      const lowerQuery = query.toLowerCase();
      return mockBuildings
        .filter(b => 
          b.building_name.toLowerCase().includes(lowerQuery) ||
          b.building_code.toLowerCase().includes(lowerQuery) ||
          (b.description && b.description.toLowerCase().includes(lowerQuery))
        )
        .map(b => ({
          id: b.building_id.toString(),
          building_id: b.building_id, // For compatibility
          name: b.building_name,
          building_name: b.building_name, // For compatibility
          code: b.building_code,
          building_code: b.building_code, // For compatibility
          latitude: parseFloat(b.latitude),
          longitude: parseFloat(b.longitude),
          category: 'academic',
          description: b.description,
          floors: b.floors || 1,
        }));
    }

    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*, locations(*)')
        .or(`name.ilike.%${query}%,code.ilike.%${query}%,description.ilike.%${query}%`);

      if (error) {
        // Handle schema cache errors gracefully
        if (error.code === 'PGRST205' || 
            (error.message && error.message.includes('schema cache'))) {
          console.warn('Buildings table not found in database. Please run database-setup.sql');
          // Fallback to mock data search
          const lowerQuery = query.toLowerCase();
          return mockBuildings
            .filter(b => 
              b.building_name.toLowerCase().includes(lowerQuery) ||
              b.building_code.toLowerCase().includes(lowerQuery) ||
              (b.description && b.description.toLowerCase().includes(lowerQuery))
            )
            .map(b => ({
              id: b.building_id.toString(),
              building_id: b.building_id,
              name: b.building_name,
              building_name: b.building_name,
              code: b.building_code,
              building_code: b.building_code,
              latitude: parseFloat(b.latitude),
              longitude: parseFloat(b.longitude),
              category: 'academic',
              description: b.description,
              floors: b.floors || 1,
            }));
        }
        throw error;
      }

      return data.map(building => ({
        id: building.id,
        building_id: building.id, // For compatibility
        name: building.name,
        building_name: building.name, // For compatibility
        code: building.code,
        building_code: building.code, // For compatibility
        latitude: parseFloat(building.latitude),
        longitude: parseFloat(building.longitude),
        category: building.category,
        description: building.description,
        image_url: building.image_url,
        locations: building.locations || [],
        floors: 1,
      }));
    } catch (error) {
      console.error('Error in search:', error);
      return [];
    }
  },

  /**
   * Get nearby buildings
   * @param {number} latitude - User latitude
   * @param {number} longitude - User longitude
   * @param {number} radiusMeters - Search radius in meters (default: 1000)
   * @returns {Promise<Array>} Array of nearby buildings
   */
  async getNearby(latitude, longitude, radiusMeters = 1000) {
    if (!isSupabaseConfigured()) {
      // Fallback: return all mock buildings
      return mockBuildings.map(b => ({
        id: b.building_id.toString(),
        building_id: b.building_id, // For compatibility
        name: b.building_name,
        building_name: b.building_name, // For compatibility
        code: b.building_code,
        building_code: b.building_code, // For compatibility
        latitude: parseFloat(b.latitude),
        longitude: parseFloat(b.longitude),
        category: 'academic',
        description: b.description,
        distance_meters: 0,
        floors: b.floors || 1,
      }));
    }

    try {
      const { data, error } = await supabase
        .rpc('nearby_buildings', {
          lat: latitude,
          lng: longitude,
          radius_meters: radiusMeters,
        });

      if (error) throw error;

      return data.map(building => ({
        id: building.id,
        building_id: building.id, // For compatibility
        name: building.name,
        building_name: building.name, // For compatibility
        code: building.code,
        building_code: building.code, // For compatibility
        latitude: parseFloat(building.latitude),
        longitude: parseFloat(building.longitude),
        category: building.category,
        distance_meters: parseFloat(building.distance_meters),
        floors: 1,
      }));
    } catch (error) {
      console.error('Error in getNearby:', error);
      return [];
    }
  },

  /**
   * Get building details with locations
   * @param {string} buildingId - Building ID
   * @returns {Promise<Object>} Building details
   */
  async getBuildingDetails(buildingId) {
    if (!isSupabaseConfigured()) {
      // Fallback to mock data
      const building = mockBuildings.find(b => b.building_id.toString() === buildingId);
      if (!building) return null;

      return {
        id: building.building_id.toString(),
        name: building.building_name,
        code: building.building_code,
        latitude: parseFloat(building.latitude),
        longitude: parseFloat(building.longitude),
        category: 'academic',
        description: building.description,
        locations: [],
      };
    }

    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*, locations(*)')
        .eq('id', buildingId)
        .single();

      if (error) {
        // Handle schema cache errors gracefully
        if (error.code === 'PGRST205' || 
            (error.message && error.message.includes('schema cache'))) {
          console.warn('Buildings table not found in database. Please run database-setup.sql');
          // Try to find in mock data
          const building = mockBuildings.find(b => b.building_id.toString() === buildingId);
          if (building) {
            return {
              id: building.building_id.toString(),
              name: building.building_name,
              code: building.building_code,
              latitude: parseFloat(building.latitude),
              longitude: parseFloat(building.longitude),
              category: 'academic',
              description: building.description,
              locations: [],
            };
          }
          return null;
        }
        throw error;
      }

      return {
        ...data,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        locations: data.locations || [],
      };
    } catch (error) {
      // Handle any other errors gracefully
      if (error.code === 'PGRST205' || 
          (error.message && error.message.includes('schema cache'))) {
        console.warn('Buildings table not found in database. Please run database-setup.sql');
        const building = mockBuildings.find(b => b.building_id.toString() === buildingId);
        if (building) {
          return {
            id: building.building_id.toString(),
            name: building.building_name,
            code: building.building_code,
            latitude: parseFloat(building.latitude),
            longitude: parseFloat(building.longitude),
            category: 'academic',
            description: building.description,
            locations: [],
          };
        }
        return null;
      }
      console.error('Error in getBuildingDetails:', error);
      return null;
    }
  },

  /**
   * Get points of interest
   * @param {string|null} category - Optional category filter
   * @returns {Promise<Array>} Array of POIs
   */
  async getPOIs(category = null) {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      let query = supabase
        .from('points_of_interest')
        .select('*');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        // Handle schema cache errors gracefully
        if (error.code === 'PGRST205' || 
            (error.message && error.message.includes('schema cache'))) {
          console.warn('Points of interest table not found in database. Please run database-setup.sql');
          return [];
        }
        throw error;
      }

      return data.map(poi => ({
        ...poi,
        latitude: parseFloat(poi.latitude),
        longitude: parseFloat(poi.longitude),
      }));
    } catch (error) {
      // Handle any other errors gracefully
      if (error.code === 'PGRST205' || 
          (error.message && error.message.includes('schema cache'))) {
        console.warn('Points of interest table not found in database. Please run database-setup.sql');
        return [];
      }
      console.error('Error in getPOIs:', error);
      return [];
    }
  },

  /**
   * Subscribe to real-time building changes
   * @param {Function} callback - Callback function for changes
   * @returns {Function} Unsubscribe function
   */
  subscribeToBuildings(callback) {
    if (!isSupabaseConfigured()) {
      console.log('Real-time subscriptions not available - Supabase not configured');
      return () => {}; // Return no-op unsubscribe
    }

    const channel = supabase
      .channel('buildings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buildings',
        },
        (payload) => {
          console.log('Building change detected:', payload);
          callback(payload);
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Get active paths with waypoints (ordered)
   */
  async getPaths() {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('paths')
        .select(`
          path_id,
          path_name,
          path_type,
          is_active,
          waypoints (
            waypoint_id,
            sequence,
            latitude,
            longitude,
            is_accessible,
            notes
          )
        `)
        .eq('is_active', true);

      if (error) {
        // Handle schema cache errors gracefully
        if (error.code === 'PGRST205' || 
            (error.message && error.message.includes('schema cache'))) {
          console.warn('Paths table not found in database. Please run database-setup.sql');
          return [];
        }
        throw error;
      }

      return (data || []).map((path) => ({
        id: path.path_id,
        name: path.path_name,
        type: path.path_type,
        is_active: path.is_active,
        waypoints: (path.waypoints || [])
          .sort((a, b) => a.sequence - b.sequence)
          .map((wp) => ({
            id: wp.waypoint_id,
            sequence: wp.sequence,
            latitude: parseFloat(wp.latitude),
            longitude: parseFloat(wp.longitude),
            is_accessible: wp.is_accessible,
            notes: wp.notes,
          })),
      }));
    } catch (error) {
      // Handle any other errors gracefully
      if (error.code === 'PGRST205' || 
          (error.message && error.message.includes('schema cache'))) {
        console.warn('Paths table not found in database. Please run database-setup.sql');
        return [];
      }
      console.error('Error fetching paths:', error);
      return [];
    }
  },
};


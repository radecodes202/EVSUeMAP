// src/screens/AdminScreen.js - Admin Dashboard for managing buildings
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL, API_TIMEOUT, USE_MOCK_DATA } from '../constants/config';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { mockBuildings } from '../utils/mockData';
import { getErrorMessage } from '../utils/errorHandler';

const AdminScreen = ({ navigation }) => {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    building_name: '',
    building_code: '',
    latitude: '',
    longitude: '',
    floors: '',
    description: '',
  });

  useEffect(() => {
    loadBuildings();
  }, []);

  const loadBuildings = async () => {
    try {
      setLoading(true);
      let data = [];

      if (USE_MOCK_DATA) {
        data = mockBuildings;
      } else {
        const response = await axios.get(`${API_URL}/buildings`, {
          timeout: API_TIMEOUT,
        });
        if (response.data.success) {
          data = response.data.data;
        }
      }

      setBuildings(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading buildings:', error);
      if (USE_MOCK_DATA || __DEV__) {
        setBuildings(mockBuildings);
      }
      setLoading(false);
    }
  };

  const openEditModal = (building) => {
    setEditingBuilding(building);
    setFormData({
      building_name: building.building_name || '',
      building_code: building.building_code || '',
      latitude: building.latitude?.toString() || '',
      longitude: building.longitude?.toString() || '',
      floors: building.floors?.toString() || '',
      description: building.description || '',
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingBuilding(null);
    setFormData({
      building_name: '',
      building_code: '',
      latitude: '',
      longitude: '',
      floors: '',
      description: '',
    });
  };

  const handleSave = async () => {
    if (!formData.building_name || !formData.building_code || !formData.latitude || !formData.longitude) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const buildingData = {
        building_name: formData.building_name,
        building_code: formData.building_code,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        floors: formData.floors ? parseInt(formData.floors) : null,
        description: formData.description,
      };

      if (USE_MOCK_DATA) {
        // Update local mock data
        if (editingBuilding) {
          const updated = buildings.map(b =>
            b.building_id === editingBuilding.building_id
              ? { ...b, ...buildingData, latitude: buildingData.latitude.toString(), longitude: buildingData.longitude.toString() }
              : b
          );
          setBuildings(updated);
          Alert.alert('Success', 'Building updated (mock data)');
        }
        closeModal();
        return;
      }

      if (editingBuilding) {
        // Update existing building
        const response = await axios.put(
          `${API_URL}/buildings/${editingBuilding.building_id}`,
          buildingData
        );
        if (response.data.success) {
          Alert.alert('Success', 'Building updated successfully');
          loadBuildings();
          closeModal();
        }
      } else {
        // Create new building
        const response = await axios.post(`${API_URL}/buildings`, buildingData);
        if (response.data.success) {
          Alert.alert('Success', 'Building created successfully');
          loadBuildings();
          closeModal();
        }
      }
    } catch (error) {
      console.error('Error saving building:', error);
      Alert.alert('Error', getErrorMessage(error));
    }
  };

  const handleDelete = (building) => {
    Alert.alert(
      'Delete Building',
      `Are you sure you want to delete ${building.building_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (USE_MOCK_DATA) {
                const updated = buildings.filter(b => b.building_id !== building.building_id);
                setBuildings(updated);
                Alert.alert('Success', 'Building deleted (mock data)');
                return;
              }

              const response = await axios.delete(`${API_URL}/buildings/${building.building_id}`);
              if (response.data.success) {
                Alert.alert('Success', 'Building deleted successfully');
                loadBuildings();
              }
            } catch (error) {
              Alert.alert('Error', getErrorMessage(error));
            }
          },
        },
      ]
    );
  };

  const renderBuildingItem = ({ item }) => (
    <View style={styles.buildingCard}>
      <View style={styles.buildingInfo}>
        <Text style={styles.buildingName}>{item.building_name}</Text>
        <Text style={styles.buildingCode}>{item.building_code}</Text>
        <Text style={styles.buildingCoords}>
          {item.latitude}, {item.longitude}
        </Text>
      </View>
      <View style={styles.buildingActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading buildings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openEditModal(null)}
        >
          <Ionicons name="add" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={buildings}
        keyExtractor={(item) => item.building_id.toString()}
        renderItem={renderBuildingItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No buildings found</Text>
          </View>
        }
      />

      {/* Edit/Add Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBuilding ? 'Edit Building' : 'Add Building'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Building Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.building_name}
                onChangeText={(text) => setFormData({ ...formData, building_name: text })}
                placeholder="Enter building name"
              />

              <Text style={styles.label}>Building Code *</Text>
              <TextInput
                style={styles.input}
                value={formData.building_code}
                onChangeText={(text) => setFormData({ ...formData, building_code: text })}
                placeholder="Enter building code"
              />

              <Text style={styles.label}>Latitude *</Text>
              <TextInput
                style={styles.input}
                value={formData.latitude}
                onChangeText={(text) => setFormData({ ...formData, latitude: text })}
                placeholder="e.g., 11.2443"
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Longitude *</Text>
              <TextInput
                style={styles.input}
                value={formData.longitude}
                onChangeText={(text) => setFormData({ ...formData, longitude: text })}
                placeholder="e.g., 125.0023"
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Floors</Text>
              <TextInput
                style={styles.input}
                value={formData.floors}
                onChangeText={(text) => setFormData({ ...formData, floors: text })}
                placeholder="Number of floors"
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Building description"
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  listContent: {
    padding: Spacing.lg,
  },
  buildingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  buildingInfo: {
    flex: 1,
  },
  buildingName: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  buildingCode: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  buildingCoords: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  buildingActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  actionButton: {
    padding: Spacing.sm,
  },
  emptyContainer: {
    padding: Spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.text,
  },
  form: {
    gap: Spacing.md,
  },
  label: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    ...Typography.body,
    color: Colors.white,
    fontWeight: '600',
  },
});

export default AdminScreen;


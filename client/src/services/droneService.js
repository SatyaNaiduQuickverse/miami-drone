import api from './api';

export const droneService = {
  // Get all drones
  getAllDrones: async () => {
    const response = await api.get('/drones');
    return response.data;
  },

  // Get single drone
  getDrone: async (id) => {
    const response = await api.get(`/drones/${id}`);
    return response.data;
  },

  // Execute command on drone
  executeCommand: async (droneId, command, params = {}) => {
    const response = await api.post(`/drones/${droneId}/command`, {
      command,
      params
    });
    return response.data;
  },

  // Get drone logs
  getDroneLogs: async (droneId) => {
    const response = await api.get(`/drones/${droneId}/logs`);
    return response.data;
  },

  // Update telemetry
  updateTelemetry: async (droneId, telemetryData) => {
    const response = await api.put(`/drones/${droneId}/telemetry`, telemetryData);
    return response.data;
  }
};

/**
 * Central API Endpoint Definitions
 */

export const API_ENDPOINTS = {
  // Health
  HEALTH: '/health',

  // AI Service
  AI_QUERY: '/api/v1/ai/query',
  AI_EMERGENCY_GUIDANCE: '/api/v1/ai/emergency',

  // Emergency Service
  EMERGENCY_ALERT: '/api/v1/emergency/alert',
  EMERGENCY_PRESIGNED_URL: '/api/v1/emergency/presigned-url',
  EMERGENCY_HISTORY: '/api/v1/emergency/history',
  EMERGENCY_INCIDENTS_SYNC: '/api/v1/emergency/incidents/sync',
  EMERGENCY_INCIDENTS_HISTORY: '/api/v1/emergency/incidents/history',

  // User Service
  USER_PROFILE: '/api/v1/user/profile',
  USER_HISTORY: '/api/v1/user/history',
  USER_CONTACTS: '/api/v1/user/contacts',

  // GPS Service
  GPS_NEARBY: '/api/v1/gps/nearby',

  // Notification Service
  NOTIFICATION_SEND: '/api/v1/notification/send',

  // Auth Service
  AUTH_VERIFY_TOKEN: '/api/v1/auth/verify-token',
} as const;

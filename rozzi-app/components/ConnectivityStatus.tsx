import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getWorkingBackendURL, testConnectivity } from '@/utils/connectivity';

interface ConnectivityStatusProps {
  showDetails?: boolean;
  onStatusChange?: (isConnected: boolean) => void;
}

export default function ConnectivityStatus({ 
  showDetails = false, 
  onStatusChange 
}: ConnectivityStatusProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [currentURL, setCurrentURL] = useState('');

  useEffect(() => {
    checkConnectivity();
    const interval = setInterval(checkConnectivity, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkConnectivity = async () => {
    try {
      const connected = await testConnectivity();
      setIsConnected(connected);
      setCurrentURL(await getWorkingBackendURL());
    } catch (error) {
      console.log('Connectivity check failed:', error);
      setIsConnected(false);
    }
  };

  const handleRefresh = async () => {
    Alert.alert(
      'Refresh Connectivity',
      'This will test the current backend connection.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refresh',
          onPress: async () => {
            await checkConnectivity();
            Alert.alert(
              'Connectivity Status',
              `Backend: ${isConnected ? 'Connected' : 'Disconnected'}\nURL: ${currentURL}`,
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  };

  const getStatusColor = () => {
    return isConnected ? '#4CAF50' : '#F44336'; // Green for connected, Red for disconnected
  };

  const getStatusIcon = () => {
    return isConnected ? 'checkmark-circle' : 'close-circle';
  };

  const getStatusText = () => {
    return isConnected ? 'Connected' : 'Disconnected';
  };

  if (!showDetails) {
    return (
      <View style={styles.container}>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>
    );
  }

  return (
    <View style={styles.detailedContainer}>
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={handleRefresh}
        >
          <Ionicons 
            name="refresh" 
            size={20} 
            color="#007AFF" 
          />
        </TouchableOpacity>
      </View>

      {showDetails && (
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Backend URL:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {currentURL || 'Not detected'}
            </Text>
          </View>
          
          {/* lastTestTime is not defined in this component, so this block will be removed */}
          {/*
          {lastTestTime && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last Test:</Text>
              <Text style={styles.detailValue}>
                {lastTestTime.toLocaleTimeString()}
              </Text>
            </View>
          )}
          */}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <Text style={[styles.detailValue, { color: getStatusColor() }]}>
              {isConnected ? 'Healthy' : 'Unreachable'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  detailedContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    margin: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  details: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
});

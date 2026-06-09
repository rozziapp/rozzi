import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { blockUser } from '@/utils/blockUser';

interface BlockUserButtonProps {
  userId: string;
  username: string;
  isBlocked: boolean;
  onBlockSuccess?: (isBlocked: boolean) => void;
  style?: any;
}

export default function BlockUserButton({ 
  userId, 
  username, 
  isBlocked,
  onBlockSuccess,
  style 
}: BlockUserButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleBlockUser = async () => {
    if (loading) return;

    const action = isBlocked ? 'unblock' : 'block';
    const confirmMessage = isBlocked 
      ? `Are you sure you want to unblock ${username}? They will be able to see your profile and send you messages again.`
      : `Are you sure you want to block ${username}? This will:\n\n• Hide their profile from you\n• Prevent them from sending you messages\n• Remove them from your search results\n• Hide your profile from them`;
    
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: isBlocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const success = await blockUser({ userId, username });
              
              if (success) {
                const newBlockStatus = !isBlocked;
                if (onBlockSuccess) {
                  onBlockSuccess(newBlockStatus);
                }
                
                if (newBlockStatus) {
                  Alert.alert(
                    'User Blocked', 
                    `${username} has been blocked successfully. They can no longer see your profile or send you messages.`,
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert(
                    'User Unblocked', 
                    `${username} has been unblocked successfully. They can now see your profile and send you messages again.`,
                    [{ text: 'OK' }]
                  );
                }
              } else {
                Alert.alert(
                  'Error', 
                  `Failed to ${action} user. Please try again.`
                );
              }
            } catch (error) {
              console.error('Error in handleBlockUser:', error);
              Alert.alert(
                'Error', 
                `Failed to ${action} user. Please try again.`
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.blockButton, 
        isBlocked && styles.unblockButton,
        style
      ]}
      onPress={handleBlockUser}
      activeOpacity={0.7}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isBlocked ? "#10b981" : "#ef4444"} />
      ) : (
        <Ionicons 
          name={isBlocked ? "checkmark-circle-outline" : "ban-outline"} 
          size={16} 
          color={isBlocked ? "#10b981" : "#ef4444"} 
        />
      )}
      <Text style={[
        styles.blockText,
        isBlocked && styles.unblockText
      ]}>
        {isBlocked ? 'Unblock User' : 'Block User'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  unblockButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  blockText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  unblockText: {
    color: '#10b981',
  },
});

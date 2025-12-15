import { useState, useEffect } from 'react';
import { getUserById, updateUserProfile } from '@/utils/database';

interface User {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  bio?: string;
  skills?: string[];
}

export const useUserProfile = (userId: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const userData = await getUserById(userId);
      setUser(userData);
    } catch (err) {
      setError('Failed to load user profile');
      console.error('Error loading user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      if (!user) return;
      
      await updateUserProfile(userId, updates);
      setUser(prev => prev ? { ...prev, ...updates } : null);
      
      return true;
    } catch (err) {
      setError('Failed to update profile');
      console.error('Error updating profile:', err);
      return false;
    }
  };

  const updateProfileImage = async (imageUrl: string) => {
    return await updateProfile({ profileImage: imageUrl });
  };

  const updateBio = async (bio: string) => {
    return await updateProfile({ bio });
  };

  const updateSkills = async (skills: string[]) => {
    return await updateProfile({ skills });
  };

  return {
    user,
    loading,
    error,
    updateProfile,
    updateProfileImage,
    updateBio,
    updateSkills,
    refresh: loadUserProfile,
  };
}; 
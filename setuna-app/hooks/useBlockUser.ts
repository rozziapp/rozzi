import { useCallback } from 'react';
import { blockUser as blockUserUtil, isUserBlocked, getBlockedUsers, unblockUser, canSendMessage } from '@/utils/blockUser';

export const useBlockUser = () => {
  const blockUser = useCallback(async ({ userId, username }: { userId: string; username: string }) => {
    return await blockUserUtil({ userId, username });
  }, []);

  const checkIfUserBlocked = useCallback(async (userId: string) => {
    return await isUserBlocked(userId);
  }, []);

  const getBlockedUsersList = useCallback(async () => {
    return await getBlockedUsers();
  }, []);

  const unblockUserById = useCallback(async (userId: string) => {
    return await unblockUser(userId);
  }, []);

  const checkCanSendMessage = useCallback(async (userId: string) => {
    return await canSendMessage(userId);
  }, []);

  return {
    blockUser,
    checkIfUserBlocked,
    getBlockedUsersList,
    unblockUser: unblockUserById,
    checkCanSendMessage,
  };
};

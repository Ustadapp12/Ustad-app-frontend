import { useMemo } from 'react';
import { usersApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { selectUpdateDisplayName, selectUpdateProfileFields } from '../../store/selectors/auth';

type ProfilePatch = Parameters<typeof usersApi.updateProfile>[0];

/**
 * Saving profile fields: each one writes to the server, then updates the
 * local store so every screen shows the new value at once. That pair was
 * copy-pasted across the onboarding screens, Edit Profile and Profile
 * (2026-10-22). Each action throws whatever the API throws (e.g.
 * INVALID_AGE), so screens keep their own error messages.
 */
export function useProfileActions() {
  const updateProfileFields = useAuthStore(selectUpdateProfileFields);
  const updateDisplayName = useAuthStore(selectUpdateDisplayName);
  return useMemo(() => ({
    /** updateDisplayName, not updateProfileFields: it also refreshes the
     * cached user's `name`. */
    saveName: async (name: string) => {
      await usersApi.updateName(name);
      updateDisplayName(name);
    },
    saveAge: async (age: number) => {
      await usersApi.updateAge(age);
      updateProfileFields({ age });
    },
    saveGender: async (gender: 'male' | 'female') => {
      await usersApi.updateGender(gender);
      updateProfileFields({ gender });
    },
    saveAvatarVariant: async (avatar_variant: number) => {
      await usersApi.updateAvatarVariant(avatar_variant);
      updateProfileFields({ avatar_variant });
    },
    saveProfile: async (patch: ProfilePatch) => {
      await usersApi.updateProfile(patch);
      updateProfileFields(patch);
    },
  }), [updateProfileFields, updateDisplayName]);
}

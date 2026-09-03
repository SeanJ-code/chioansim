import { defineStore } from 'pinia';
import { api } from '@/boot/axios';

export interface Caregiver {
  _id: string;
  userId?: { name?: string | undefined } | string | undefined;
  profilePhotoUrl?: string | undefined;
  introduction?: string | undefined;
  yearsExperience?: number | undefined;
  serviceAreas: string[];
  transportation?: string | undefined;
  ratingAverage?: number | undefined;
  ratingCount?: number | undefined;
  isFavorite?: boolean;
  serviceTypeIds?: Array<{ name: string }> | undefined;
  myPreviousJobs?: Array<{ _id: string; scheduledStartAt: string; serviceTypeIds?: Array<{ name: string }> }>;
  reviews?: Array<{ _id: string; rating: number; comment?: string }>;
}

export const useCaregiverStore = defineStore('caregivers', {
  state: () => ({
    caregivers: [] as Caregiver[],
    loading: false,
    errorMessage: '',
    initialLoaded: false,
  }),
  actions: {
    async fetchCaregivers(baseURL?: string, force = false) {
      if (this.initialLoaded && !force) return;
      this.loading = true;
      this.errorMessage = '';
      try {
        const { data } = await api.get<Caregiver[]>('/nurses', baseURL ? { baseURL } : undefined);
        this.caregivers = data.map((caregiver) => ({
        _id: caregiver._id,
        userId: typeof caregiver.userId === 'object' ? { name: caregiver.userId.name } : undefined,
        profilePhotoUrl: caregiver.profilePhotoUrl,
        introduction: caregiver.introduction,
        yearsExperience: caregiver.yearsExperience,
        serviceAreas: caregiver.serviceAreas || [],
        transportation: caregiver.transportation,
        ratingAverage: caregiver.ratingAverage,
        ratingCount: caregiver.ratingCount,
        serviceTypeIds: caregiver.serviceTypeIds?.map(({ name }) => ({ name })),
        }));
      } catch {
        this.errorMessage = '請確認後端服務與資料庫已啟動，再重新整理一次。';
      } finally {
        this.loading = false;
        this.initialLoaded = true;
      }
    },
  },
});

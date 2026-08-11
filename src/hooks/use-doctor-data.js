import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  archiveDoctorPost,
  getDoctorPost,
  getDoctorProfile,
  listDoctorPosts,
  saveDoctorPost,
  updateDoctorProfile,
} from '../services/doctor-service';

export const doctorKeys = {
  profile: ['doctor-profile'],
  posts: ['doctor-posts'],
  post: (postId) => ['doctor-post', postId],
};

export function useDoctorProfile() {
  return useQuery({
    queryKey: doctorKeys.profile,
    queryFn: getDoctorProfile,
    staleTime: 60_000,
  });
}

export function useDoctorPosts() {
  return useQuery({
    queryKey: doctorKeys.posts,
    queryFn: listDoctorPosts,
    staleTime: 15_000,
  });
}

export function useDoctorPost(postId) {
  return useQuery({
    queryKey: doctorKeys.post(postId),
    queryFn: () => getDoctorPost(postId),
    enabled: Boolean(postId),
  });
}

export function useSaveDoctorPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveDoctorPost,
    onSuccess: (post) => {
      queryClient.setQueryData(doctorKeys.post(post.id), post);
      return queryClient.invalidateQueries({ queryKey: doctorKeys.posts });
    },
  });
}

export function useArchiveDoctorPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveDoctorPost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: doctorKeys.posts }),
  });
}

export function useUpdateDoctorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDoctorProfile,
    onSuccess: (profile) => queryClient.setQueryData(doctorKeys.profile, profile),
  });
}

import { useMutation, useQuery } from '@tanstack/react-query';
import ImageUploadService from '../services/ImageUploadService';

/**
 * Hook to upload a single image.
 */
export function useUploadImage() {
  const mutation = useMutation<
    string,
    unknown,
    { folderPath: string; fileUri: string; customName?: string }
  >({
    mutationFn: ({ folderPath, fileUri, customName }) =>
      ImageUploadService.uploadImage(folderPath, fileUri, customName),
  });

  return mutation;
}

/**
 * Hook to upload multiple images.
 */
export function useUploadMultipleImages() {
  const mutation = useMutation<
    string[],
    unknown,
    { folderPath: string; fileUris: string[] }
  >({
    mutationFn: ({ folderPath, fileUris }) =>
      ImageUploadService.uploadMultipleImages(folderPath, fileUris),
  });

  return mutation;
}

/**
 * Hook to delete an image.
 */
export function useDeleteImage() {
  const mutation = useMutation<
    void,
    unknown,
    { imagePathOrUrl: string }
  >({
    mutationFn: ({ imagePathOrUrl }) =>
      ImageUploadService.deleteImage(imagePathOrUrl),
  });

  return mutation;
}

/**
 * Hook to delete all images in a folder.
 */
export function useDeleteFolder() {
  const mutation = useMutation<
    void,
    unknown,
    { folderPath: string }
  >({
    mutationFn: ({ folderPath }) =>
      ImageUploadService.deleteFolder(folderPath),
  });

  return mutation;
}

/**
 * Hook to list images in a folder.
 */
export function useListImages(folderPath: string) {
  const query = useQuery<string[]>({
    queryKey: ['images', folderPath],
    queryFn: () => ImageUploadService.listImages(folderPath),
    enabled: !!folderPath,
  });

  return query;
}
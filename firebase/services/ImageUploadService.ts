import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
import { storage } from '../config';

/**
 * ImageUploadService
 * Handles all Firebase Storage image operations: upload, delete, list, etc.
 */
export default class ImageUploadService {
  /**
   * Upload a single image to Firebase Storage.
   * @param folderPath - e.g. "restaurants/123/menu_items"
   * @param fileUri - Local file URI (from ImagePicker, Camera, etc.)
   * @param customName - Optional custom file name
   * @returns The public download URL of the uploaded image
   */
  static async uploadImage(
    folderPath: string,
    fileUri: string,
    customName?: string
  ): Promise<string> {
    try {
      const fileExtension = fileUri.substring(fileUri.lastIndexOf('.') + 1);
      const fileName =
        customName || `${Date.now()}-${Math.floor(Math.random() * 10000)}.${fileExtension}`;

      const storageRef = ref(storage, `${folderPath}/${fileName}`);

      // Convert the local file URI to a Blob
      const response = await fetch(fileUri);
      const blob = await response.blob();

      // Upload blob
      await uploadBytes(storageRef, blob);

      // Get and return download URL
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image. Please try again.');
    }
  }

  /**
   * Upload multiple images sequentially
   * @param folderPath - Storage folder path
   * @param fileUris - Array of local image URIs
   * @returns Array of download URLs
   */
  static async uploadMultipleImages(
    folderPath: string,
    fileUris: string[]
  ): Promise<string[]> {
    const urls: string[] = [];
    for (const uri of fileUris) {
      const url = await this.uploadImage(folderPath, uri);
      urls.push(url);
    }
    return urls;
  }

  /**
   * Delete an image from Firebase Storage using its download URL or storage path.
   * @param imagePathOrUrl - Full download URL or relative storage path (e.g., "restaurants/123/menu_items/image.jpg")
   */
  static async deleteImage(imagePathOrUrl: string): Promise<void> {
    try {
      let imageRef;

      // If it's a full URL, convert it to a reference
      if (imagePathOrUrl.startsWith('http')) {
        imageRef = ref(storage, imagePathOrUrl);
      } else {
        imageRef = ref(storage, imagePathOrUrl);
      }

      await deleteObject(imageRef);
      console.log('✅ Image deleted successfully');
    } catch (error) {
      console.error('Error deleting image:', error);
      throw new Error('Failed to delete image. Please try again.');
    }
  }

  /**
   * Delete all images inside a given folder (e.g., when deleting a restaurant)
   * @param folderPath - Folder to delete (e.g. "restaurants/123/menu_items")
   */
  static async deleteFolder(folderPath: string): Promise<void> {
    try {
      const folderRef = ref(storage, folderPath);
      const list = await listAll(folderRef);

      const deletePromises = list.items.map((itemRef) => deleteObject(itemRef));
      await Promise.all(deletePromises);

      console.log(`✅ Deleted all files in folder: ${folderPath}`);
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw new Error('Failed to delete folder contents.');
    }
  }

  /**
   * Get all image URLs from a folder
   * @param folderPath - e.g. "restaurants/123/gallery"
   * @returns Array of download URLs
   */
  static async listImages(folderPath: string): Promise<string[]> {
    try {
      const folderRef = ref(storage, folderPath);
      const list = await listAll(folderRef);

      const urls = await Promise.all(
        list.items.map((itemRef) => getDownloadURL(itemRef))
      );

      return urls;
    } catch (error) {
      console.error('Error listing images:', error);
      throw new Error('Failed to list images. Please try again.');
    }
  }
}

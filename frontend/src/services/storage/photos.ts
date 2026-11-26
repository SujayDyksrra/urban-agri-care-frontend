import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export async function choosePhoto(source: 'camera' | 'library'): Promise<string | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Camera permission was denied. You can enable it in device settings.');
  } else {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Photo library permission was denied. You can enable it in device settings.');
  }
  const options = { mediaTypes: ['images'] as ImagePicker.MediaType[], quality: 0.8 as const };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  const asset = result.assets[0];
  // Web has no app file system: keep the photo as a data URL so it survives a reload.
  if (typeof document !== 'undefined') {
    if (asset.uri.startsWith('data:')) return asset.uri;
    const blob = await (await fetch(asset.uri)).blob();
    return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read the photo.')); reader.readAsDataURL(blob); });
  }
  const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/heif': 'heif', 'image/webp': 'webp' };
  const extension = extensions[asset.mimeType ?? ''] ?? asset.fileName?.match(/\.(jpe?g|png|heic|heif|webp)$/i)?.[1]?.toLowerCase() ?? 'jpg';
  const dir = new Directory(Paths.document, 'plant-photos');
  dir.create({ idempotent: true });
  const file = new File(dir, `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`);
  new File(asset.uri).copy(file);
  return file.uri;
}

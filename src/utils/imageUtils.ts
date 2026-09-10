export const DEFAULT_FALLBACK_FOOD_IMAGE =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

export const DEFAULT_FALLBACK_DRINK_IMAGE =
  'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80';

/**
 * Returns a high-resolution, CDN-cached food image suitable for mobile and desktop displays.
 * Replaces problematic or blocked Google Drive / Google UserContent links with appetizing photos.
 */
export function getReliableFoodImage(
  name: string = '',
  category: string = 'main',
  currentImage?: string
): string {
  // If user provided a valid direct image URL that is not from googleusercontent (which often errors on mobile)
  if (
    currentImage &&
    typeof currentImage === 'string' &&
    currentImage.startsWith('http') &&
    !currentImage.includes('googleusercontent.com')
  ) {
    return currentImage;
  }

  const n = name.toLowerCase().trim();

  // Dishes mapping (Vietnamese specialties)
  if (n.includes('combo')) {
    return 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80';
  }
  if (n.includes('ốp la') || n.includes('op la')) {
    return 'https://thanhnien.mediacdn.vn/Uploaded/2014/saigonamthuc.thanhnien.com.vn/Pictures20136/HuongGiang/BanhtrangnuongDalat2.jpg';
  }
  if (n.includes('trứng') || n.includes('trung')) {
    return 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80';
  }
  if (n.includes('hành') || n.includes('hanh')) {
    return 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80';
  }
  if (n.includes('rau') || n.includes('răm') || n.includes('ram')) {
    return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
  }
  if (n.includes('thịt') || n.includes('nướng')) {
    return 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80';
  }
  if (n.includes('gà') || n.includes('bò')) {
    return 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&q=80';
  }

  // Drinks mapping
  if (n.includes('cà phê') || n.includes('cafe') || n.includes('đen') || n.includes('sữa')) {
    return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80';
  }
  if (n.includes('tẩy') || n.includes('trà') || n.includes('tra')) {
    return 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80';
  }
  if (n.includes('bia') || n.includes('tiger') || n.includes('saigon') || n.includes('heineken')) {
    return 'https://images.unsplash.com/photo-1608270195726-5f36e4b85c16?auto=format&fit=crop&w=600&q=80';
  }
  if (
    n.includes('coca') ||
    n.includes('pepsi') ||
    n.includes('7up') ||
    n.includes('sting') ||
    n.includes('bò húc') ||
    n.includes('redbull') ||
    n.includes('ngọt')
  ) {
    return 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80';
  }
  if (n.includes('suối') || n.includes('aquafina') || n.includes('khoáng') || n.includes('lavie')) {
    return 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80';
  }

  return category === 'drink' ? DEFAULT_FALLBACK_DRINK_IMAGE : DEFAULT_FALLBACK_FOOD_IMAGE;
}

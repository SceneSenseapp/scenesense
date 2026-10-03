import { useState, useRef } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

const PRESET_AVATARS = [
  { name: 'Cyber Operative', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200' },
  { name: 'Neon Glitch', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200' },
  { name: 'Void Walker', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200' },
  { name: 'Grid Runner', url: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200' }
];

export default function AvatarTab({ 
  user, 
  activeTheme, 
  avatarUrl, 
  setAvatarUrl, 
  showToast 
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef(null);

  const saveAvatarToBackend = async (newUrl, isBase64 = false) => {
    try {
      if (!isBase64) {
        await updateProfile(user, { photoURL: newUrl }).catch((err) => console.log("Auth photo update skipped:", err));
      }
      
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { photoURL: newUrl, updatedAt: serverTimestamp() }, { merge: true });
      
      setAvatarUrl(newUrl);
      showToast("Biometric avatar transmission complete.", "success");
    } catch (error) {
      console.error("CRITICAL: Failed to sync avatar profile to Firestore:", error);
      showToast("Database synchronization failed. Check Firestore rules.", "error");
    }
  }

  const handleAvatarUpload = async (e) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    const file = e.target.files[0];
    
    if (file.size > 1.5 * 1024 * 1024) {
      showToast("Transmission rejected: File exceeds 1.5MB limit.", "error");
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      try {
        const base64String = uploadEvent.target.result;
        await saveAvatarToBackend(base64String, true); // Flag as base64 to bypass Auth length limits
      } catch (error) {
        console.error("Local conversion failed:", error);
        showToast("Image processing failed.", "error");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.onerror = () => {
      setIsUploading(false);
      showToast("Failed to read local file.", "error");
    };

    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setIsUploading(true);
    try {
      await saveAvatarToBackend(urlInput.trim(), false);
      setUrlInput('');
      setShowUrlInput(false);
    } catch (error) {
      showToast("Invalid image URL format.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearAvatar = async () => {
    if (!user) return;
    try {
      await updateProfile(user, { photoURL: "" }).catch(() => {});
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { photoURL: "", updatedAt: serverTimestamp() }, { merge: true });
      setAvatarUrl(null);
      showToast("Biometric avatar wiped from terminal.", "info");
    } catch (error) {
      console.error("Error clearing avatar:", error);
      showToast("Failed to clear biometric data.", "error");
    }
  };

  return (
    <div className="p-12 bg-[#0f0f0f]/80 min-h-[500px] flex flex-col items-center justify-center">
      <h2 className="text-sm font-black text-white mb-2 uppercase tracking-widest">Update Display Picture</h2>
      
      <p className="text-xs text-gray-400 mb-8 max-w-sm text-center">
        Upload station artwork, choose a preset, or link an external image transmission.
      </p>
      
      <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-white/10 mb-8 bg-black shadow-2xl group">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl">👤</div>
        )}
      </div>

      {/* ACTION CONTROLS */}
      <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
        <label className={`cursor-pointer ${activeTheme.bg} ${activeTheme.hoverBg} transition-all px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg ${activeTheme.shadow}`}>
          <span className="text-white text-xs font-bold uppercase tracking-widest">
            {isUploading ? 'Transmitting...' : 'Upload File'}
          </span>
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*" 
            onChange={handleAvatarUpload} 
            disabled={isUploading}
            className="hidden"
          />
        </label>

        <button 
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="bg-[#1a1a1a] hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-widest px-4 py-3 rounded-lg transition-all"
        >
          {showUrlInput ? 'Cancel URL' : 'Link URL'}
        </button>

        {avatarUrl && (
          <button 
            onClick={handleClearAvatar}
            className="bg-[#1a1a1a] hover:bg-red-950/40 hover:border-red-500 border border-white/10 text-gray-400 hover:text-red-400 text-xs font-bold uppercase tracking-widest px-4 py-3 rounded-lg transition-all"
          >
            Clear Photo
          </button>
        )}
      </div>

      {/* URL INPUT COLLAPSIBLE */}
      {showUrlInput && (
        <form onSubmit={handleUrlSubmit} className="flex gap-2 w-full max-w-md mb-6">
          <input 
            type="url"
            placeholder="https://example.com/image.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 bg-black border border-white/20 rounded-lg px-4 py-2 text-xs text-white focus:border-amber-500 outline-none"
          />
          <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold px-4 py-2 rounded-lg uppercase tracking-wider">
            Lock
          </button>
        </form>
      )}

      {/* PRESET AVATARS */}
      <div className="mt-4 border-t border-white/5 pt-6 w-full max-w-md text-center">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Quick Preset Avatars</p>
        <div className="flex justify-center gap-3">
          {PRESET_AVATARS.map((preset) => (
            <button 
              key={preset.name}
              onClick={() => saveAvatarToBackend(preset.url, false)}
              className="w-12 h-12 rounded-full overflow-hidden border border-white/10 hover:border-amber-500 transition-all hover:scale-110 shadow-md"
              title={preset.name}
            >
              <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
      
      <p className="text-[10px] text-gray-500 mt-6 uppercase tracking-wider">Supports JPG, PNG, WEBP (Max 1.5MB)</p>
    </div>
  );
}
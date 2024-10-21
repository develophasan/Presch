import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, database, storage } from '../firebase';
import { ref as dbRef, set } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useUser } from '../contexts/UserContext';

const ProfileCompletion: React.FC = () => {
  const { currentUser, setCurrentUser } = useUser();
  const navigate = useNavigate();
  const [name, setName] = useState(currentUser?.displayName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [profileImage, setProfileImage] = useState<File | null>(null);

  useEffect(() => {
    if (currentUser && currentUser.bio && currentUser.location && currentUser.profileImageUrl) {
      navigate('/panel');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    let profileImageUrl = currentUser.profileImageUrl;

    if (profileImage) {
      const imageRef = storageRef(storage, `profileImages/${currentUser.uid}`);
      const snapshot = await uploadBytes(imageRef, profileImage);
      profileImageUrl = await getDownloadURL(snapshot.ref);
    }

    const updatedUser = {
      ...currentUser,
      displayName: name,
      bio,
      location,
      profileImageUrl,
      followers: currentUser.followers || [],
      following: currentUser.following || [],
    };

    await set(dbRef(database, `users/${currentUser.uid}`), updatedUser);
    setCurrentUser(updatedUser);
    navigate('/panel');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-purple-700 mb-6">Profil Bilgilerinizi Tamamlayın</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Ad Soyad</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-500 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Biyografi</label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-500 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">Konum</label>
          <input
            type="text"
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-500 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label htmlFor="profileImage" className="block text-sm font-medium text-gray-700">Profil Fotoğrafı</label>
          <input
            type="file"
            id="profileImage"
            accept="image/*"
            onChange={(e) => setProfileImage(e.target.files ? e.target.files[0] : null)}
            required={!currentUser?.profileImageUrl}
            className="mt-1 block w-full"
          />
        </div>
        <button type="submit" className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50">
          Profili Tamamla
        </button>
      </form>
    </div>
  );
};

export default ProfileCompletion;
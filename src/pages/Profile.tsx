import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, database, storage } from '../firebase';
import { ref as dbRef, get, set } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { useUser } from '../contexts/UserContext';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  bio?: string;
  location?: string;
  profileImageUrl?: string;
  followers: string[];
  following: string[];
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const [newProfileImage, setNewProfileImage] = useState<File | null>(null);

  useEffect(() => {
    if (currentUser) {
      setProfile(currentUser);
      setEditedProfile(currentUser);
    }
  }, [currentUser]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      navigate('/');
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedProfile(profile);
    setNewProfileImage(null);
  };

  const handleSaveEdit = async () => {
    if (!editedProfile || !currentUser) return;

    try {
      let profileImageUrl = editedProfile.profileImageUrl;

      if (newProfileImage) {
        const imageRef = storageRef(storage, `profileImages/${currentUser.uid}`);
        const snapshot = await uploadBytes(imageRef, newProfileImage);
        profileImageUrl = await getDownloadURL(snapshot.ref);
      }

      const updatedProfile = {
        ...editedProfile,
        profileImageUrl,
      };

      await set(dbRef(database, `users/${currentUser.uid}`), updatedProfile);
      setCurrentUser(updatedProfile);
      setProfile(updatedProfile);
      setIsEditing(false);
      setNewProfileImage(null);
    } catch (error) {
      console.error('Profil güncellenirken hata oluştu:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (editedProfile) {
      setEditedProfile({
        ...editedProfile,
        [e.target.name]: e.target.value,
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewProfileImage(e.target.files[0]);
    }
  };

  if (!profile) return <div>Yükleniyor...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-purple-700 mb-6">Profilim</h2>
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        {isEditing ? (
          <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-4">
            <div>
              <label htmlFor="profileImage" className="block text-sm font-medium text-gray-700">Profil Fotoğrafı</label>
              <input
                type="file"
                id="profileImage"
                accept="image/*"
                onChange={handleImageChange}
                className="mt-1 block w-full"
              />
            </div>
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">Ad Soyad</label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={editedProfile?.displayName || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-500 focus:ring-opacity-50"
              />
            </div>
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Biyografi</label>
              <textarea
                id="bio"
                name="bio"
                value={editedProfile?.bio || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-500 focus:ring-opacity-50"
              />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">Konum</label>
              <input
                type="text"
                id="location"
                name="location"
                value={editedProfile?.location || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-500 focus:ring-opacity-50"
              />
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
              >
                Kaydet
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                İptal
              </button>
            </div>
          </form>
        ) : (
          <>
            {profile.profileImageUrl && (
              <img src={profile.profileImageUrl} alt="Profil" className="w-32 h-32 rounded-full mb-4" />
            )}
            <h3 className="text-xl font-semibold mb-2">{profile.displayName}</h3>
            <p className="text-gray-600 mb-2">{profile.bio}</p>
            <p className="text-gray-500 mb-4">{profile.location}</p>
            <div className="flex space-x-4 mb-4">
              <span className="text-purple-600 font-semibold">{profile.followers?.length || 0} Takipçi</span>
              <span className="text-purple-600 font-semibold">{profile.following?.length || 0} Takip Edilen</span>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleEdit}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
              >
                Profili Düzenle
              </button>
              <button
                onClick={handleSignOut}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
              >
                Çıkış Yap
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
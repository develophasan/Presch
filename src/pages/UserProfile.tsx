import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { database } from '../firebase';
import { ref, get, set, push, query, orderByChild, equalTo } from 'firebase/database';
import { useUser } from '../contexts/UserContext';
import ShareItem from '../components/ShareItem';
import ProjectItem from '../components/ProjectItem';
import ActivityItem from '../components/ActivityItem';

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

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { currentUser, setCurrentUser } = useUser();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shares, setShares] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      if (userId) {
        const userRef = ref(database, `users/${userId}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setProfile({
            uid: userId,
            displayName: userData.displayName || userData.name || 'İsimsiz Kullanıcı',
            email: userData.email,
            bio: userData.bio || '',
            location: userData.location || '',
            profileImageUrl: userData.profileImageUrl || '',
            followers: userData.followers || [],
            following: userData.following || [],
          });
          if (currentUser) {
            setIsFollowing(userData.followers?.includes(currentUser.uid) || false);
          }
        }

        // Fetch user's shares, projects, and activities
        // ... (existing code for fetching shares, projects, and activities)
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, [userId, currentUser]);

  const handleFollow = async () => {
    if (currentUser && profile) {
      const updatedProfile = { ...profile };
      updatedProfile.followers = [...updatedProfile.followers, currentUser.uid];
      
      const updatedCurrentUser = { ...currentUser };
      updatedCurrentUser.following = [...(updatedCurrentUser.following || []), profile.uid];

      try {
        await Promise.all([
          set(ref(database, `users/${profile.uid}`), updatedProfile),
          set(ref(database, `users/${currentUser.uid}`), updatedCurrentUser)
        ]);

        setProfile(updatedProfile);
        setCurrentUser(updatedCurrentUser);
        setIsFollowing(true);

        // Bildirim gönder
        const notificationsRef = ref(database, `notifications/${profile.uid}`);
        await push(notificationsRef, {
          type: 'follow',
          senderId: currentUser.uid,
          senderName: currentUser.displayName,
          createdAt: new Date().toISOString(),
          read: false,
        });

        console.log('Takip edildi ve bildirim gönderildi');
      } catch (error) {
        console.error('Takip etme veya bildirim gönderme sırasında hata oluştu:', error);
      }
    }
  };

  const handleUnfollow = async () => {
    if (currentUser && profile) {
      const updatedProfile = { ...profile };
      updatedProfile.followers = profile.followers.filter(id => id !== currentUser.uid);
      
      const updatedCurrentUser = { ...currentUser };
      updatedCurrentUser.following = (currentUser.following || []).filter((id: string) => id !== profile.uid);

      try {
        await Promise.all([
          set(ref(database, `users/${profile.uid}`), updatedProfile),
          set(ref(database, `users/${currentUser.uid}`), updatedCurrentUser)
        ]);

        setProfile(updatedProfile);
        setCurrentUser(updatedCurrentUser);
        setIsFollowing(false);

        console.log('Takip bırakıldı');
      } catch (error) {
        console.error('Takibi bırakma sırasında hata oluştu:', error);
      }
    }
  };

  if (isLoading) return <div>Yükleniyor...</div>;
  if (!profile) return <div>Profil bulunamadı.</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-purple-700 mb-6">{profile.displayName} Profili</h2>
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        {profile.profileImageUrl && (
          <img src={profile.profileImageUrl} alt="Profil" className="w-32 h-32 rounded-full mb-4" />
        )}
        <h3 className="text-xl font-semibold mb-2">{profile.displayName}</h3>
        <p className="text-gray-600 mb-2">{profile.bio}</p>
        <p className="text-gray-500 mb-4">{profile.location}</p>
        <div className="flex space-x-4 mb-4">
          <span className="text-purple-600 font-semibold">{profile.followers.length} Takipçi</span>
          <span className="text-purple-600 font-semibold">{profile.following.length} Takip Edilen</span>
        </div>
        {currentUser && currentUser.uid !== profile.uid && (
          <div className="flex space-x-2">
            {isFollowing ? (
              <button
                onClick={handleUnfollow}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
              >
                Takibi Bırak
              </button>
            ) : (
              <button
                onClick={handleFollow}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
              >
                Takip Et
              </button>
            )}
            <Link
              to={`/mesajlar/${profile.uid}`}
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
            >
              Mesaj Gönder
            </Link>
          </div>
        )}
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-2xl font-bold text-purple-700 mb-4">Paylaşımlar</h3>
          {shares.map(share => (
            <ShareItem key={share.id} share={share} />
          ))}
        </div>
        <div>
          <h3 className="text-2xl font-bold text-purple-700 mb-4">Projeler</h3>
          {projects.map(project => (
            <ProjectItem key={project.id} project={project} />
          ))}
        </div>
        <div>
          <h3 className="text-2xl font-bold text-purple-700 mb-4">Etkinlikler</h3>
          {activities.map(activity => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
import React, { useState, useEffect } from 'react';
import { auth, database, storage } from '../firebase';
import { ref, push, onValue } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useUser } from '../contexts/UserContext';
import ActivityItem from '../components/ActivityItem';

interface Activity {
  id: string;
  title: string;
  description: string;
  ageGroup: string;
  learningOutcomes: string[];
  indicators: string[];
  materials: string[];
  process: string;
  adaptation: string;
  createdBy: string;
  createdAt: string;
  userId: string;
  imageUrl?: string;
  likes: number;
  comments: number;
}

const Activities: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newActivity, setNewActivity] = useState<Omit<Activity, 'id' | 'createdBy'| 'createdAt' | 'userId' | 'likes' | 'comments'>>({
    title: '',
    description: '',
    ageGroup: '',
    learningOutcomes: [],
    indicators: [],
    materials: [],
    process: '',
    adaptation: '',
    imageUrl: '',
  });
  const [activityImage, setActivityImage] = useState<File | null>(null);
  const { currentUser } = useUser();

  useEffect(() => {
    if (currentUser) {
      const activitiesRef = ref(database, 'activities');
      const unsubscribe = onValue(activitiesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const activityList = Object.entries(data)
            .map(([key, value]) => ({
              id: key,
              ...(value as Omit<Activity, 'id'>),
            }))
            .filter(activity => 
              activity.userId === currentUser.uid || 
              currentUser.following?.includes(activity.userId)
            )
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setActivities(activityList);
        }
      });

      return () => unsubscribe();
    }
  }, [currentUser]);

  const handleCreateActivity = async () => {
    if (currentUser) {
      let imageUrl = '';
      if (activityImage) {
        const imageRef = storageRef(storage, `activityImages/${Date.now()}_${activityImage.name}`);
        const snapshot = await uploadBytes(imageRef, activityImage);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      const activitiesRef = ref(database, 'activities');
      const newActivityData = {
        ...newActivity,
        createdBy: currentUser.displayName,
        userId: currentUser.uid,
        createdAt: new Date().toISOString(),
        imageUrl,
        likes: 0,
        comments: 0,
      };
      await push(activitiesRef, newActivityData);
      setNewActivity({
        title: '',
        description: '',
        ageGroup: '',
        learningOutcomes: [],
        indicators: [],
        materials: [],
        process: '',
        adaptation: '',
        imageUrl: '',
      });
      setActivityImage(null);
      setShowForm(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewActivity(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'learningOutcomes' | 'indicators' | 'materials') => {
    const values = e.target.value.split(',').map(item => item.trim());
    setNewActivity(prev => ({ ...prev, [field]: values }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setActivityImage(e.target.files[0]);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-purple-700">Etkinlikler</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
        >
          {showForm ? 'İptal' : 'Yeni Etkinlik Paylaş'}
        </button>
      </div>
      
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h3 className="text-xl font-semibold mb-4">Yeni Etkinlik Paylaş</h3>
          <div className="space-y-4">
            <input
              type="text"
              name="title"
              placeholder="Etkinlik Başlığı"
              value={newActivity.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-md"
            />
            <textarea
              name="description"
              placeholder="Etkinlik Açıklaması"
              value={newActivity.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-md"
            />
            <input
              type="text"
              name="ageGroup"
              placeholder="Yaş Grubu"
              value={newActivity.ageGroup}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-md"
            />
            <input
              type="text"
              name="learningOutcomes"
              placeholder="Kazanımlar (virgülle ayırın)"
              value={newActivity.learningOutcomes.join(', ')}
              onChange={(e) => handleArrayInputChange(e, 'learningOutcomes')}
              className="w-full px-3 py-2 border rounded-md"
            />
            <input
              type="text"
              name="indicators"
              placeholder="Göstergeler (virgülle ayırın)"
              value={newActivity.indicators.join(', ')}
              onChange={(e) => handleArrayInputChange(e, 'indicators')}
              className="w-full px-3 py-2 border rounded-md"
            />
            <input
              type="text"
              name="materials"
              placeholder="Materyaller (virgülle ayırın)"
              value={newActivity.materials.join(', ')}
              onChange={(e) => handleArrayInputChange(e, 'materials')}
              className="w-full px-3 py-2 border rounded-md"
            />
            <textarea
              name="process"
              placeholder="Süreç"
              value={newActivity.process}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-md"
            />
            <textarea
              name="adaptation"
              placeholder="Uyarlama"
              value={newActivity.adaptation}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-md"
            />
            <div>
              <label htmlFor="activityImage" className="block text-sm font-medium text-gray-700">
                Etkinlik Görseli
              </label>
              <input
                type="file"
                id="activityImage"
                accept="image/*"
                onChange={handleImageChange}
                className="mt-1 block w-full"
              />
            </div>
            <button
              onClick={handleCreateActivity}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
            >
              Etkinlik Paylaş
            </button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
};

export default Activities;
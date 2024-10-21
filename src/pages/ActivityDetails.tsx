import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { database } from '../firebase';
import { ref, get, push, set } from 'firebase/database';
import { useUser } from '../contexts/UserContext';
import { Heart, MessageCircle } from 'lucide-react';

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

interface User {
  uid: string;
  displayName: string;
  profileImageUrl: string;
}

interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  user: User;
}

const ActivityDetails: React.FC = () => {
  const { activityId } = useParams<{ activityId: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const navigate = useNavigate();
  const { currentUser, getUserById } = useUser();

  useEffect(() => {
    const fetchActivity = async () => {
      if (activityId) {
        const activityRef = ref(database, `activities/${activityId}`);
        const snapshot = await get(activityRef);
        if (snapshot.exists()) {
          const activityData = snapshot.val();
          setActivity({ id: activityId, ...activityData });

          const userData = await getUserById(activityData.userId);
          setUser(userData);

          // Fetch comments
          const commentsRef = ref(database, `activityComments/${activityId}`);
          const commentsSnapshot = await get(commentsRef);
          if (commentsSnapshot.exists()) {
            const commentsData = commentsSnapshot.val();
            const commentPromises = Object.entries(commentsData).map(async ([commentId, comment]: [string, any]) => {
              const commentUser = await getUserById(comment.userId);
              return {
                id: commentId,
                ...comment,
                user: commentUser,
              };
            });
            const resolvedComments = await Promise.all(commentPromises);
            setComments(resolvedComments);
          }

          // Check if the current user has liked the activity
          if (currentUser) {
            const likeRef = ref(database, `activityLikes/${activityId}/${currentUser.uid}`);
            const likeSnapshot = await get(likeRef);
            setIsLiked(likeSnapshot.exists());
          }
        }
      }
    };

    fetchActivity();
  }, [activityId, getUserById, currentUser]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser && activity && newComment.trim()) {
      const commentsRef = ref(database, `activityComments/${activity.id}`);
      const newCommentRef = push(commentsRef);
      const commentData = {
        userId: currentUser.uid,
        content: newComment.trim(),
        createdAt: new Date().toISOString(),
      };
      await set(newCommentRef, commentData);

      // Update comment count
      const activityRef = ref(database, `activities/${activity.id}`);
      await set(activityRef, {
        ...activity,
        comments: (activity.comments || 0) + 1,
      });

      // Add notification
      const notificationRef = push(ref(database, `notifications/${activity.userId}`));
      await set(notificationRef, {
        type: 'comment',
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        activityId: activity.id,
        activityTitle: activity.title,
        createdAt: new Date().toISOString(),
        read: false,
      });

      setNewComment('');
      // Refresh comments
      const updatedCommentsSnapshot = await get(commentsRef);
      if (updatedCommentsSnapshot.exists()) {
        const updatedCommentsData = updatedCommentsSnapshot.val();
        const updatedCommentPromises = Object.entries(updatedCommentsData).map(async ([commentId, comment]: [string, any]) => {
          const commentUser = await getUserById(comment.userId);
          return {
            id: commentId,
            ...comment,
            user: commentUser,
          };
        });
        const resolvedUpdatedComments = await Promise.all(updatedCommentPromises);
        setComments(resolvedUpdatedComments);
      }
    }
  };

  const handleLike = async () => {
    if (currentUser && activity) {
      const likeRef = ref(database, `activityLikes/${activity.id}/${currentUser.uid}`);
      const activityRef = ref(database, `activities/${activity.id}`);

      if (isLiked) {
        // Unlike
        await set(likeRef, null);
        await set(activityRef, {
          ...activity,
          likes: activity.likes - 1,
        });
        setIsLiked(false);
      } else {
        // Like
        await set(likeRef, true);
        await set(activityRef, {
          ...activity,
          likes: (activity.likes || 0) + 1,
        });
        setIsLiked(true);

        // Add notification
        const notificationRef = push(ref(database, `notifications/${activity.userId}`));
        await set(notificationRef, {
          type: 'like',
          senderId: currentUser.uid,
          senderName: currentUser.displayName,
          activityId: activity.id,
          activityTitle: activity.title,
          createdAt: new Date().toISOString(),
          read: false,
        });
      }

      // Update local activity state
      setActivity(prevActivity => prevActivity ? {
        ...prevActivity,
        likes: isLiked ? prevActivity.likes - 1 : (prevActivity.likes || 0) + 1,
      } : null);
    }
  };

  if (!activity || !user) return <div>Yükleniyor...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        {activity.imageUrl && (
          <img src={activity.imageUrl} alt={activity.title} className="w-full h-64 object-cover rounded-lg mb-6" />
        )}
        <div className="flex items-center mb-4">
          <img
            src={user.profileImageUrl || 'https://via.placeholder.com/50'}
            alt={user.displayName}
            className="w-12 h-12 rounded-full mr-4"
          />
          <div>
            <h2 className="text-2xl font-bold">{activity.title}</h2>
            <p className="text-gray-600">
              {user.displayName} tarafından {new Date(activity.createdAt).toLocaleString()} tarihinde paylaşıldı
            </p>
          </div>
        </div>
        <p className="text-gray-700 mb-4">{activity.description}</p>
        <p className="text-gray-600 mb-2"><strong>Yaş Grubu:</strong> {activity.ageGroup}</p>
        {activity.learningOutcomes && activity.learningOutcomes.length > 0 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Kazanımlar:</h3>
            <ul className="list-disc list-inside">
              {activity.learningOutcomes.map((outcome, index) => (
                <li key={index} className="text-gray-700">{outcome}</li>
              ))}
            </ul>
          </div>
        )}
        {activity.indicators && activity.indicators.length > 0 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Göstergeler:</h3>
            <ul className="list-disc list-inside">
              {activity.indicators.map((indicator, index) => (
                <li key={index} className="text-gray-700">{indicator}</li>
              ))}
            </ul>
          </div>
        )}
        {activity.materials && activity.materials.length > 0 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Materyaller:</h3>
            <ul className="list-disc list-inside">
              {activity.materials.map((material, index) => (
                <li key={index} className="text-gray-700">{material}</li>
              ))}
            </ul>
          </div>
        )}
        {activity.process && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Süreç:</h3>
            <p className="text-gray-700">{activity.process}</p>
          </div>
        )}
        {activity.adaptation && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Uyarlama:</h3>
            <p className="text-gray-700">{activity.adaptation}</p>
          </div>
        )}
        <div className="flex items-center mb-4">
          <button
            onClick={handleLike}
            className={`flex items-center mr-4 ${isLiked ? 'text-red-500' : 'text-gray-500'}`}
          >
            <Heart className="w-6 h-6 mr-1" fill={isLiked ? 'currentColor' : 'none'} />
            {activity.likes || 0}
          </button>
          <span className="flex items-center text-gray-500">
            <MessageCircle className="w-6 h-6 mr-1" />
            {activity.comments || 0}
          </span>
        </div>
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4">Yorumlar</h3>
          {comments.map((comment) => (
            <div key={comment.id} className="bg-gray-100 p-4 rounded-lg mb-4">
              <div className="flex items-center mb-2">
                <img
                  src={comment.user.profileImageUrl || 'https://via.placeholder.com/30'}
                  alt={comment.user.displayName}
                  className="w-8 h-8 rounded-full mr-2"
                />
                <div>
                  <p className="font-semibold">{comment.user.displayName}</p>
                  <p className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <p>{comment.content}</p>
            </div>
          ))}
          {currentUser && (
            <form onSubmit={handleCommentSubmit} className="mt-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Yorumunuzu yazın..."
                className="w-full p-2 border rounded-md"
                rows={3}
              />
              <button
                type="submit"
                className="mt-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
              >
                Yorum Yap
              </button>
            </form>
          )}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
        >
          Geri Dön
        </button>
      </div>
    </div>
  );
};

export default ActivityDetails;
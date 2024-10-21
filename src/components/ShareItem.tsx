import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../firebase';
import { ref, get, set, push } from 'firebase/database';
import { Heart, MessageCircle } from 'lucide-react';

interface Share {
  id: string;
  userId: string;
  content: string;
  imageUrl?: string;
  tags?: string[];
  mentionedUsers?: string[];
  createdAt: string;
  likes: number;
  comments: number;
}

interface User {
  displayName: string;
  profileImageUrl: string;
}

interface ShareItemProps {
  share: Share;
}

const ShareItem: React.FC<ShareItemProps> = ({ share }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const userRef = ref(database, `users/${share.userId}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        setUser(snapshot.val());
      }
    };

    fetchUser();
  }, [share.userId]);

  const handleShareClick = () => {
    navigate(`/paylasim/${share.id}`);
  };

  const handleLike = async () => {
    const likeRef = ref(database, `shareLikes/${share.id}`);
    const snapshot = await get(likeRef);
    const likes = snapshot.exists() ? snapshot.val() : 0;

    if (isLiked) {
      // Unlike
      await set(likeRef, likes - 1);
      setIsLiked(false);
    } else {
      // Like
      await set(likeRef, likes + 1);
      setIsLiked(true);
    }
  };

  const renderContent = () => {
    const maxLength = 100;
    let content = share.content.length > maxLength 
      ? share.content.substring(0, maxLength) + '...' 
      : share.content;

    return <p className="text-gray-800 mb-2">{content}</p>;
  };

  if (!user) return null;

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4 cursor-pointer" onClick={handleShareClick}>
      {renderContent()}
      {share.imageUrl && (
        <img 
          src={share.imageUrl} 
          alt="Paylaşılan görsel" 
          className="w-full h-auto rounded-lg mb-2 object-cover max-h-48"
        />
      )}
      <div className="flex flex-wrap mb-2">
        {share.tags && share.tags.map((tag, index) => (
          <span key={index} className="bg-purple-100 text-purple-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
            #{tag}
          </span>
        ))}
      </div>
      <div className="flex items-center text-gray-500 mb-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleLike();
          }}
          className={`flex items-center mr-4 ${isLiked ? 'text-red-500' : 'text-gray-500'}`}
        >
          <Heart className="w-5 h-5 mr-1" fill={isLiked ? 'currentColor' : 'none'} />
          {share.likes}
        </button>
        <span className="flex items-center">
          <MessageCircle className="w-5 h-5 mr-1" />
          {share.comments}
        </span>
      </div>
      <p className="text-gray-500 text-sm">
        {new Date(share.createdAt).toLocaleString()}
      </p>
    </div>
  );
};

export default ShareItem;

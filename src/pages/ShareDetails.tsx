import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { database } from '../firebase';
import { ref, get, push, set } from 'firebase/database';
import { useUser } from '../contexts/UserContext';
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

const ShareDetails: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [share, setShare] = useState<Share | null>(null);
  const [author, setAuthor] = useState<User | null>(null);
  const [mentionedUsers, setMentionedUsers] = useState<User[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const navigate = useNavigate();
  const { currentUser, getUserById } = useUser();

  useEffect(() => {
    const fetchShare = async () => {
      if (shareId) {
        const shareRef = ref(database, `shares/${shareId}`);
        const snapshot = await get(shareRef);
        if (snapshot.exists()) {
          const shareData = snapshot.val();
          setShare({ id: shareId, ...shareData });

          const authorData = await getUserById(shareData.userId);
          setAuthor(authorData);

          if (shareData.mentionedUsers) {
            const mentionedUsersData = await Promise.all(
              shareData.mentionedUsers.map((userId: string) =>
                getUserById(userId)
              )
            );
            setMentionedUsers(mentionedUsersData.filter(Boolean));
          }

          // Fetch comments
          const commentsRef = ref(database, `shareComments/${shareId}`);
          const commentsSnapshot = await get(commentsRef);
          if (commentsSnapshot.exists()) {
            const commentsData = commentsSnapshot.val();
            const commentPromises = Object.entries(commentsData).map(
              async ([commentId, comment]: [string, any]) => {
                const commentUser = await getUserById(comment.userId);
                return {
                  id: commentId,
                  ...comment,
                  user: commentUser,
                };
              }
            );
            const resolvedComments = await Promise.all(commentPromises);
            setComments(resolvedComments);
          }

          // Check if the current user has liked the share
          if (currentUser) {
            const likeRef = ref(
              database,
              `shareLikes/${shareId}/${currentUser.uid}`
            );
            const likeSnapshot = await get(likeRef);
            setIsLiked(likeSnapshot.exists());
          }
        }
      }
    };

    fetchShare();
  }, [shareId, getUserById, currentUser]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser && share && newComment.trim()) {
      const commentsRef = ref(database, `shareComments/${share.id}`);
      const newCommentRef = push(commentsRef);
      const commentData = {
        userId: currentUser.uid,
        content: newComment.trim(),
        createdAt: new Date().toISOString(),
      };
      await set(newCommentRef, commentData);

      // Update comment count
      const shareRef = ref(database, `shares/${share.id}`);
      await set(shareRef, {
        ...share,
        comments: (share.comments || 0) + 1,
      });

      // Add notification to share owner's notifications tree
      if (currentUser.uid !== share.userId) {
        // Kendi yorumun için bildirim gönderme
        const notificationRef = push(
          ref(database, `notifications/${share.userId}`)
        );
        await set(notificationRef, {
          type: 'comment',
          senderId: currentUser.uid,
          senderName: currentUser.displayName,
          shareId: share.id,
          shareContent: share.content.substring(0, 50),
          createdAt: new Date().toISOString(),
          read: false,
        });
      }

      setNewComment('');
      // Refresh comments
      const updatedCommentsSnapshot = await get(commentsRef);
      if (updatedCommentsSnapshot.exists()) {
        const updatedCommentsData = updatedCommentsSnapshot.val();
        const updatedCommentPromises = Object.entries(updatedCommentsData).map(
          async ([commentId, comment]: [string, any]) => {
            const commentUser = await getUserById(comment.userId);
            return {
              id: commentId,
              ...comment,
              user: commentUser,
            };
          }
        );
        const resolvedUpdatedComments = await Promise.all(
          updatedCommentPromises
        );
        setComments(resolvedUpdatedComments);
      }
    }
  };

  const handleLike = async () => {
    if (currentUser && share) {
      const likeRef = ref(
        database,
        `shareLikes/${share.id}/${currentUser.uid}`
      );
      const shareRef = ref(database, `shares/${share.id}`);

      if (isLiked) {
        // Unlike
        await set(likeRef, null);
        await set(shareRef, {
          ...share,
          likes: share.likes - 1,
        });
        setIsLiked(false);
      } else {
        // Like
        await set(likeRef, true);
        await set(shareRef, {
          ...share,
          likes: (share.likes || 0) + 1,
        });
        setIsLiked(true);

        // Add notification to share owner's notifications tree
        if (currentUser.uid !== share.userId) {
          // Kendi beğenmen için bildirim gönderme
          const notificationRef = push(
            ref(database, `notifications/${share.userId}`)
          );
          await set(notificationRef, {
            type: 'like',
            senderId: currentUser.uid,
            senderName: currentUser.displayName,
            shareId: share.id,
            shareContent: share.content.substring(0, 50),
            createdAt: new Date().toISOString(),
            read: false,
          });
        }
      }

      // Update local share state
      setShare((prevShare) =>
        prevShare
          ? {
              ...prevShare,
              likes: isLiked ? prevShare.likes - 1 : (prevShare.likes || 0) + 1,
            }
          : null
      );
    }
  };

  const renderContent = () => {
    if (!share) return null;

    let content = share.content;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = content.match(urlRegex);

    if (matches) {
      matches.forEach((url) => {
        content = content.replace(
          url,
          `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${url}</a>`
        );
      });
    }

    mentionedUsers.forEach((user) => {
      const mentionRegex = new RegExp(`@${user.displayName}\\b`, 'g');
      content = content.replace(
        mentionRegex,
        `<span class="text-purple-600 cursor-pointer">@${user.displayName}</span>`
      );
    });

    return (
      <p
        className="text-gray-800 mb-4"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  };

  if (!share || !author) return <div>Yükleniyor...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center mb-4">
          <img
            src={author?.profileImageUrl || 'https://via.placeholder.com/50'}
            alt={author?.displayName}
            className="w-12 h-12 rounded-full mr-4"
          />
          <div>
            <h2 className="text-2xl font-bold">
              {share?.content.substring(0, 50)}
            </h2>
            <p className="text-gray-600">
              {author?.displayName} tarafından{' '}
              {new Date(share?.createdAt).toLocaleString()} tarihinde paylaşıldı
            </p>
          </div>
        </div>
        {renderContent()}
        {share?.imageUrl && (
          <img
            src={share.imageUrl}
            alt={share.content}
            className="w-full h-auto object-cover rounded-lg mb-4"
          />
        )}
        <div className="flex items-center mb-4">
          <button
            onClick={handleLike}
            className={`flex items-center mr-4 ${
              isLiked ? 'text-red-500' : 'text-gray-500'
            }`}
          >
            <Heart
              className="w-6 h-6 mr-1"
              fill={isLiked ? 'currentColor' : 'none'}
            />
            {share.likes || 0}
          </button>
          <span className="flex items-center text-gray-500">
            <MessageCircle className="w-6 h-6 mr-1" />
            {share.comments || 0}
          </span>
        </div>
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4">Yorumlar</h3>
          {comments.map((comment) => (
            <div key={comment.id} className="bg-gray-100 p-4 rounded-lg mb-4">
              <div className="flex items-center mb-2">
                <img
                  src={
                    comment.user?.profileImageUrl ||
                    'https://via.placeholder.com/30'
                  }
                  alt={comment.user?.displayName}
                  className="w-8 h-8 rounded-full mr-2"
                />
                <div>
                  <p className="font-semibold">{comment.user?.displayName}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
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

export default ShareDetails;

import React, { useState, useEffect, useRef } from 'react';
import { database, storage } from '../firebase';
import { ref as dbRef, push, set, get } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useUser } from '../contexts/UserContext';

interface ShareFormProps {
  onShareComplete?: () => void;
}

const ShareForm: React.FC<ShareFormProps> = ({ onShareComplete }) => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([]);
  const [followedUsers, setFollowedUsers] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { currentUser, getUserById } = useUser();

  useEffect(() => {
    const fetchFollowedUsers = async () => {
      if (currentUser && currentUser.following) {
        const followedUsersData = await Promise.all(
          currentUser.following.map(async (followingId) => {
            const user = await getUserById(followingId);
            return user;
          })
        );
        setFollowedUsers(followedUsersData.filter(Boolean));
      }
    };

    fetchFollowedUsers();
  }, [currentUser, getUserById]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    let imageUrl = '';
    if (image) {
      const imageRef = storageRef(storage, `shareImages/${Date.now()}_${image.name}`);
      const snapshot = await uploadBytes(imageRef, image);
      imageUrl = await getDownloadURL(snapshot.ref);
    }

    const shareRef = dbRef(database, 'shares');
    const newShare = await push(shareRef, {
      userId: currentUser.uid,
      content,
      imageUrl,
      tags,
      mentionedUsers,
      likes: 0,  // Başlangıçta 0 beğeni
      comments: 0, // Başlangıçta 0 yorum
      createdAt: new Date().toISOString(),
    });

    // Etiketlenen kullanıcılara bildirim gönder
    for (const userId of mentionedUsers) {
      const notificationRef = dbRef(database, `notifications/${userId}`);
      await push(notificationRef, {
        type: 'mention',
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        shareId: newShare.key,
        content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        createdAt: new Date().toISOString(),
        read: false,
      });
    }

    setContent('');
    setImage(null);
    setTags([]);
    setMentionedUsers([]);
    if (onShareComplete) {
      onShareComplete();
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    const lastWord = newContent.split(' ').pop() || '';
    if (lastWord.startsWith('@') && lastWord.length > 1) {
      setShowMentions(true);
      setMentionFilter(lastWord.slice(1));
    } else {
      setShowMentions(false);
    }

    setCursorPosition(e.target.selectionStart);
  };

  const handleMentionClick = (user: any) => {
    const contentBefore = content.slice(0, cursorPosition);
    const contentAfter = content.slice(cursorPosition);
    const lastWordIndex = contentBefore.lastIndexOf('@');
    const newContent = contentBefore.slice(0, lastWordIndex) + `@${user.username} ` + contentAfter;
    setContent(newContent);
    setShowMentions(false);
    setMentionedUsers([...mentionedUsers, user.uid]);
  };

  const filteredUsers = followedUsers.filter(user =>
    user.username.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleContentChange}
        placeholder="Ne düşünüyorsun?"
        className="w-full p-2 border rounded-md"
        rows={4}
      />
      {showMentions && filteredUsers.length > 0 && (
        <div className="bg-white border rounded-md shadow-md">
          {filteredUsers.map(user => (
            <div
              key={user.uid}
              onClick={() => handleMentionClick(user)}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              @{user.username}
            </div>
          ))}
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)}
        className="w-full"
      />
      <input
        type="text"
        placeholder="Etiketler (virgülle ayırın)"
        value={tags.join(', ')}
        onChange={(e) => setTags(e.target.value.split(',').map(tag => tag.trim()))}
        className="w-full p-2 border rounded-md"
      />
      <button
        type="submit"
        className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700"
      >
        Paylaş
      </button>
    </form>
  );
};

export default ShareForm;

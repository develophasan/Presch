import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Heart, Search, Bell, MessageCircle } from 'lucide-react'; // Bildirim ve mesaj ikonları
import { useUser } from '../contexts/UserContext';
import { auth, database } from '../firebase';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';

const Header: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    if (currentUser) {
      const notificationsRef = ref(database, `notifications/${currentUser.uid}`);
      const unreadNotificationsQuery = query(notificationsRef, orderByChild('read'), equalTo(false));
      const unsubscribeNotifications = onValue(unreadNotificationsQuery, (snapshot) => {
        setNotificationCount(snapshot.size);
      });

      const messagesRef = ref(database, 'messages');
      const unreadMessagesQuery = query(messagesRef, orderByChild('receiverId'), equalTo(currentUser.uid));
      const unsubscribeMessages = onValue(unreadMessagesQuery, (snapshot) => {
        const unreadCount = snapshot.val() ? Object.values(snapshot.val()).filter((message: any) => !message.read).length : 0;
        setMessageCount(unreadCount);
      });

      return () => {
        unsubscribeNotifications();
        unsubscribeMessages();
      };
    }
  }, [currentUser]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/arama/${searchTerm}`);
    }
  };

  return (
    <header className="bg-purple-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold flex items-center">
          <Heart className="mr-2" /> Presch
        </Link>
        <form onSubmit={handleSearch} className="flex-grow mx-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-full text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm"
            />
            <button type="submit" className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Search className="text-gray-600 w-5 h-5" />
            </button>
          </div>
        </form>

        {/* Mesaj ve Bildirim Butonları */}
        <div className="flex items-center space-x-4">
          <Link to="/bildirimler" className="relative">
            <Bell className="w-6 h-6 text-white" />
            {notificationCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5">
                {notificationCount}
              </span>
            )}
          </Link>
          <Link to="/mesajlar" className="relative">
            <MessageCircle className="w-6 h-6 text-white" />
            {messageCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5">
                {messageCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;

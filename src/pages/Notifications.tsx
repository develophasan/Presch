import React, { useState, useEffect } from 'react';
import { auth, database } from '../firebase';
import { ref, onValue, remove, update } from 'firebase/database';
import { Link, useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  type: 'follow' | 'message' | 'mention' | 'comment' | 'like';
  senderId: string;
  senderName: string;
  shareId?: string;
  activityId?: string;
  activityTitle?: string;
  content?: string;
  shareContent?: string;
  createdAt: string;
  read: boolean;
}

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const notificationsRef = ref(database, `notifications/${user.uid}`);
      const unsubscribe = onValue(notificationsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const notificationList = Object.entries(data).map(([key, value]) => ({
            id: key,
            ...(value as Omit<Notification, 'id'>),
          }));
          setNotifications(
            notificationList.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )
          );

          // Bildirimleri okundu olarak işaretle
          const updates: { [key: string]: boolean } = {};
          notificationList.forEach((notification) => {
            if (!notification.read) {
              updates[`${notification.id}/read`] = true;
            }
          });
          if (Object.keys(updates).length > 0) {
            update(ref(database, `notifications/${user.uid}`), updates);
          }
        } else {
          setNotifications([]);
        }
      });

      return () => unsubscribe();
    }
  }, []);

  const handleDismiss = async (notificationId: string) => {
    const user = auth.currentUser;
    if (user) {
      const notificationRef = ref(
        database,
        `notifications/${user.uid}/${notificationId}`
      );
      await remove(notificationRef);
    }
  };

  const handleClearAll = async () => {
    const user = auth.currentUser;
    if (user) {
      const notificationsRef = ref(database, `notifications/${user.uid}`);
      await remove(notificationsRef);
      setNotifications([]);
    }
  };

  const handleUserClick = (userId: string) => {
    navigate(`/kullanici/${userId}`);
  };

  const handleNotificationClick = (notification: Notification) => {
    switch (notification.type) {
      case 'comment':
      case 'mention':
        // Yorum veya etiket bildirimlerinde paylaşım detayına git
        if (notification.shareId) {
          navigate(`/paylasim/${notification.shareId}`);
        }
        break;
      case 'like':
        // Beğeni bildiriminde etkinlik detayına git
        if (notification.activityId) {
          navigate(`/etkinlik/${notification.activityId}`);
        }
        break;
      case 'follow':
      case 'message':
        // Takip ve mesaj bildiriminde kullanıcı profiline git
        handleUserClick(notification.senderId);
        break;
      default:
        break;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-purple-700">Bildirimler</h2>
        {notifications.length > 0 && (
          <button
            onClick={handleClearAll}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
          >
            Tüm Bildirimleri Temizle
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <p>Henüz bildiriminiz yok.</p>
      ) : (
        <ul className="space-y-4">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className="bg-white p-4 rounded-lg shadow-md flex justify-between items-center cursor-pointer"
              onClick={() => handleNotificationClick(notification)} // Bildirime tıklama olayını ekledik
            >
              <div>
                {notification.type === 'follow' && (
                  <p>
                    <span
                      onClick={() => handleUserClick(notification.senderId)}
                      className="font-semibold text-purple-600 hover:text-purple-800 cursor-pointer"
                    >
                      {notification.senderName}
                    </span>{' '}
                    sizi takip etmeye başladı.
                  </p>
                )}
                {notification.type === 'message' && (
                  <p>
                    <span
                      onClick={() => handleUserClick(notification.senderId)}
                      className="font-semibold text-purple-600 hover:text-purple-800 cursor-pointer"
                    >
                      {notification.senderName}
                    </span>{' '}
                    size bir mesaj gönderdi.
                  </p>
                )}
                {notification.type === 'mention' && (
                  <p>
                    <span
                      onClick={() => handleUserClick(notification.senderId)}
                      className="font-semibold text-purple-600 hover:text-purple-800 cursor-pointer"
                    >
                      {notification.senderName}
                    </span>{' '}
                    sizi bir paylaşımda etiketledi:{' '}
                    <span className="text-blue-600 hover:text-blue-800">
                      {notification.content}
                    </span>
                  </p>
                )}
                {notification.type === 'comment' && (
                  <p>
                    <span
                      onClick={() => handleUserClick(notification.senderId)}
                      className="font-semibold text-purple-600 hover:text-purple-800 cursor-pointer"
                    >
                      {notification.senderName}
                    </span>{' '}
                    paylaşımınıza yorum yaptı:{' '}
                    <span className="text-blue-600 hover:text-blue-800">
                      {notification.shareContent}
                    </span>
                  </p>
                )}
                {notification.type === 'like' && (
                  <p>
                    <span
                      onClick={() => handleUserClick(notification.senderId)}
                      className="font-semibold text-purple-600 hover:text-purple-800 cursor-pointer"
                    >
                      {notification.senderName}
                    </span>{' '}
                    etkinliğinizi beğendi:{' '}
                    <span className="text-blue-600 hover:text-blue-800">
                      {notification.activityTitle}
                    </span>
                  </p>
                )}
                <span className="text-sm text-gray-500">
                  {new Date(notification.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => handleDismiss(notification.id)}
                className="text-red-500 hover:text-red-700"
              >
                Kaldır
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;

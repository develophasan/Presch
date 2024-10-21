import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { auth, database } from '../firebase';
import { ref, push, onValue, query, orderByChild, update, get } from 'firebase/database';
import { Check, CheckCheck } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  read: boolean;
}

interface User {
  uid: string;
  displayName: string;
  email: string;
}

const Messages: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [receiver, setReceiver] = useState<User | null>(null);
  const [contacts, setContacts] = useState<User[]>([]);
  const { currentUser } = useUser();

  useEffect(() => {
    if (currentUser) {
      // Kullanıcının takip ettiklerini ve takipçilerini al
      const userRef = ref(database, `users/${currentUser.uid}`);
      onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
          const allContacts = [...(userData.followers || []), ...(userData.following || [])];
          const uniqueContacts = Array.from(new Set(allContacts));
          
          // Kişilerin bilgilerini al
          Promise.all(uniqueContacts.map(contactId => 
            new Promise<User>((resolve) => {
              const contactRef = ref(database, `users/${contactId}`);
              onValue(contactRef, (snapshot) => {
                const contactData = snapshot.val();
                resolve({
                  uid: contactId,
                  displayName: contactData.displayName || contactData.name,
                  email: contactData.email,
                });
              }, { onlyOnce: true });
            })
          )).then(setContacts);
        }
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (userId) {
      const userRef = ref(database, `users/${userId}`);
      onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
          setReceiver({
            uid: userId,
            displayName: userData.displayName || userData.name,
            email: userData.email,
          });
        }
      });
    }
  }, [userId]);

  useEffect(() => {
    if (currentUser && receiver) {
      const messagesRef = ref(database, 'messages');
      const messagesQuery = query(messagesRef, orderByChild('timestamp'));
      
      const unsubscribe = onValue(messagesQuery, (snapshot) => {
        const messagesData = snapshot.val();
        if (messagesData) {
          const messagesList = Object.entries(messagesData)
            .map(([key, value]) => ({
              id: key,
              ...(value as Omit<Message, 'id'>),
            }))
            .filter(
              (msg) =>
                (msg.senderId === currentUser.uid && msg.receiverId === receiver.uid) ||
                (msg.senderId === receiver.uid && msg.receiverId === currentUser.uid)
            )
            .sort((a, b) => a.timestamp - b.timestamp);
          
          setMessages(messagesList);

          // Okunmamış mesajları okundu olarak işaretle
          const updates: { [key: string]: boolean } = {};
          messagesList.forEach((message) => {
            if (message.receiverId === currentUser.uid && !message.read) {
              updates[`${message.id}/read`] = true;
            }
          });
          if (Object.keys(updates).length > 0) {
            update(ref(database, 'messages'), updates);
          }
        }
      });

      return () => unsubscribe();
    }
  }, [currentUser, receiver]);

  const handleSendMessage = async () => {
    if (newMessage.trim() && currentUser && receiver) {
      const messagesRef = ref(database, 'messages');
      await push(messagesRef, {
        senderId: currentUser.uid,
        receiverId: receiver.uid,
        content: newMessage,
        timestamp: Date.now(),
        read: false,
      });
      setNewMessage('');

      // Bildirim gönder
      const notificationsRef = ref(database, `notifications/${receiver.uid}`);
      await push(notificationsRef, {
        type: 'message',
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-purple-700 mb-6">Mesajlar</h2>
      <div className="flex">
        <div className="w-1/4 bg-white rounded-lg shadow-md overflow-hidden mr-4">
          <h3 className="text-xl font-semibold p-4 bg-purple-100">Kişiler</h3>
          <ul>
            {contacts.map((contact) => (
              <li key={contact.uid}>
                <Link
                  to={`/mesajlar/${contact.uid}`}
                  className={`block p-4 hover:bg-gray-100 ${
                    contact.uid === userId ? 'bg-purple-50' : ''
                  }`}
                >
                  {contact.displayName}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="w-3/4 bg-white rounded-lg shadow-md overflow-hidden">
          {receiver ? (
            <>
              <div className="bg-purple-100 p-4">
                <h3 className="text-xl font-semibold">{receiver.displayName}</h3>
              </div>
              <div className="h-96 overflow-y-auto p-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`mb-4 ${
                      message.senderId === currentUser?.uid
                        ? 'text-right'
                        : 'text-left'
                    }`}
                  >
                    <div
                      className={`inline-block p-2 rounded-lg ${
                        message.senderId === currentUser?.uid
                          ? 'bg-purple-100'
                          : 'bg-gray-100'
                      }`}
                    >
                      {message.content}
                      {message.senderId === currentUser?.uid && (
                        <span className="ml-2">
                          {message.read ? (
                            <CheckCheck className="inline-block w-4 h-4 text-green-500" />
                          ) : (
                            <Check className="inline-block w-4 h-4 text-blue-500" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t">
                <div className="flex">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Mesajınızı yazın..."
                    className="flex-grow px-3 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="bg-purple-600 text-white px-4 py-2 rounded-r-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
                  >
                    Gönder
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-4 text-center text-gray-500">
              Mesajlaşmak için bir kişi seçin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, database } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, get } from 'firebase/database';

interface User {
  uid: string;
  displayName: string;
  email: string;
  bio?: string;
  location?: string;
  profileImageUrl?: string;
  followers?: string[];
  following?: string[];
  username?: string;
}

interface UserContextType {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  getUserById: (userId: string) => Promise<User | null>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userRef = ref(database, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setCurrentUser({
              uid: user.uid,
              displayName: data.displayName || data.name || 'İsimsiz Kullanıcı',
              email: data.email,
              bio: data.bio,
              location: data.location,
              profileImageUrl: data.profileImageUrl,
              followers: data.followers || [],
              following: data.following || [],
              username: data.username || data.displayName?.toLowerCase().replace(/\s/g, '') || user.uid,
            });
          }
        });
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const getUserById = async (userId: string): Promise<User | null> => {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    const data = snapshot.val();
    if (data) {
      return {
        uid: userId,
        displayName: data.displayName || data.name || 'İsimsiz Kullanıcı',
        email: data.email,
        bio: data.bio,
        location: data.location,
        profileImageUrl: data.profileImageUrl,
        followers: data.followers || [],
        following: data.following || [],
        username: data.username || data.displayName?.toLowerCase().replace(/\s/g, '') || userId,
      };
    }
    return null;
  };

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, getUserById }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
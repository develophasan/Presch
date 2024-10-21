import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { currentUser } = useUser();

  if (!currentUser) {
    return <Navigate to="/giris" />;
  }

  if (!currentUser.bio || !currentUser.location || !currentUser.profileImageUrl) {
    return <Navigate to="/profil-tamamla" />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
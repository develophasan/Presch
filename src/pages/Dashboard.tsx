import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { auth, database } from '../firebase';
import { ref, onValue } from 'firebase/database';

const Dashboard: React.FC = () => {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const userRef = ref(database, 'users/' + user.uid);
      onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setUserName(data.name);
        }
      });
    }
  }, []);

  return (
    <div>
      <h2 className="text-3xl font-bold text-purple-700 mb-6">Hoş Geldiniz, {userName}!</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/profil" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300">
          <h3 className="text-xl font-semibold mb-2">Profilim</h3>
          <p>Profil bilgilerinizi görüntüleyin ve düzenleyin</p>
        </Link>
        <Link to="/projeler" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300">
          <h3 className="text-xl font-semibold mb-2">Projelerim</h3>
          <p>Projelerinizi ve işbirliklerinizi yönetin</p>
        </Link>
        <Link to="/mesajlar" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300">
          <h3 className="text-xl font-semibold mb-2">Mesajlar</h3>
          <p>Diğer okul öncesi öğretmenleriyle bağlantı kurun</p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
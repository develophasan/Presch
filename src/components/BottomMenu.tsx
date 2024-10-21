import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Activity, PlusCircle, Briefcase, User } from 'lucide-react';
import ShareModal from './ShareModal';

const BottomMenu: React.FC = () => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'text-purple-600' : 'text-gray-600';
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2">
        <ul className="flex justify-around items-center">
          <li>
            <Link to="/" className={`flex flex-col items-center ${isActive('/')}`}>
              <Home size={24} />
              <span className="text-xs mt-1">Anasayfa</span>
            </Link>
          </li>
          <li>
            <Link to="/etkinlikler" className={`flex flex-col items-center ${isActive('/etkinlikler')}`}>
              <Activity size={24} />
              <span className="text-xs mt-1">Etkinlik</span>
            </Link>
          </li>
          <li>
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex flex-col items-center text-purple-600"
            >
              <PlusCircle size={32} />
              <span className="text-xs mt-1">Paylaş</span>
            </button>
          </li>
          <li>
            <Link to="/projeler" className={`flex flex-col items-center ${isActive('/projeler')}`}>
              <Briefcase size={24} />
              <span className="text-xs mt-1">Proje</span>
            </Link>
          </li>
          <li>
            <Link to="/profil" className={`flex flex-col items-center ${isActive('/profil')}`}>
              <User size={24} />
              <span className="text-xs mt-1">Profil</span>
            </Link>
          </li>
        </ul>
      </nav>
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
    </>
  );
};

export default BottomMenu;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../firebase';
import { ref, get } from 'firebase/database';
import { Heart, MessageCircle } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  posterUrl?: string;
  likes: number;
  comments: number;
}

interface ProjectItemProps {
  project: Project;
}

interface User {
  displayName: string;
  profileImageUrl: string;
}

const ProjectItem: React.FC<ProjectItemProps> = ({ project }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userRef = ref(database, `users/${project.createdBy}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        setUser(snapshot.val());
      }
    };

    fetchUser();
  }, [project.createdBy]);

  const handleUserClick = (userId: string) => {
    navigate(`/kullanici/${userId}`);
  };

  const handleProjectClick = () => {
    navigate(`/proje/${project.id}`);
  };

  if (!user) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-4 cursor-pointer" onClick={handleProjectClick}>
      {project.posterUrl && (
        <img src={project.posterUrl} alt={project.title} className="w-full h-48 object-cover rounded-md mb-4" />
      )}
      <div className="flex items-center mb-4">
        <img
          src={user.profileImageUrl || 'https://via.placeholder.com/40'}
          alt={user.displayName}
          className="w-10 h-10 rounded-full mr-4"
        />
        <div>
          <span
            onClick={(e) => {
              e.stopPropagation();
              handleUserClick(project.createdBy);
            }}
            className="font-semibold text-purple-600 hover:text-purple-800 cursor-pointer"
          >
            {user.displayName}
          </span>
          <p className="text-sm text-gray-500">
            {new Date(project.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
      <p className="text-gray-600 mb-2">{project.description.substring(0, 100)}...</p>
      <div className="flex items-center text-gray-500">
        <span className="flex items-center mr-4">
          <Heart className="w-5 h-5 mr-1" />
          {project.likes}
        </span>
        <span className="flex items-center">
          <MessageCircle className="w-5 h-5 mr-1" />
          {project.comments}
        </span>
      </div>
    </div>
  );
};

export default ProjectItem;
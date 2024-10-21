import React, { useState, useEffect, useRef } from 'react';
import { database, storage } from '../firebase';
import { ref, push, onValue, get } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useUser } from '../contexts/UserContext';
import ProjectItem from '../components/ProjectItem';

interface Project {
  id: string;
  title: string;
  description: string;
  goals: string[];
  targetAudience: string;
  duration: string;
  materials: string[];
  steps: string[];
  evaluation: string;
  createdBy: string;
  createdAt: string;
  participants: string[];
  posterUrl?: string;
  likes: number;
  comments: number;
}

interface User {
  uid: string;
  displayName: string;
  profileImageUrl?: string;
}

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newProject, setNewProject] = useState<Omit<Project, 'id' | 'createdBy' | 'createdAt' | 'likes' | 'comments'>>({
    title: '',
    description: '',
    goals: [],
    targetAudience: '',
    duration: '',
    materials: [],
    steps: [],
    evaluation: '',
    participants: [],
    posterUrl: '',
  });
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<User[]>([]);
  const [participantSearch, setParticipantSearch] = useState('');
  const [showParticipantList, setShowParticipantList] = useState(false);
  const [poster, setPoster] = useState<File | null>(null);
  const { currentUser } = useUser();
  const participantSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser) {
      const projectsRef = ref(database, 'projects');
      const unsubscribe = onValue(projectsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const projectList = Object.entries(data)
            .map(([key, value]) => ({
              id: key,
              ...(value as Omit<Project, 'id'>),
            }))
            .filter(project => 
              project.createdBy === currentUser.uid || 
              project.participants.includes(currentUser.uid)
            )
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setProjects(projectList);
        }
      });

      // Fetch all users
      const usersRef = ref(database, 'users');
      get(usersRef).then((snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          const userList = Object.entries(userData).map(([uid, user]: [string, any]) => ({
            uid,
            displayName: user.displayName || 'İsimsiz Kullanıcı',
            profileImageUrl: user.profileImageUrl
          }));
          setAllUsers(userList);
        }
      });

      return () => unsubscribe();
    }
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (participantSearchRef.current && !participantSearchRef.current.contains(event.target as Node)) {
        setShowParticipantList(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCreateProject = async () => {
    if (currentUser) {
      let posterUrl = '';
      if (poster) {
        const posterRef = storageRef(storage, `projectPosters/${Date.now()}_${poster.name}`);
        const snapshot = await uploadBytes(posterRef, poster);
        posterUrl = await getDownloadURL(snapshot.ref);
      }

      const projectsRef = ref(database, 'projects');
      const newProjectData = {
        ...newProject,
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        participants: [...selectedParticipants.map(user => user.uid), currentUser.uid],
        posterUrl,
        likes: 0,
        comments: 0,
      };
      await push(projectsRef, newProjectData);
      setNewProject({
        title: '',
        description: '',
        goals: [],
        targetAudience: '',
        duration: '',
        materials: [],
        steps: [],
        evaluation: '',
        participants: [],
        posterUrl: '',
      });
      setSelectedParticipants([]);
      setPoster(null);
      setShowForm(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewProject(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof Project) => {
    const values = e.target.value.split(',').map(item => item.trim());
    setNewProject(prev => ({ ...prev, [field]: values }));
  };

  const handleParticipantSelect = (user: User) => {
    if (!selectedParticipants.some(p => p.uid === user.uid)) {
      setSelectedParticipants([...selectedParticipants, user]);
    }
    setParticipantSearch('');
    setShowParticipantList(false);
  };

  const handleRemoveParticipant = (userId: string) => {
    setSelectedParticipants(selectedParticipants.filter(p => p.uid !== userId));
  };

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPoster(e.target.files[0]);
    }
  };

  const filteredUsers = allUsers.filter(user =>
    user.displayName.toLowerCase().includes(participantSearch.toLowerCase()) &&
    !selectedParticipants.some(p => p.uid === user.uid) &&
    user.uid !== currentUser?.uid
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-purple-700">Projeler</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
        >
          {showForm ? 'İptal' : 'Yeni Proje Oluştur'}
        </button>
      </div>
      
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h3 className="text-xl font-semibold mb-4">Yeni Proje Oluştur</h3>
          <div className="space-y-4">
            <input
              type="text"
              name="title"
              placeholder="Proje Başlığı"
              value={newProject.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-md"
            />
            <textarea
              name="description"
              placeholder="Proje Açıklaması"
              value={newProject.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-md"
            />
            <input
              type="text"
              name="goals"
              placeholder="Hedefler (virgülle ayırın)"
              value={newProject.goals.join(', ')}
              onChange={(e) => handleArrayInputChange(e, 'goals')}
              className="w-full px-3 py-2 border rounded-md"
            />
            <input
              type="text"
              name="targetAudience"
              placeholder="Hedef Kitle"
              value={newProject.targetAudience}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-md"
            />
            <input
              type="text"
              name="duration"
              placeholder="Süre"
              value={newProject.duration}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-md"
            />
            <input
              type="text"
              name="materials"
              placeholder="Materyaller (virgülle ayırın)"
              value={newProject.materials.join(', ')}
              onChange={(e) => handleArrayInputChange(e, 'materials')}
              className="w-full px-3 py-2 border rounded-md"
            />
            <input
              type="text"
              name="steps"
              placeholder="Adımlar (virgülle ayırın)"
              value={newProject.steps.join(', ')}
              onChange={(e) => handleArrayInputChange(e, 'steps')}
              className="w-full px-3 py-2 border rounded-md"
            />
            <textarea
              name="evaluation"
              placeholder="Değerlendirme"
              value={newProject.evaluation}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-md"
            />
            <div>
              <h4 className="font-semibold mb-2">Katılımcılar</h4>
              <div className="flex flex-wrap mb-2">
                {selectedParticipants.map((participant) => (
                  <div key={participant.uid} className="bg-purple-100 text-purple-800 text-sm font-medium mr-2 mb-2 px-2.5 py-0.5 rounded flex items-center">
                    <img src={participant.profileImageUrl || 'https://via.placeholder.com/24'} alt={participant.displayName} className="w-6 h-6 rounded-full mr-1" />
                    {participant.displayName}
                    <button onClick={() => handleRemoveParticipant(participant.uid)} className="ml-1 text-purple-600 hover:text-purple-800">
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              <div className="relative" ref={participantSearchRef}>
                <input
                  type="text"
                  placeholder="Katılımcı ara..."
                  value={participantSearch}
                  onChange={(e) => {
                    setParticipantSearch(e.target.value);
                    setShowParticipantList(true);
                  }}
                  onFocus={() => setShowParticipantList(true)}
                  className="w-full px-3 py-2 border rounded-md mb-2"
                />
                {showParticipantList && (
                  <ul className="absolute z-10 bg-white border rounded-md shadow-md max-h-40 overflow-y-auto w-full">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map(user => (
                        <li
                          key={user.uid}
                          onClick={() => handleParticipantSelect(user)}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                        >
                          <img src={user.profileImageUrl || 'https://via.placeholder.com/24'} alt={user.displayName} className="w-6 h-6 rounded-full mr-2" />
                          {user.displayName}
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-2 text-gray-500">Kullanıcı bulunamadı</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Proje Afişi</h4>
              <input
                type="file"
                accept="image/*"
                onChange={handlePosterChange}
                className="w-full"
              />
            </div>
            <button
              onClick={handleCreateProject}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
            >
              Proje Oluştur
            </button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((project) => (
          <ProjectItem key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
};

export default Projects;
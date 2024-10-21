import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { database } from '../firebase';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { useUser } from '../contexts/UserContext';
import ShareItem from '../components/ShareItem';
import ProjectItem from '../components/ProjectItem';
import ActivityItem from '../components/ActivityItem';

interface Share {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  userId: string;
}

const Home: React.FC = () => {
  const { currentUser } = useUser();
  const [shares, setShares] = useState<Share[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<'all' | 'shares' | 'projects' | 'activities'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      const sharesRef = ref(database, 'shares');
      const recentSharesQuery = query(sharesRef, orderByChild('createdAt'), limitToLast(50));
      
      const unsubscribeShares = onValue(recentSharesQuery, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const shareList = Object.entries(data)
            .map(([key, value]: [string, any]) => ({
              id: key,
              ...value,
            }))
            .filter((share) => 
              currentUser.following?.includes(share.userId) || share.userId === currentUser.uid
            )
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          setShares(shareList);
        } else {
          setShares([]);
        }
      });

      const projectsRef = ref(database, 'projects');
      const recentProjectsQuery = query(projectsRef, orderByChild('createdAt'), limitToLast(50));

      const unsubscribeProjects = onValue(recentProjectsQuery, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const projectList = Object.entries(data)
            .map(([key, value]: [string, any]) => ({
              id: key,
              ...value,
            }))
            .filter((project) => 
              currentUser.following?.includes(project.createdBy) || project.createdBy === currentUser.uid
            )
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          setProjects(projectList);
        } else {
          setProjects([]);
        }
      });

      const activitiesRef = ref(database, 'activities');
      const recentActivitiesQuery = query(activitiesRef, orderByChild('createdAt'), limitToLast(50));

      const unsubscribeActivities = onValue(recentActivitiesQuery, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const activityList = Object.entries(data)
            .map(([key, value]: [string, any]) => ({
              id: key,
              ...value,
            }))
            .filter((activity) => 
              currentUser.following?.includes(activity.userId) || activity.userId === currentUser.uid
            )
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          setActivities(activityList);
        } else {
          setActivities([]);
        }
        setIsLoading(false);
      });

      return () => {
        unsubscribeShares();
        unsubscribeProjects();
        unsubscribeActivities();
      };
    }
  }, [currentUser]);

  const renderContent = () => {
    if (isLoading) {
      return <div>Yükleniyor...</div>;
    }

    switch (filter) {
      case 'shares':
        return shares.length > 0 ? (
          shares.map(share => <ShareItem key={`share-${share.id}`} share={share} />)
        ) : (
          <div>Gösterilecek paylaşım bulunamadı.</div>
        );
      case 'projects':
        return projects.length > 0 ? (
          projects.map(project => <ProjectItem key={`project-${project.id}`} project={project} />)
        ) : (
          <div>Gösterilecek proje bulunamadı.</div>
        );
      case 'activities':
        return activities.length > 0 ? (
          activities.map(activity => <ActivityItem key={`activity-${activity.id}`} activity={activity} />)
        ) : (
          <div>Gösterilecek etkinlik bulunamadı.</div>
        );
      case 'all':
      default:
        const allItems = [
          ...shares.map(share => ({ ...share, type: 'share' })),
          ...projects.map(project => ({ ...project, type: 'project' })),
          ...activities.map(activity => ({ ...activity, type: 'activity' }))
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return allItems.length > 0 ? (
          allItems.map(item => {
            switch (item.type) {
              case 'share':
                return <ShareItem key={`share-${item.id}`} share={item as Share} />;
              case 'project':
                return <ProjectItem key={`project-${item.id}`} project={item as Project} />;
              case 'activity':
                return <ActivityItem key={`activity-${item.id}`} activity={item as Activity} />;
              default:
                return null;
            }
          })
        ) : (
          <div>Gösterilecek içerik bulunamadı.</div>
        );
    }
  };

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-purple-700 mb-6">Hoş Geldiniz!</h2>
        <p className="mb-4">Okul öncesi öğretmenleri için özel olarak tasarlanmış bu platforma hoş geldiniz.</p>
        <p className="mb-4">Giriş yaparak veya kayıt olarak diğer öğretmenlerle etkileşime geçebilir, projeler paylaşabilir ve etkinlikler düzenleyebilirsiniz.</p>
        <div className="flex space-x-4">
          <Link to="/giris" className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">Giriş Yap</Link>
          <Link to="/kayit" className="bg-pink-500 text-white px-4 py-2 rounded-md hover:bg-pink-600">Kayıt Ol</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-purple-700 mb-6">Akış</h2>
      <div className="mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
        >
          <option value="all">Tümü</option>
          <option value="shares">Paylaşımlar</option>
          <option value="projects">Projeler</option>
          <option value="activities">Etkinlikler</option>
        </select>
      </div>
      <div className="space-y-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default Home;
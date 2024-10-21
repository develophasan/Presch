import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { database } from '../firebase';
import { ref, get } from 'firebase/database';

interface SearchResult {
  id: string;
  type: 'user' | 'project' | 'activity' | 'share';
  title: string;
  description?: string;
}

const SearchResults: React.FC = () => {
  const { searchTerm } = useParams<{ searchTerm: string }>();
  const [results, setResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      const usersRef = ref(database, 'users');
      const projectsRef = ref(database, 'projects');
      const activitiesRef = ref(database, 'activities');
      const sharesRef = ref(database, 'shares');

      const [
        usersSnapshot,
        projectsSnapshot,
        activitiesSnapshot,
        sharesSnapshot,
      ] = await Promise.all([
        get(usersRef),
        get(projectsRef),
        get(activitiesRef),
        get(sharesRef),
      ]);

      const users = usersSnapshot.val();
      const projects = projectsSnapshot.val();
      const activities = activitiesSnapshot.val();
      const shares = sharesSnapshot.val();

      const searchResults: SearchResult[] = [];

      // Kullanıcıları ara
      Object.entries(users || {}).forEach(([id, user]: [string, any]) => {
        const userName = user.name || user.displayName;
        if (
          userName &&
          userName.toLowerCase().includes(searchTerm!.toLowerCase())
        ) {
          searchResults.push({
            id,
            type: 'user',
            title: userName,
            description: user.email,
          });
        }
      });

      // Projeleri ara
      Object.entries(projects || {}).forEach(([id, project]: [string, any]) => {
        if (
          project.title &&
          project.title.toLowerCase().includes(searchTerm!.toLowerCase())
        ) {
          searchResults.push({
            id,
            type: 'project',
            title: project.title,
            description: project.description,
          });
        }
      });
      // Paylaşımları ara (content'e göre arama yapılıyor)
      Object.entries(shares || {}).forEach(([id, share]: [string, any]) => {
        if (
          share.content && // Burada content kontrol ediliyor
          share.content.toLowerCase().includes(searchTerm!.toLowerCase()) // content üzerinden arama yapılıyor
        ) {
          searchResults.push({
            id,
            type: 'share',
            title: share.content.substring(0, 50), // Eğer content'i title gibi göstermek isterseniz, ilk 50 karakteri alabilirsiniz
            description: share.description,
          });
        }
      });
      // Etkinlikleri ara
      Object.entries(activities || {}).forEach(
        ([id, activity]: [string, any]) => {
          if (
            activity.title &&
            activity.title.toLowerCase().includes(searchTerm!.toLowerCase())
          ) {
            searchResults.push({
              id,
              type: 'activity',
              title: activity.title,
              description: activity.description,
            });
          }
        }
      );

      setResults(searchResults);
    };

    if (searchTerm) {
      fetchResults();
    }
  }, [searchTerm]);

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'user':
        navigate(`/kullanici/${result.id}`);
        break;
      case 'project':
        navigate(`/proje/${result.id}`);
        break;
      case 'activity':
        navigate(`/etkinlik/${result.id}`);
        break;
      case 'share': // 'share' tipi için yönlendirme
        navigate(`/paylasim/${result.id}`); // Paylaşıma gitmek için
        break;
      default:
        break;
    }
  };
  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-purple-700 mb-6">
        "{searchTerm}" için Arama Sonuçları
      </h2>
      {results.length === 0 ? (
        <p>Sonuç bulunamadı.</p>
      ) : (
        <ul className="space-y-4">
          {results.map((result) => (
            <li
              key={result.id}
              className="bg-white p-4 rounded-lg shadow-md cursor-pointer"
              onClick={() => handleResultClick(result)}
            >
              <h3 className="text-xl font-semibold text-purple-600 hover:text-purple-800">
                {result.title}
              </h3>
              <p className="text-gray-600">{result.description}</p>
              <span className="text-sm text-gray-500 capitalize">
                {result.type}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchResults;

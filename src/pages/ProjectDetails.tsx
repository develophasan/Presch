import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { database } from '../firebase';
import { ref, get, push, set } from 'firebase/database';
import { useUser } from '../contexts/UserContext';
import { Heart, MessageCircle } from 'lucide-react';

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
  profileImageUrl: string;
}

interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  user: User;
}

const ProjectDetails: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [creator, setCreator] = useState<User | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const navigate = useNavigate();
  const { currentUser, getUserById } = useUser();

  useEffect(() => {
    const fetchProject = async () => {
      if (projectId) {
        const projectRef = ref(database, `projects/${projectId}`);
        const snapshot = await get(projectRef);
        if (snapshot.exists()) {
          const projectData = snapshot.val();
          setProject({ id: projectId, ...projectData });

          const creatorData = await getUserById(projectData.createdBy);
          setCreator(creatorData);

          if (Array.isArray(projectData.participants)) {
            const participantPromises = projectData.participants.map((userId: string) => getUserById(userId));
            const participantData = await Promise.all(participantPromises);
            setParticipants(participantData.filter((user): user is User => user !== null));
          }

          // Fetch comments
          const commentsRef = ref(database, `projectComments/${projectId}`);
          const commentsSnapshot = await get(commentsRef);
          if (commentsSnapshot.exists()) {
            const commentsData = commentsSnapshot.val();
            const commentPromises = Object.entries(commentsData).map(async ([commentId, comment]: [string, any]) => {
              const user = await getUserById(comment.userId);
              return {
                id: commentId,
                ...comment,
                user,
              };
            });
            const resolvedComments = await Promise.all(commentPromises);
            setComments(resolvedComments);
          }

          // Check if the current user has liked the project
          if (currentUser) {
            const likeRef = ref(database, `projectLikes/${projectId}/${currentUser.uid}`);
            const likeSnapshot = await get(likeRef);
            setIsLiked(likeSnapshot.exists());
          }
        }
      }
    };

    fetchProject();
  }, [projectId, getUserById, currentUser]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser && project && newComment.trim()) {
      const commentsRef = ref(database, `projectComments/${project.id}`);
      const newCommentRef = push(commentsRef);
      const commentData = {
        userId: currentUser.uid,
        content: newComment.trim(),
        createdAt: new Date().toISOString(),
      };
      await set(newCommentRef, commentData);

      // Update comment count
      const projectRef = ref(database, `projects/${project.id}`);
      await set(projectRef, {
        ...project,
        comments: (project.comments || 0) + 1,
      });

      // Add notification
      const notificationRef = push(ref(database, `notifications/${project.createdBy}`));
      await set(notificationRef, {
        type: 'comment',
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        projectId: project.id,
        projectTitle: project.title,
        createdAt: new Date().toISOString(),
        read: false,
      });

      setNewComment('');
      // Refresh comments
      const updatedCommentsSnapshot = await get(commentsRef);
      if (updatedCommentsSnapshot.exists()) {
        const updatedCommentsData = updatedCommentsSnapshot.val();
        const updatedCommentPromises = Object.entries(updatedCommentsData).map(async ([commentId, comment]: [string, any]) => {
          const user = await getUserById(comment.userId);
          return {
            id: commentId,
            ...comment,
            user,
          };
        });
        const resolvedUpdatedComments = await Promise.all(updatedCommentPromises);
        setComments(resolvedUpdatedComments);
      }
    }
  };

  const handleLike = async () => {
    if (currentUser && project) {
      const likeRef = ref(database, `projectLikes/${project.id}/${currentUser.uid}`);
      const projectRef = ref(database, `projects/${project.id}`);

      if (isLiked) {
        // Unlike
        await set(likeRef, null);
        await set(projectRef, {
          ...project,
          likes: project.likes - 1,
        });
        setIsLiked(false);
      } else {
        // Like
        await set(likeRef, true);
        await set(projectRef, {
          ...project,
          likes: (project.likes || 0) + 1,
        });
        setIsLiked(true);

        // Add notification
        const notificationRef = push(ref(database, `notifications/${project.createdBy}`));
        await set(notificationRef, {
          type: 'like',
          senderId: currentUser.uid,
          senderName: currentUser.displayName,
          projectId: project.id,
          projectTitle: project.title,
          createdAt: new Date().toISOString(),
          read: false,
        });
      }

      // Update local project state
      setProject(prevProject => prevProject ? {
        ...prevProject,
        likes: isLiked ? prevProject.likes - 1 : (prevProject.likes || 0) + 1,
      } : null);
    }
  };

  if (!project || !creator) return <div>Yükleniyor...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        {project.posterUrl && (
          <img src={project.posterUrl} alt={project.title} className="w-full h-64 object-cover rounded-lg mb-6" />
        )}
        <div className="flex items-center mb-4">
          <img
            src={creator.profileImageUrl || 'https://via.placeholder.com/50'}
            alt={creator.displayName}
            className="w-12 h-12 rounded-full mr-4"
          />
          <div>
            <h2 className="text-2xl font-bold">{project.title}</h2>
            <p className="text-gray-600">
              {creator.displayName} tarafından {new Date(project.createdAt).toLocaleString()} tarihinde oluşturuldu
            </p>
          </div>
        </div>
        <p className="text-gray-700 mb-4">{project.description}</p>
        {project.goals && project.goals.length > 0 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Hedefler:</h3>
            <ul className="list-disc list-inside">
              {project.goals.map((goal, index) => (
                <li key={index} className="text-gray-700">{goal}</li>
              ))}
            </ul>
          </div>
        )}
        {project.targetAudience && (
          <p className="text-gray-600 mb-2"><strong>Hedef Kitle:</strong> {project.targetAudience}</p>
        )}
        {project.duration && (
          <p className="text-gray-600 mb-2"><strong>Süre:</strong> {project.duration}</p>
        )}
        {project.materials && project.materials.length > 0 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Materyaller:</h3>
            <ul className="list-disc list-inside">
              {project.materials.map((material, index) => (
                <li key={index} className="text-gray-700">{material}</li>
              ))}
            </ul>
          </div>
        )}
        {project.steps && project.steps.length > 0 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Adımlar:</h3>
            <ol className="list-decimal list-inside">
              {project.steps.map((step, index) => (
                <li key={index} className="text-gray-700">{step}</li>
              ))}
            </ol>
          </div>
        )}
        {project.evaluation && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Değerlendirme:</h3>
            <p className="text-gray-700">{project.evaluation}</p>
          </div>
        )}
        {participants.length > 0 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Katılımcılar:</h3>
            <div className="flex flex-wrap">
              {participants.map((participant, index) => (
                <div key={index} className="flex items-center mr-4 mb-2">
                  <img
                    src={participant.profileImageUrl || 'https://via.placeholder.com/30'}
                    alt={participant.displayName}
                    className="w-8 h-8 rounded-full mr-2"
                  />
                  <span className="text-gray-700">{participant.displayName}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center mb-4">
          <button
            onClick={handleLike}
            className={`flex items-center mr-4 ${isLiked ? 'text-red-500' : 'text-gray-500'}`}
          >
            <Heart className="w-6 h-6 mr-1" fill={isLiked ? 'currentColor' : 'none'} />
            {project.likes || 0}
          </button>
          <span className="flex items-center text-gray-500">
            <MessageCircle className="w-6 h-6 mr-1" />
            {project.comments || 0}
          </span>
        </div>
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4">Yorumlar</h3>
          {comments.map((comment) => (
            <div key={comment.id} className="bg-gray-100 p-4 rounded-lg mb-4">
              <div className="flex items-center mb-2">
                <img
                  src={comment.user.profileImageUrl || 'https://via.placeholder.com/30'}
                  alt={comment.user.displayName}
                  className="w-8 h-8 rounded-full mr-2"
                />
                <div>
                  <p className="font-semibold">{comment.user.displayName}</p>
                  <p className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <p>{comment.content}</p>
            </div>
          ))}
          {currentUser && (
            <form onSubmit={handleCommentSubmit} className="mt-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Yorumunuzu yazın..."
                className="w-full p-2 border rounded-md"
                rows={3}
              />
              <button
                type="submit"
                className="mt-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
              >
                Yorum Yap
              </button>
            </form>
          )}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
        >
          Geri Dön
        </button>
      </div>
    </div>
  );
};

export default ProjectDetails;
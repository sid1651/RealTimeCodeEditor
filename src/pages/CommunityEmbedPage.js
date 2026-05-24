import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { getCommunityProjectDetail } from '../utils/communityApi';
import { getCommunityPreviewSrcDoc } from '../utils/communityPreview';

const CommunityEmbedPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      setIsLoading(true);
      try {
        const data = await getCommunityProjectDetail(roomId);
        setProject(data.project || null);
      } catch (error) {
        setProject(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [roomId]);

  const previewDoc = useMemo(
    () => (project ? getCommunityPreviewSrcDoc(project) : ''),
    [project]
  );

  if (isLoading) {
    return (
      <div className="communityEmbedPage">
        <div className="communityEmbedStatus">Loading preview...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="communityEmbedPage">
        <div className="communityEmbedStatus">This project is not available for embedding.</div>
      </div>
    );
  }

  return (
    <div className="communityEmbedPage">
      <div className="communityEmbedFrame">
        <iframe
          title={`${project.title} embeddable preview`}
          srcDoc={previewDoc}
          sandbox="allow-scripts"
        />
      </div>

      <button
        type="button"
        className="communityEmbedFooter"
        onClick={() => navigate(`/community/${project.roomId}`)}
      >
        <span>{project.title} · Built with Kódikos</span>
        <ExternalLink size={14} />
      </button>
    </div>
  );
};

export default CommunityEmbedPage;

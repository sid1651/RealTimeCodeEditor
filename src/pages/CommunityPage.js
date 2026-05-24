import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass, Eye, Globe2, Heart, Search, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  getCommunityProjects,
  toggleCommunityProjectLike,
} from '../utils/communityApi';
import { getCommunityPreviewSrcDoc } from '../utils/communityPreview';

const formatCount = (value) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value || 0);

const CommunityPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [pendingLikeRoomId, setPendingLikeRoomId] = useState(null);

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const data = await getCommunityProjects(searchQuery.trim());
        setProjects(data.projects || []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load the community gallery.');
      } finally {
        setIsLoading(false);
      }
    };

    const timeout = window.setTimeout(fetchProjects, 250);
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const syncProject = (nextProject) => {
    setProjects((current) => current.map((project) => (
      project.roomId === nextProject.roomId ? nextProject : project
    )));
  };

  const openProject = (project) => navigate(`/community/${project.roomId}`);

  const toggleLike = async (project) => {
    if (!user?.id) {
      toast.error('Sign in to like community projects.');
      return;
    }

    setPendingLikeRoomId(project.roomId);
    try {
      const data = await toggleCommunityProjectLike(project.roomId);
      if (data.project) {
        syncProject(data.project);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update like.');
    } finally {
      setPendingLikeRoomId(null);
    }
  };

  return (
    <div className="communityPage">
      <header className="communityTopbar">
        <button type="button" className="btn-outline communityBackBtn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} /> Back To Dashboard
        </button>

        <div className="communitySearch">
          <Search size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search projects, tags, creators..."
          />
        </div>
      </header>

      <section className="communityHero">
        <div>
          <p className="communityEyebrow">Community</p>
          <h1>Discover what other builders are shipping.</h1>
          <p>
            Explore published rooms, open live previews, and jump into shared code experiences inspired by a Figma-style gallery.
          </p>
        </div>

        <div className="communityHeroStats">
          <article>
            <span>Published Projects</span>
            <strong>{projects.length}</strong>
          </article>
          <article>
            <span>Most Common</span>
            <strong>{projects.filter((project) => project.language === 'react').length > projects.filter((project) => project.language === 'vanilla').length ? 'React' : 'Vanilla'}</strong>
          </article>
          <article>
            <span>Vibe</span>
            <strong>Live previews</strong>
          </article>
        </div>
      </section>

      <section className="communityShelf">
        <div className="communityShelfHead">
          <div>
            <h2>Trending Builds</h2>
            <span>{projects.length ? `${projects.length} projects in the gallery` : 'No published projects yet'}</span>
          </div>
          <div className="communityShelfBadges">
            <span><Compass size={14} /> Discover</span>
            <span><Sparkles size={14} /> Curated by creators</span>
            <span><Globe2 size={14} /> Public previews</span>
          </div>
        </div>

        {isLoading ? (
          <div className="communityGrid">
            {Array.from({ length: 6 }).map((_, index) => (
              <article key={index} className="communityCard skeletonCard" />
            ))}
          </div>
        ) : projects.length ? (
          <div className="communityGrid">
            {projects.map((project) => (
              <article key={project.roomId} className="communityCard">
                <button type="button" className="communityPreviewShell" onClick={() => openProject(project)}>
                  <iframe
                    title={`${project.title} preview`}
                    srcDoc={getCommunityPreviewSrcDoc(project)}
                    sandbox="allow-scripts"
                    loading="lazy"
                  />
                  <div className="communityPreviewOverlay">
                    <span>Open Preview</span>
                  </div>
                </button>

                <div className="communityCardBody">
                  <div className="communityCardTopline">
                    <span className={`roomLanguagePill ${project.language}`}>
                      {project.language === 'react' ? 'React Studio' : 'Vanilla Web'}
                    </span>
                    <button
                      type="button"
                      className={`communityLikeBtn ${project.community?.isLikedByViewer ? 'active' : ''}`}
                      onClick={() => toggleLike(project)}
                      disabled={pendingLikeRoomId === project.roomId}
                    >
                      <Heart size={16} fill={project.community?.isLikedByViewer ? 'currentColor' : 'none'} />
                      {formatCount(project.community?.likeCount)}
                    </button>
                  </div>

                  <h3>{project.title}</h3>
                  <p>{project.community?.description || 'Published from Kodikos Community.'}</p>

                  <div className="communityMetaRow">
                    <span>{project.ownerProfile?.name || 'Kodikos Creator'}</span>
                    <span><Eye size={14} /> {formatCount(project.community?.viewCount)}</span>
                  </div>

                  <div className="communityTags">
                    {(project.community?.tags || []).slice(0, 4).map((tag) => (
                      <span key={`${project.roomId}-${tag}`}>#{tag}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyDashboardState communityEmptyState">
            <Compass size={28} />
            <h4>No community projects yet.</h4>
            <p>Publish a room from your dashboard and it will show up here with a live preview card.</p>
            <button type="button" className="btn-primary" onClick={() => navigate('/dashboard')}>
              <Sparkles size={18} /> Publish Your First Project
            </button>
          </div>
        )}
      </section>

    </div>
  );
};

export default CommunityPage;

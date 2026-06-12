import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass, Eye, Globe2, Heart, Search, SlidersHorizontal, Sparkles, X, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  getCommunityProjects,
  toggleCommunityProjectLike,
} from '../utils/communityApi';
import { getCommunityPreviewSrcDoc } from '../utils/communityPreview';
import { getRoomLanguageLabel } from '../utils/roomLanguage';

const getMostCommonCommunityLanguage = (projects) => {
  const counts = projects.reduce((result, project) => {
    const key = project.language || 'vanilla';
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});

  const [topLanguage] = Object.entries(counts).sort(([, leftCount], [, rightCount]) => rightCount - leftCount)[0] || ['vanilla'];
  return getRoomLanguageLabel(topLanguage);
};

const formatCount = (value) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value || 0);
const LANGUAGE_FILTERS = ['all', 'vanilla', 'react', 'python', 'c', 'cpp'];

const isWithinPublishWindow = (project, publishWindow) => {
  if (publishWindow === 'all') {
    return true;
  }

  const publishedAt = project.community?.publishedAt || project.createdAt;
  if (!publishedAt) {
    return false;
  }

  const publishedTime = new Date(publishedAt).getTime();
  if (Number.isNaN(publishedTime)) {
    return false;
  }

  const now = Date.now();
  const ageMs = now - publishedTime;

  if (publishWindow === '7d') {
    return ageMs <= 7 * 24 * 60 * 60 * 1000;
  }

  if (publishWindow === '30d') {
    return ageMs <= 30 * 24 * 60 * 60 * 1000;
  }

  if (publishWindow === '365d') {
    return ageMs <= 365 * 24 * 60 * 60 * 1000;
  }

  return true;
};

const sortProjects = (items, sortBy) => {
  const sorted = [...items];

  sorted.sort((left, right) => {
    const leftPublished = new Date(left.community?.publishedAt || left.createdAt || 0).getTime();
    const rightPublished = new Date(right.community?.publishedAt || right.createdAt || 0).getTime();

    if (sortBy === 'oldest') {
      return leftPublished - rightPublished;
    }

    if (sortBy === 'most-liked') {
      return (right.community?.likeCount || 0) - (left.community?.likeCount || 0)
        || rightPublished - leftPublished;
    }

    if (sortBy === 'most-viewed') {
      return (right.community?.viewCount || 0) - (left.community?.viewCount || 0)
        || rightPublished - leftPublished;
    }

    if (sortBy === 'title') {
      return left.title.localeCompare(right.title);
    }

    if (sortBy === 'popular') {
      const leftScore = (left.community?.likeCount || 0) * 2 + (left.community?.viewCount || 0);
      const rightScore = (right.community?.likeCount || 0) * 2 + (right.community?.viewCount || 0);
      return rightScore - leftScore || rightPublished - leftPublished;
    }

    return rightPublished - leftPublished;
  });

  return sorted;
};

const formatPublishDate = (value) => {
  if (!value) {
    return 'Unknown date';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date';
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const CommunityPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [publishWindow, setPublishWindow] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [activeTag, setActiveTag] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [pendingLikeRoomId, setPendingLikeRoomId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

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

  const topTags = Object.entries(
    projects.reduce((result, project) => {
      (project.community?.tags || []).forEach((tag) => {
        const normalizedTag = `${tag}`.trim().toLowerCase();
        if (!normalizedTag) {
          return;
        }
        result[normalizedTag] = (result[normalizedTag] || 0) + 1;
      });
      return result;
    }, {})
  )
    .sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
    .slice(0, 6)
    .map(([tag]) => tag);

  const filteredProjects = sortProjects(
    projects.filter((project) => {
      if (languageFilter !== 'all' && project.language !== languageFilter) {
        return false;
      }

      if (!isWithinPublishWindow(project, publishWindow)) {
        return false;
      }

      if (activeTag && !(project.community?.tags || []).some((tag) => `${tag}`.trim().toLowerCase() === activeTag)) {
        return false;
      }

      return true;
    }),
    sortBy
  );

  const hasActiveFilters = languageFilter !== 'all' || publishWindow !== 'all' || sortBy !== 'newest' || Boolean(activeTag);

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
            <span>Visible Projects</span>
            <strong>{filteredProjects.length}</strong>
          </article>
          <article>
            <span>Most Common</span>
            <strong>{getMostCommonCommunityLanguage(filteredProjects.length ? filteredProjects : projects)}</strong>
          </article>
          <article>
            <span>Sort Focus</span>
            <strong>{sortBy === 'popular' ? 'Hot right now' : sortBy === 'most-liked' ? 'Most loved' : sortBy === 'most-viewed' ? 'Most seen' : sortBy === 'oldest' ? 'Archive mode' : sortBy === 'title' ? 'A to Z' : 'Fresh drops'}</strong>
          </article>
        </div>
      </section>

      <section className="communityShelf">
        <div className="communityShelfHead">
          <div>
            <h2>Trending Builds</h2>
            <span>{filteredProjects.length ? `${filteredProjects.length} projects in the gallery` : 'No published projects match these filters yet'}</span>
          </div>
          <div className="communityShelfBadges">
            <span><Compass size={14} /> Discover</span>
            <span><Sparkles size={14} /> Curated by creators</span>
            <span><Globe2 size={14} /> Public previews</span>
          </div>
        </div>

        <div className="communityControls">
          <div className="communityControlsHead">
            <button
              type="button"
              className="communityFilterToggle"
              onClick={() => setShowFilters(!showFilters)}
              title="Toggle filters"
            >
              <SlidersHorizontal size={15} />
              <span>Filter & Sort</span>
              <ChevronDown size={16} style={{ transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </button>
            {hasActiveFilters ? (
              <button
                type="button"
                className="communityClearFilters"
                onClick={() => {
                  setLanguageFilter('all');
                  setPublishWindow('all');
                  setSortBy('newest');
                  setActiveTag('');
                }}
              >
                <X size={14} /> Reset
              </button>
            ) : null}
          </div>

          {showFilters && (
            <>
              <div className="communityControlsRow">
                <label className="communityControlField">
                  <span>Language</span>
                  <select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}>
                    {LANGUAGE_FILTERS.map((language) => (
                      <option key={language} value={language}>
                        {language === 'all' ? 'All languages' : getRoomLanguageLabel(language)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="communityControlField">
                  <span>Published</span>
                  <select value={publishWindow} onChange={(event) => setPublishWindow(event.target.value)}>
                    <option value="all">Any time</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="365d">Last year</option>
                  </select>
                </label>

                <label className="communityControlField">
                  <span>Sort by</span>
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    <option value="newest">Newest</option>
                    <option value="popular">Popular</option>
                    <option value="most-liked">Most liked</option>
                    <option value="most-viewed">Most viewed</option>
                    <option value="oldest">Oldest</option>
                    <option value="title">Title A-Z</option>
                  </select>
                </label>
              </div>

              {topTags.length ? (
                <div className="communityTagFilters">
                  <button
                    type="button"
                    className={`communityTagFilter ${!activeTag ? 'active' : ''}`}
                    onClick={() => setActiveTag('')}
                  >
                    All tags
                  </button>
                  {topTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`communityTagFilter ${activeTag === tag ? 'active' : ''}`}
                      onClick={() => setActiveTag(tag)}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>

        {isLoading ? (
          <div className="communityGrid">
            {Array.from({ length: 6 }).map((_, index) => (
              <article key={index} className="communityCard skeletonCard" />
            ))}
          </div>
        ) : filteredProjects.length ? (
          <div className="communityGrid">
            {filteredProjects.map((project) => (
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
                      {getRoomLanguageLabel(project.language)}
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
                    <span>{formatPublishDate(project.community?.publishedAt || project.createdAt)}</span>
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
            <h4>{projects.length ? 'No projects match the current filters.' : 'No community projects yet.'}</h4>
            <p>
              {projects.length
                ? 'Try a different language, date range, or tag to widen the gallery.'
                : 'Publish a room from your dashboard and it will show up here with a live preview card.'}
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                if (projects.length) {
                  setLanguageFilter('all');
                  setPublishWindow('all');
                  setSortBy('newest');
                  setActiveTag('');
                  return;
                }

                navigate('/dashboard');
              }}
            >
              <Sparkles size={18} /> {projects.length ? 'Clear Filters' : 'Publish Your First Project'}
            </button>
          </div>
        )}
      </section>

    </div>
  );
};

export default CommunityPage;

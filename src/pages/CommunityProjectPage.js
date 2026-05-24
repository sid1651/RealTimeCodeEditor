import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Eye, ExternalLink, Heart, MessageSquare, Sparkles, Wand2 } from 'lucide-react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  addCommunityProjectComment,
  getCommunityProjectDetail,
  remixCommunityProject,
  toggleCommunityProjectLike,
} from '../utils/communityApi';
import { getCommunityPreviewSrcDoc } from '../utils/communityPreview';

const formatCount = (value) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value || 0);

const formatRelativeTime = (timestamp) => {
  const value = new Date(timestamp).getTime();
  const deltaMinutes = Math.max(1, Math.floor((Date.now() - value) / 60000));

  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours}h ago`;
  }

  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays}d ago`;
};

const CommunityProjectPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [commentKind, setCommentKind] = useState('comment');
  const [isCommenting, setIsCommenting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isRemixing, setIsRemixing] = useState(false);
  const [activePanel, setActivePanel] = useState('comments');

  useEffect(() => {
    const loadProject = async () => {
      setIsLoading(true);
      try {
        const data = await getCommunityProjectDetail(roomId);
        setProject(data.project || null);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to open community project.');
        navigate('/community');
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [navigate, roomId]);

  const previewDoc = useMemo(
    () => (project ? getCommunityPreviewSrcDoc(project) : ''),
    [project]
  );

  const iframeSnippet = useMemo(() => {
    if (!project) {
      return '';
    }

    const embedUrl = `${window.location.origin}/embed/${project.roomId}`;
    return `<iframe\n  src="${embedUrl}"\n  title="${project.title} by ${project.ownerProfile?.name || 'Kodikos Creator'}"\n  width="100%"\n  height="560"\n  style="border:0;border-radius:20px;overflow:hidden;"\n  loading="lazy"\n  allowfullscreen\n></iframe>`;
  }, [project]);

  const openCommunityRoom = () => {
    if (!project) {
      return;
    }

    const destination = project.language === 'react'
      ? `/react-studio/${project.roomId}`
      : `/editor/${project.roomId}`;

    navigate(destination, {
      state: {
        username: user?.name || 'Community Viewer',
        role: 'spectator',
        participantId: uuidV4(),
      },
    });
  };

  const toggleLike = async () => {
    if (!user?.id) {
      toast.error('Sign in to like community projects.');
      return;
    }

    setIsLiking(true);
    try {
      const data = await toggleCommunityProjectLike(roomId);
      if (data.project) {
        setProject(data.project);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update like.');
    } finally {
      setIsLiking(false);
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();

    if (!user?.id) {
      toast.error('Sign in to join the discussion.');
      return;
    }

    if (!commentBody.trim()) {
      toast.error('Write something before posting.');
      return;
    }

    setIsCommenting(true);
    try {
      const data = await addCommunityProjectComment(roomId, {
        body: commentBody,
        kind: commentKind,
      });

      if (data.project) {
        setProject(data.project);
      }
      setCommentBody('');
      setCommentKind('comment');
      toast.success(data.message || 'Comment posted.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to post comment.');
    } finally {
      setIsCommenting(false);
    }
  };

  const remixProject = async () => {
    if (!user?.id) {
      toast.error('Sign in to remix this project.');
      return;
    }

    setIsRemixing(true);
    try {
      const data = await remixCommunityProject(roomId);
      const nextRoom = data.room;
      toast.success(data.message || 'Remix created.');

      const destination = nextRoom.language === 'react'
        ? `/react-studio/${nextRoom.roomId}`
        : `/editor/${nextRoom.roomId}`;

      navigate(destination, {
        state: {
          username: user?.name || 'Anonymous',
          role: 'editor',
          participantId: uuidV4(),
        },
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to remix project.');
    } finally {
      setIsRemixing(false);
    }
  };

  const copyEmbedSnippet = async () => {
    if (!iframeSnippet) {
      return;
    }

    try {
      await navigator.clipboard.writeText(iframeSnippet);
      toast.success('Embeddable iframe copied.');
    } catch (error) {
      toast.error('Unable to copy iframe snippet.');
    }
  };

  if (isLoading) {
    return (
      <div className="communityProjectPage">
        <div className="communityProjectShell">
          <div className="emptyDashboardState">Loading project...</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="communityProjectPage">
      <div className="communityProjectShell">
        <header className="communityProjectTopbar">
          <button type="button" className="btn-outline communityBackBtn" onClick={() => navigate('/community')}>
            <ArrowLeft size={16} /> Back To Community
          </button>

          <div className="communityProjectActions">
            <button type="button" className="btn-outline" onClick={toggleLike} disabled={isLiking}>
              <Heart size={16} fill={project.community?.isLikedByViewer ? 'currentColor' : 'none'} />
              {project.community?.isLikedByViewer ? 'Liked' : 'Like'} {formatCount(project.community?.likeCount)}
            </button>
            <button type="button" className="btn-outline" onClick={openCommunityRoom}>
              <ExternalLink size={16} /> Open Room
            </button>
            <button type="button" className="btn-primary" onClick={remixProject} disabled={isRemixing}>
              <Wand2 size={16} /> {isRemixing ? 'Creating Remix...' : 'Remix Project'}
            </button>
          </div>
        </header>

        <section className="communityProjectHero">
          <div>
            <p className="communityEyebrow">Community Project</p>
            <h1>{project.title}</h1>
            <p>{project.community?.description || 'Published from Kodikos Community.'}</p>

            <div className="communityMetaRow">
              <span>{project.ownerProfile?.name || 'Kodikos Creator'}</span>
              <span><Eye size={14} /> {formatCount(project.community?.viewCount)}</span>
              <span><Heart size={14} /> {formatCount(project.community?.likeCount)}</span>
              <span><MessageSquare size={14} /> {project.communityComments?.length || 0}</span>
            </div>

            <div className="communityTags">
              {(project.community?.tags || []).map((tag) => (
                <span key={`${project.roomId}-${tag}`}>#{tag}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="communityProjectStage">
          <div className="communityProjectPreviewCard">
            <iframe
              title={`${project.title} full preview`}
              srcDoc={previewDoc}
              sandbox="allow-scripts"
            />
          </div>
        </section>

        <section className="communityProjectTabs">
          <button
            type="button"
            className={`communityProjectTab ${activePanel === 'about' ? 'active' : ''}`}
            onClick={() => setActivePanel('about')}
          >
            About
          </button>
          <button
            type="button"
            className={`communityProjectTab ${activePanel === 'comments' ? 'active' : ''}`}
            onClick={() => setActivePanel('comments')}
          >
            Comments {project.communityComments?.length || 0}
          </button>
        </section>

        <section className="communityProjectContent">
          <div className="communityThreadColumn">
            {activePanel === 'about' ? (
              <article className="communityAboutCard">
                <h2>About this project</h2>
                <p>{project.community?.description || 'Published from Kodikos Community.'}</p>
                <div className="communityMetaRow">
                  <span>{project.ownerProfile?.name || 'Kodikos Creator'}</span>
                  <span><Eye size={14} /> {formatCount(project.community?.viewCount)}</span>
                  <span><Heart size={14} /> {formatCount(project.community?.likeCount)}</span>
                  <span><MessageSquare size={14} /> {project.communityComments?.length || 0}</span>
                </div>
              </article>
            ) : (
              <>
                <div className="communityDiscussionHead threadVisibleHead">
                  <div>
                    <h2>Comments</h2>
                    <span>Everyone’s feedback, questions, and discussion stay visible here.</span>
                  </div>
                  <strong>{project.communityComments?.length || 0}</strong>
                </div>

                <form className="communityCommentComposer communityCommentComposerInline" onSubmit={submitComment}>
                  <div className="communityCommentComposerTop">
                    <div className="communityCommentAvatar">
                      {(user?.name || 'K')[0]}
                    </div>
                    <div className="communityCommentKinds">
                      <button
                        type="button"
                        className={commentKind === 'comment' ? 'active' : ''}
                        onClick={() => setCommentKind('comment')}
                      >
                        Comment
                      </button>
                      <button
                        type="button"
                        className={commentKind === 'question' ? 'active' : ''}
                        onClick={() => setCommentKind('question')}
                      >
                        Question
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.target.value)}
                    placeholder={commentKind === 'question' ? 'Ask something about this project...' : 'Add a public comment about this project...'}
                    rows={4}
                  />

                  <button type="submit" className="btn-primary" disabled={isCommenting}>
                    <Sparkles size={16} /> {isCommenting ? 'Posting...' : commentKind === 'question' ? 'Post Question' : 'Post Comment'}
                  </button>
                </form>

                <div className="communityCommentList visibleCommentFeed">
                  {project.communityComments?.length ? project.communityComments.map((comment) => (
                    <article key={comment.commentId} className="communityCommentItem">
                      <div className="communityCommentRow">
                        <div className="communityCommentAvatar commentListAvatar">
                          {(comment.authorName || 'K')[0]}
                        </div>
                        <div className="communityCommentBody">
                          <div className="communityCommentTopline">
                            <div>
                              <strong>{comment.authorName}</strong>
                              <span className={`communityCommentKind ${comment.kind}`}>{comment.kind}</span>
                            </div>
                            <span>{formatRelativeTime(comment.createdAt)}</span>
                          </div>
                          <p>{comment.body}</p>
                        </div>
                      </div>
                    </article>
                  )) : (
                    <div className="snapshotEmptyState">Be the first to start the discussion.</div>
                  )}
                </div>
              </>
            )}
          </div>

          <aside className="communitySidebarColumn">
            <article className="communityInfoCard">
              <h3>Project Details</h3>
              <div className="communityMetaRow">
                <span>{project.ownerProfile?.name || 'Kodikos Creator'}</span>
                <span><Eye size={14} /> {formatCount(project.community?.viewCount)}</span>
                <span><Heart size={14} /> {formatCount(project.community?.likeCount)}</span>
              </div>
              <div className="communityTags">
                {(project.community?.tags || []).map((tag) => (
                  <span key={`${project.roomId}-aside-${tag}`}>#{tag}</span>
                ))}
              </div>
            </article>

            <article className="communityInfoCard">
              <h3>Take this further</h3>
              <p>Open the original room in spectator mode or remix the full code into your own workspace.</p>
              <div className="communitySidebarActions">
                <button type="button" className="btn-outline" onClick={openCommunityRoom}>
                  <ExternalLink size={16} /> Open Room
                </button>
                <button type="button" className="btn-primary" onClick={remixProject} disabled={isRemixing}>
                  <Wand2 size={16} /> {isRemixing ? 'Creating Remix...' : 'Remix Project'}
                </button>
              </div>
            </article>

            <article className="communityInfoCard">
              <div className="communityInfoCardHead">
                <h3>Embed this project</h3>
                <button type="button" className="dashboardMiniBtn notificationActionBtn" onClick={copyEmbedSnippet}>
                  <Copy size={14} /> Copy
                </button>
              </div>
              <p>Paste this iframe into your portfolio, blog, or case study page to show a live Kodikos preview.</p>
              <pre className="communityEmbedSnippet">{iframeSnippet}</pre>
            </article>
          </aside>
        </section>
      </div>
    </div>
  );
};

export default CommunityProjectPage;

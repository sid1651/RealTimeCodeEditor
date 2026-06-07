import React from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TrashPage = () => {
  const navigate = useNavigate();

  return (
    <div className="workspaceStandalonePage">
      <div className="workspaceStandaloneShell">
        <header className="workspaceStandaloneTopbar">
          <button type="button" className="btn-outline workspaceBackBtn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} /> Back To Dashboard
          </button>
        </header>

        <section className="workspaceStandaloneHero">
          <div className="workspaceStandaloneCopy">
            <div className="workspaceStandaloneIcon">
              <Trash2 size={20} />
            </div>
            <p className="workspaceStandaloneEyebrow">Workspace Page</p>
            <h1>Trash</h1>
            <p>Deleted rooms will live here once trash and restore support is added to the workspace system.</p>
          </div>
        </section>

        <section className="workspaceStandaloneContent">
          <div className="emptyDashboardState workspaceStandaloneEmpty">
            <Trash2 size={28} />
            <h4>Trash is empty.</h4>
            <p>There are no deleted rooms to restore right now.</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TrashPage;

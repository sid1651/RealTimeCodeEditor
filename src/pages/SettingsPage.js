import React, { useState } from 'react';
import { ArrowLeft, LockKeyhole, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { updatePassword as updatePasswordRequest } from '../utils/accountApi';
import { useAuth } from '../context/AuthContext';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  };

  const submitPasswordUpdate = async (event) => {
    event.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirm password must match.');
      return;
    }

    setIsPasswordSaving(true);

    try {
      await updatePasswordRequest({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update password.');
    } finally {
      setIsPasswordSaving(false);
    }
  };

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
              <LockKeyhole size={20} />
            </div>
            <p className="workspaceStandaloneEyebrow">Account Settings</p>
            <h1>Settings</h1>
            <p>Manage your account security from a dedicated settings page without the dashboard layout around it.</p>
          </div>

          <div className="workspaceStandaloneStat">
            <span>Signed in as</span>
            <strong>{user?.email || 'Kodikos user'}</strong>
          </div>
        </section>

        <section className="workspaceStandaloneContent">
          <div className="settingsGrid workspaceSettingsGrid">
            <article className="settingsCard workspaceStandaloneCard workspaceSettingsCard">
              <div className="settingsCardHead">
                <div>
                  <h4>Security</h4>
                  <span>Change your password and keep your account protected.</span>
                </div>
              </div>

              <form className="settingsForm workspaceSettingsForm" onSubmit={submitPasswordUpdate}>
                <label className="dashboardFieldLabel workspaceFieldLabel">
                  <span className="workspaceFieldTitle">Current Password</span>
                  <span className="workspaceFieldHint">Enter the password you currently use to sign in.</span>
                  <input
                    className="workspaceFieldInput"
                    type="password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Current password"
                  />
                </label>

                <label className="dashboardFieldLabel workspaceFieldLabel">
                  <span className="workspaceFieldTitle">New Password</span>
                  <span className="workspaceFieldHint">Use at least 6 characters for a stronger password.</span>
                  <input
                    className="workspaceFieldInput"
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="New password"
                  />
                </label>

                <label className="dashboardFieldLabel workspaceFieldLabel">
                  <span className="workspaceFieldTitle">Confirm New Password</span>
                  <span className="workspaceFieldHint">Re-enter the new password to confirm it matches.</span>
                  <input
                    className="workspaceFieldInput"
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                  />
                </label>

                <button type="submit" className="btn-primary settingsSubmitBtn workspaceSettingsSubmitBtn" disabled={isPasswordSaving}>
                  <Save size={16} /> {isPasswordSaving ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;

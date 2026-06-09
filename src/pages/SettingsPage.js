import React, { useEffect, useState } from 'react';
import { ArrowLeft, LockKeyhole, Save, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  updatePassword as updatePasswordRequest,
  updateProfile as updateProfileRequest,
} from '../utils/accountApi';
import { useAuth } from '../context/AuthContext';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  useEffect(() => {
    setProfileForm({ name: user?.name || '' });
  }, [user?.name]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  };

  const submitProfileUpdate = async (event) => {
    event.preventDefault();

    if (!profileForm.name.trim()) {
      toast.error('Username is required.');
      return;
    }

    setIsProfileSaving(true);

    try {
      const data = await updateProfileRequest({
        name: profileForm.name.trim(),
        email: user?.email || '',
        phone: user?.phone || '',
      });
      updateUser(data.user);
      setProfileForm({ name: data.user?.name || '' });
      toast.success('Username updated.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update username.');
    } finally {
      setIsProfileSaving(false);
    }
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
                  <h4>Profile</h4>
                  <span>Update the username shown across your workspace.</span>
                </div>
                <UserRound size={20} />
              </div>

              <form className="settingsForm workspaceSettingsForm" onSubmit={submitProfileUpdate}>
                <label className="dashboardFieldLabel workspaceFieldLabel">
                  <span className="workspaceFieldTitle">Username</span>
                  <span className="workspaceFieldHint">This name appears in rooms, dashboard, and shared spaces.</span>
                  <input
                    className="workspaceFieldInput"
                    type="text"
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    placeholder="Your username"
                    minLength={2}
                    maxLength={80}
                  />
                </label>

                <button type="submit" className="btn-primary settingsSubmitBtn workspaceSettingsSubmitBtn" disabled={isProfileSaving}>
                  <Save size={16} /> {isProfileSaving ? 'Updating Username...' : 'Update Username'}
                </button>
              </form>
            </article>

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

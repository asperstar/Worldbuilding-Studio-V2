// src/pages/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { useStorage } from '../contexts/StorageContext';
import { getUserProfile, updateUserProfile } from '../utils/firebaseStorage';
import { migrateLocalStorageToFirebase } from '../utils/dataMigration';

function ProfilePage() {
  const { currentUser, logout } = useStorage();
  const [profile, setProfile] = useState({
    displayName: '',
    bio: '',
    preferences: {
      theme: 'dark',
      showTutorials: true
    }
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  
  useEffect(() => {
    const loadProfile = async () => {
      const userProfile = await getUserProfile();
      if (userProfile) {
        setProfile({
          displayName: userProfile.displayName || '',
          bio: userProfile.bio || '',
          preferences: userProfile.preferences || {
            theme: 'dark',
            showTutorials: true
          }
        });
      }
    };
    
    if (currentUser) {
      loadProfile();
    }
  }, [currentUser]);
  
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handlePreferenceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };
  
  const saveProfile = async () => {
    setIsSaving(true);
    try {
      await updateUserProfile(profile);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleMigration = async () => {
    if (!currentUser) return;
    
    setIsMigrating(true);
    try {
      const result = await migrateLocalStorageToFirebase(currentUser.uid);
      setMigrationResult(result);
    } catch (error) {
      setMigrationResult({ success: false, error: error.message });
    } finally {
      setIsMigrating(false);
    }
  };
  
  return (
    <div className="profile-page">
      <h1>User Profile</h1>
      
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt={profile.displayName} />
            ) : (
              <div className="avatar-placeholder">
                {profile.displayName?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          
          <div className="profile-info">
            {isEditing ? (
              <input
                type="text"
                name="displayName"
                value={profile.displayName}
                onChange={handleProfileChange}
                placeholder="Display Name"
              />
            ) : (
              <h2>{profile.displayName || 'User'}</h2>
            )}
            <p className="user-email">{currentUser?.email}</p>
          </div>
          
          {!isEditing ? (
            <button 
              className="edit-profile-button"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </button>
          ) : (
            <div className="edit-actions">
              <button 
                className="save-button"
                onClick={saveProfile}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button 
                className="cancel-button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        
        {isEditing ? (
          <div className="profile-edit-form">
            <div className="form-group">
              <label>Biography:</label>
              <textarea
                name="bio"
                value={profile.bio || ''}
                onChange={handleProfileChange}
                placeholder="Tell us about yourself..."
                rows="4"
              />
            </div>
            
            <div className="preferences-section">
              <h3>Preferences</h3>
              
              <div className="form-group">
                <label>Theme:</label>
                <select
                  name="theme"
                  value={profile.preferences?.theme || 'dark'}
                  onChange={handlePreferenceChange}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="fantasy">Fantasy</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="showTutorials"
                    checked={profile.preferences?.showTutorials !== false}
                    onChange={handlePreferenceChange}
                  />
                  Show Tutorials and Tips
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="profile-details">
            <h3>About Me</h3>
            <p className="bio">{profile.bio || 'No biography provided.'}</p>
            
            <h3>Account Details</h3>
            <p><strong>User ID:</strong> {currentUser?.uid}</p>
            <p><strong>Account Created:</strong> {currentUser?.metadata?.creationTime}</p>
            <p><strong>Last Sign In:</strong> {currentUser?.metadata?.lastSignInTime}</p>
          </div>
        )}
        
        <div className="data-management">
          <h3>Data Management</h3>
          <button 
            className="data-migration-button"
            onClick={handleMigration}
            disabled={isMigrating}
          >
            {isMigrating ? 'Migrating Data...' : 'Migrate Local Data to Cloud'}
          </button>
          
          {migrationResult && (
            <div className={`migration-result ${migrationResult.success ? 'success' : 'error'}`}>
              {migrationResult.success ? (
                <div>
                  <p>Migration successful! Migrated:</p>
                  <ul>
                    <li>{migrationResult.migrated.characters} characters</li>
                    <li>{migrationResult.migrated.environments} environments</li>
                    <li>{migrationResult.migrated.worlds} worlds</li>
                    {migrationResult.migrated.hasMapData && <li>Map data</li>}
                    {migrationResult.migrated.hasTimelineData && <li>Timeline data</li>}
                  </ul>
                </div>
              ) : (
                <p>Migration failed: {migrationResult.error}</p>
              )}
            </div>
          )}
          
          <div className="account-actions">
            <button onClick={logout} className="logout-button">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
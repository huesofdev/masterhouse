import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Shield, Save, KeyRound, Camera } from 'lucide-react';
import { useGetMe, useUpdateMe, useUpdateMyPassword, useUploadProfilePicture } from '../../settings/api';

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  phone_number: z.string().max(50, "Phone number must be under 50 characters").optional().or(z.literal('')),
});

const passwordSchema = z.object({
  old_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(8, "New password must be at least 8 characters long"),
  confirm_password: z.string().min(1, "Please confirm your new password"),
}).refine(data => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type ProfileData = z.infer<typeof profileSchema>;
type PasswordData = z.infer<typeof passwordSchema>;

export function ProfilePage() {
  const { data: user, isLoading: isLoadingUser } = useGetMe();
  const updateMe = useUpdateMe();
  const updatePassword = useUpdateMyPassword();
  const uploadProfilePicture = useUploadProfilePicture();

  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  const { register: registerProfile, handleSubmit: handleProfileSubmit, reset: resetProfile, formState: { errors: profileErrors, isDirty: isProfileDirty } } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema as any)
  });

  const { register: registerPassword, handleSubmit: handlePasswordSubmit, reset: resetPassword, formState: { errors: passwordErrors } } = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema as any)
  });

  useEffect(() => {
    if (user) {
      resetProfile({
        name: user.name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
      });
    }
  }, [user, resetProfile]);

  const onProfileSave = (data: ProfileData) => {
    updateMe.mutate(data, {
      onSuccess: () => {
        alert("Profile updated successfully");
      },
      onError: (err: any) => {
        alert(err.response?.data?.message || "Failed to update profile");
      }
    });
  };

  const onPasswordSave = (data: PasswordData) => {
    updatePassword.mutate({
      old_password: data.old_password,
      new_password: data.new_password
    }, {
      onSuccess: () => {
        alert("Password changed successfully");
        resetPassword(); // clear the form
      },
      onError: (err: any) => {
        alert(err.response?.data?.message || "Failed to change password");
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB");
        return;
      }
      uploadProfilePicture.mutate(file, {
        onSuccess: () => alert("Profile picture updated!"),
        onError: () => alert("Failed to upload picture")
      });
    }
  };

  if (isLoadingUser) {
    return <div style={{ padding: 'var(--spacing-4)' }}>Loading profile...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Account Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your personal details and account security.</p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--spacing-4)', alignItems: 'flex-start' }}>
        
        {/* Sidebar Nav */}
        <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button 
            onClick={() => setActiveTab('profile')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', 
              background: activeTab === 'profile' ? 'var(--bg-primary)' : 'transparent',
              border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
              color: activeTab === 'profile' ? 'var(--brand-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'profile' ? 600 : 500,
              boxShadow: activeTab === 'profile' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <User size={18} />
            Personal Details
          </button>
          
          <button 
            onClick={() => setActiveTab('security')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', 
              background: activeTab === 'security' ? 'var(--bg-primary)' : 'transparent',
              border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
              color: activeTab === 'security' ? 'var(--brand-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'security' ? 600 : 500,
              boxShadow: activeTab === 'security' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Shield size={18} />
            Security
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1 }}>
          
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-tertiary)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  {user?.profile_picture_url ? (
                    <img src={user.profile_picture_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ 
                      width: '100%', height: '100%', background: 'var(--brand-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                      fontSize: '28px', fontWeight: 700 
                    }}>
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <label 
                    style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: '28px',
                      background: 'rgba(0,0,0,0.6)', color: 'white', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      opacity: 0, transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                  >
                    <Camera size={14} />
                    <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
                  </label>
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{user?.email}</p>
                  {user?.phone_number && <p style={{ color: 'var(--brand-primary)', fontSize: '13px', marginTop: '2px' }}>Tel: {user.phone_number}</p>}
                </div>
              </div>

              <form onSubmit={handleProfileSubmit(onProfileSave)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name</label>
                  <input 
                    {...registerProfile('name')}
                    style={{ 
                      padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', 
                      borderRadius: '8px', color: 'var(--text-primary)', outline: 'none'
                    }}
                  />
                  {profileErrors.name && <span style={{ color: 'var(--status-error)', fontSize: '12px' }}>{profileErrors.name.message}</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address</label>
                  <input 
                    {...registerProfile('email')}
                    type="email"
                    style={{ 
                      padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', 
                      borderRadius: '8px', color: 'var(--text-primary)', outline: 'none'
                    }}
                  />
                  {profileErrors.email && <span style={{ color: 'var(--status-error)', fontSize: '12px' }}>{profileErrors.email.message}</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Phone / Mobile Number</label>
                  <input 
                    {...registerProfile('phone_number')}
                    placeholder="e.g. 0771234567"
                    style={{ 
                      padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', 
                      borderRadius: '8px', color: 'var(--text-primary)', outline: 'none'
                    }}
                  />
                  {profileErrors.phone_number && <span style={{ color: 'var(--status-error)', fontSize: '12px' }}>{profileErrors.phone_number.message}</span>}
                </div>

                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    type="submit" 
                    disabled={updateMe.isPending || !isProfileDirty}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
                      background: isProfileDirty ? 'var(--brand-primary)' : 'var(--bg-secondary)', 
                      color: isProfileDirty ? 'var(--bg-primary)' : 'var(--text-muted)', 
                      border: 'none', borderRadius: '8px', fontWeight: 600, cursor: isProfileDirty ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Save size={16} />
                    {updateMe.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KeyRound size={20} color="var(--brand-primary)" /> Change Password
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Update your password to keep your account secure.</p>
              </div>

              <form onSubmit={handlePasswordSubmit(onPasswordSave)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Current Password</label>
                  <input 
                    type="password"
                    {...registerPassword('old_password')}
                    style={{ 
                      padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', 
                      borderRadius: '8px', color: 'var(--text-primary)', outline: 'none'
                    }}
                  />
                  {passwordErrors.old_password && <span style={{ color: 'var(--status-error)', fontSize: '12px' }}>{passwordErrors.old_password.message}</span>}
                </div>

                <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>New Password</label>
                  <input 
                    type="password"
                    {...registerPassword('new_password')}
                    style={{ 
                      padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', 
                      borderRadius: '8px', color: 'var(--text-primary)', outline: 'none'
                    }}
                  />
                  {passwordErrors.new_password && <span style={{ color: 'var(--status-error)', fontSize: '12px' }}>{passwordErrors.new_password.message}</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Confirm New Password</label>
                  <input 
                    type="password"
                    {...registerPassword('confirm_password')}
                    style={{ 
                      padding: '10px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', 
                      borderRadius: '8px', color: 'var(--text-primary)', outline: 'none'
                    }}
                  />
                  {passwordErrors.confirm_password && <span style={{ color: 'var(--status-error)', fontSize: '12px' }}>{passwordErrors.confirm_password.message}</span>}
                </div>

                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    type="submit" 
                    disabled={updatePassword.isPending}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
                      background: 'var(--brand-primary)', color: 'var(--bg-primary)', 
                      border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Save size={16} />
                    {updatePassword.isPending ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

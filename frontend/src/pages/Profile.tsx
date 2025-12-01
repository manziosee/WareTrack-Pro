import UserProfile from '../components/profile/UserProfile';

export default function Profile() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
      </div>
      
      <UserProfile />
    </div>
  );
}
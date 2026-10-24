import React from 'react';
import { User } from 'lucide-react';
import { RoutePlaceholder } from '../components/common/RoutePlaceholder';

export const ProfilePage: React.FC = () => {
  return (
    <RoutePlaceholder
      title="User Profile"
      description="Active session, API key management, and user identity state."
      icon={User}
      nextTaskNote="Wired to user authorization and session state upon database persistence integration."
    />
  );
};

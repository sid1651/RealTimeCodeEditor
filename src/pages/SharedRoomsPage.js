import React from 'react';
import WorkspaceRoomsPage from '../components/WorkspaceRoomsPage';

const SharedRoomsPage = () => (
  <WorkspaceRoomsPage
    pageKey="shared"
    title="Shared Rooms"
    description="Browse the rooms that already have shared access so you can jump straight into collaborative work."
    filterRooms={(rooms) => rooms.filter((room) => room.privacy === 'shared')}
    emptyTitle="No shared rooms yet."
    emptyDescription="Invite teammates to a room and it will appear here as a shared workspace."
  />
);

export default SharedRoomsPage;

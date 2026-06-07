import React from 'react';
import WorkspaceRoomsPage from '../components/WorkspaceRoomsPage';

const RecentRoomsPage = () => (
  <WorkspaceRoomsPage
    pageKey="recent"
    title="Recent Rooms"
    description="Jump back into the rooms you touched most recently, without going through the dashboard."
    filterRooms={(rooms) => rooms.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))}
    emptyTitle="No recent rooms yet."
    emptyDescription="Open a room and it will appear here for quick access."
  />
);

export default RecentRoomsPage;

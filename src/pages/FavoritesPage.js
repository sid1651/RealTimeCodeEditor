import React from 'react';
import WorkspaceRoomsPage from '../components/WorkspaceRoomsPage';

const FavoritesPage = () => (
  <WorkspaceRoomsPage
    pageKey="favorites"
    title="Favorites"
    description="Keep your starred rooms in one focused place so the projects you care about are always easy to reopen."
    filterRooms={(rooms) => rooms.filter((room) => room.isStarred)}
    emptyTitle="No favorite rooms yet."
    emptyDescription="Star a room from the dashboard or another workspace page and it will show up here."
  />
);

export default FavoritesPage;

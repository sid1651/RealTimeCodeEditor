export const getRoomRoute = (language = 'vanilla', roomId = ':roomId') => {
  switch (language) {
    case 'react':
      return `/react-studio/${roomId}`;
    case 'python':
      return `/python-room/${roomId}`;
    case 'c':
      return `/c-room/${roomId}`;
    case 'cpp':
      return `/cpp-room/${roomId}`;
    case 'vanilla':
    default:
      return `/editor/${roomId}`;
  }
};

export const getRoomInviteMode = (language = 'vanilla') => {
  if (language === 'react' || language === 'python' || language === 'c' || language === 'cpp') {
    return language;
  }

  return 'vanilla';
};

export const getRoomLanguageLabel = (language = 'vanilla') => {
  switch (language) {
    case 'react':
      return 'React Studio';
    case 'python':
      return 'Python Room';
    case 'c':
      return 'C Room';
    case 'cpp':
      return 'C++ Room';
    case 'vanilla':
    default:
      return 'Vanilla Web';
  }
};

export const getRoomJoinLabel = (language = 'vanilla') => {
  switch (language) {
    case 'react':
      return 'React Studio';
    case 'python':
      return 'Python Room';
    case 'c':
      return 'C Room';
    case 'cpp':
      return 'C++ Room';
    case 'vanilla':
    default:
      return 'Editor';
  }
};

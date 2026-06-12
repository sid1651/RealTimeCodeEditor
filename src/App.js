import { BrowserRouter ,Routes,Route} from 'react-router-dom';
import Home from './pages/Home';
import EditorPage from './pages/EditorPage';
import './App.css';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/landingpage';
import Signlog from './pages/signlog';
import Signup from './pages/signup';
import ReactStudioPage from './pages/ReactStudioPage';
import PythonRoomPage from './pages/PythonRoomPage';
import CRoomPage from './pages/CRoomPage';
import CppRoomPage from './pages/CppRoomPage';
import DashboardPage from './pages/DashboardPage';
import CommunityPage from './pages/CommunityPage';
import CommunityProjectPage from './pages/CommunityProjectPage';
import CommunityEmbedPage from './pages/CommunityEmbedPage';
import RecentRoomsPage from './pages/RecentRoomsPage';
import FavoritesPage from './pages/FavoritesPage';
import SharedRoomsPage from './pages/SharedRoomsPage';
import TrashPage from './pages/TrashPage';
import SettingsPage from './pages/SettingsPage';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicHomeRoute from './components/PublicHomeRoute';



function App() {
  return (
    <AuthProvider>
      <div>
        <Toaster
          position="top-right"
          toastOptions={{
            success: {
              theme: {
                primary: "#6F42C1",
              },
            },
          }}
        />
      </div>
      <BrowserRouter>
        <ToastContainer />
        <Routes>
          <Route path="/signup" element={<Signup/>}></Route>
          <Route path="/signin" element={<Signlog/>}></Route>
          <Route path="/" element={<PublicHomeRoute />} ></Route>
          <Route path="/landing" element ={<LandingPage/>}></Route>
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} ></Route>
          <Route path="/recent-rooms" element={<ProtectedRoute><RecentRoomsPage /></ProtectedRoute>} ></Route>
          <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} ></Route>
          <Route path="/shared" element={<ProtectedRoute><SharedRoomsPage /></ProtectedRoute>} ></Route>
          <Route path="/trash" element={<ProtectedRoute><TrashPage /></ProtectedRoute>} ></Route>
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} ></Route>
          <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} ></Route>
          <Route path="/community/:roomId" element={<CommunityProjectPage />} ></Route>
          <Route path="/embed/:roomId" element={<CommunityEmbedPage />} ></Route>
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} ></Route>
          <Route path="/react-studio/:roomId" element={<ReactStudioPage />} ></Route>
          <Route path="/python-room/:roomId" element={<PythonRoomPage />} ></Route>
          <Route path="/c-room/:roomId" element={<CRoomPage />} ></Route>
          <Route path="/cpp-room/:roomId" element={<CppRoomPage />} ></Route>
          <Route path="/editor/:roomId" element={<EditorPage />} ></Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

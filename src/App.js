import { BrowserRouter ,Routes,Route} from 'react-router-dom';
import Home from './pages/Home';
import EditorPage from './pages/EditorPage';
import './App.css';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/landingpage';
import Signlog from './pages/signlog';
import Signup from './pages/signup';
import ReactStudioPage from './pages/ReactStudioPage';
import DashboardPage from './pages/DashboardPage';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';



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
          <Route path="/" element={<DashboardPage />} ></Route>
          <Route path="/landing" element ={<LandingPage/>}></Route>
          <Route path="/dashboard" element={<DashboardPage />} ></Route>
          <Route path="/home" element={<Home />} ></Route>
          <Route path="/react-studio/:roomId" element={<ReactStudioPage />} ></Route>
          <Route path="/editor/:roomId" element={<EditorPage />} ></Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

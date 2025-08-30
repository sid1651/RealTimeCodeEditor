import { BrowserRouter ,Routes,Route} from 'react-router-dom';
import Home from './pages/Home';
import EditorPage from './pages/EditorPage';
import './App.css';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/landingpage';
import Signlog from './pages/signlog';
import Signup from './pages/signup';

function App() {
  return (
    <>
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
      <Routes>
        <Route path="/signup" element={<Signup/>}></Route>
        <Route path="/sigin" element={<Signlog/>}></Route>
        <Route path="/" element ={<LandingPage/>}></Route>
        <Route path="/home" element={<Home />} ></Route>
        <Route path="/editor/:roomId" element={<EditorPage />} ></Route>
      </Routes>
    </BrowserRouter>
    </>
  );
}

export default App;

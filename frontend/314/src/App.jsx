import { Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Home from './components/Home';
import Profile from './components/Profile';
import EventForm from './components/EventForm';
import EventDetail from './components/EventDetails';
import EventList from './components/EventList';
import TicketTypeForm from './components/TicketTypeForm';
import RegistrationConfirmation from './components/RegistrationConfirmation';
import RegistrationList from './components/RegistrationList';

function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<Profile/>}/>
        <Route path="/events" element={<EventList />} />
        <Route path="/events/create" element={<EventForm />}/>
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/events/:id/ticket-types/create" element={<TicketTypeForm />} />
        <Route path="/registrations" element={<RegistrationList />} />
        <Route path="/registrations/:id" element={<RegistrationConfirmation />} />
      </Routes>
    </div>
  );
}

export default App;
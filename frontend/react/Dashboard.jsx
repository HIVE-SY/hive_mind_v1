import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('https://hive-mind-v1-api-259028418114.us-central1.run.app/api/me', {
      credentials: 'include'
    })
      .then(res => {
        if (!res.ok) throw new Error('Not logged in');
        return res.json();
      })
      .then(setUser)
      .catch(() => navigate('/'));
  }, []);

  if (!user) return <p>Loading...</p>;

  return (
    <div>
      <h1>Welcome, {user.name || user.email}!</h1>
      <p>This is your dashboard.</p>
      {/* TODO: Add conversations or any other data */}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Repo } from './services/repo';
import { LocationTracker } from './services/locationTracker';
import { Member, Place, Event } from './types';
import { AuthScreen } from './components/AuthScreen';
import { CircleScreen } from './components/CircleScreen';
import { LiveTab } from './components/LiveTab';
import { PlacesTab } from './components/PlacesTab';
import { HistoryTab } from './components/HistoryTab';
import { AlertsTab } from './components/AlertsTab';

export const App: React.FC = () => {
  const [uid, setUid] = useState<string | null>(Repo.myUid);
  const [circleId, setCircleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    const checkCircle = async () => {
      setLoading(true);
      if (uid) {
        try {
          const c = await Repo.myCircleId();
          if (!isCancelled) setCircleId(c);
        } catch {
          if (!isCancelled) setCircleId(null);
        }
      } else {
        if (!isCancelled) setCircleId(null);
      }
      if (!isCancelled) setLoading(false);
    };

    checkCircle();
    return () => {
      isCancelled = true;
    };
  }, [uid]);

  const handleSignOut = () => {
    LocationTracker.stop();
    Repo.signOut();
    setUid(null);
    setCircleId(null);
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!uid) {
    return <AuthScreen onDone={(newUid) => setUid(newUid)} />;
  }

  if (!circleId) {
    return <CircleScreen onDone={(newCircle) => setCircleId(newCircle)} />;
  }

  return <Home circleId={circleId} onSignOut={handleSignOut} />;
};

interface HomeProps {
  circleId: string;
  onSignOut: () => void;
}

const Home: React.FC<HomeProps> = ({ circleId, onSignOut }) => {
  const [tab, setTab] = useState<number>(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [sharing, setSharing] = useState<boolean>(false);
  const [sos, setSos] = useState<boolean>(false);

  useEffect(() => {
    const unsubMembers = Repo.subscribeMembers(circleId, (m) => {
      setMembers(m);
      const myMember = m.find((mem) => mem.uid === Repo.myUid);
      if (myMember) {
        setSos(myMember.sos);
      }
    });

    const unsubPlaces = Repo.subscribePlaces(circleId, (p) => {
      setPlaces(p);
    });

    const unsubEvents = Repo.subscribeEvents(circleId, (e) => {
      setEvents(e);
    });

    setSharing(LocationTracker.isActive());

    return () => {
      unsubMembers();
      unsubPlaces();
      unsubEvents();
    };
  }, [circleId]);

  const tabs = ['Live', 'Places', 'History', 'Alerts'];

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden max-w-md md:max-w-xl lg:max-w-3xl mx-auto shadow-xl border-x border-slate-200">
      {/* Top Header Bar */}
      <header className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">
            Invite code: <span className="font-mono text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded tracking-wider">{circleId}</span>
          </span>
        </div>
        <button
          onClick={onSignOut}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          Sign out
        </button>
      </header>

      {/* Tab Row (matching Compose TabRow: Live, Places, History, Alerts) */}
      <nav className="flex border-b border-slate-200 bg-white shrink-0">
        {tabs.map((title, i) => {
          const isSelected = tab === i;
          return (
            <button
              key={title}
              onClick={() => setTab(i)}
              className={`flex-1 py-3 text-sm font-semibold transition-all relative ${
                isSelected
                  ? 'text-blue-600 bg-blue-50/40'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {title}
              {isSelected && (
                <div className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-600 rounded-t" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Main Tab View */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {tab === 0 && (
          <LiveTab
            circleId={circleId}
            members={members}
            places={places}
            sharing={sharing}
            sos={sos}
            onSharing={setSharing}
            onSos={setSos}
          />
        )}
        {tab === 1 && <PlacesTab members={members} places={places} />}
        {tab === 2 && <HistoryTab members={members} />}
        {tab === 3 && <AlertsTab events={events} />}
      </main>
    </div>
  );
};
export default App;

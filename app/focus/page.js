'use client'

import { useState, useEffect, useRef } from "react";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (replace with your environment variables)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function FocusPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(null);
  const [habits, setHabits] = useState([]);
  const [habitTracker, setHabitTracker] = useState({});
  const [memorableMoments, setMemorableMoments] = useState({});
  const [newMoment, setNewMoment] = useState('');
  const [editingDay, setEditingDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user && currentDate) {
      fetchUserData();
    }
  }, [status, session, currentDate]);

  async function fetchUserData() {
    setLoading(true);
    const userKey = session.user.email;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDate = new Date(year, month, 1).toISOString().slice(0, 10);
    const endDate = new Date(year, month, daysInMonth).toISOString().slice(0, 10);

    try {
      const { data: habitsData } = await supabase
        .from('habits')
        .select('habit_list')
        .eq('user_id', userKey)
        .single();
      setHabits(Array.isArray(habitsData?.habit_list) ? habitsData.habit_list : []);

      const { data: momentsData } = await supabase
        .from('memorable_moments')
        .select('date, moment')
        .eq('user_id', userKey)
        .gte('date', startDate)
        .lte('date', endDate);

      const momentsMap = {};
      (momentsData || []).forEach(({ date, moment }) => {
        const d = new Date(date);
        momentsMap[d.toISOString().slice(0, 10)] = moment;
      });
      setMemorableMoments(momentsMap);

      const { data: trackingData } = await supabase
        .from('habit_tracking')
        .select('date, habit_status')
        .eq('user_id', userKey)
        .gte('date', startDate)
        .lte('date', endDate);

      const trackingMap = {};
      (trackingData || []).forEach(({ date, habit_status }) => {
        const d = new Date(date);
        trackingMap[d.toISOString().slice(0, 10)] = habit_status;
      });
      setHabitTracker(trackingMap);
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
    setLoading(false);
    hasLoadedOnce.current = true;
  }

  async function upsertHabitTracking(dateISO, habitIndex, value) {
    const userKey = session.user.email;
    const currentStatus = habitTracker[dateISO] ? { ...habitTracker[dateISO] } : {};
    currentStatus[habitIndex] = value;
    setHabitTracker((prev) => ({ ...prev, [dateISO]: currentStatus }));

    const { error } = await supabase
      .from('habit_tracking')
      .upsert(
        [{ user_id: userKey, date: dateISO, habit_status: currentStatus }],
        { onConflict: 'user_id,date' }
      );

    if (error) {
      console.error('Error upserting habit tracking:', error);
    }
  }

  async function upsertMemorableMoment(dateObj, momentText, keyForState) {
    const userKey = session.user.email;
    const dateISO = dateObj.toISOString().slice(0, 10);
    try {
      const { error } = await supabase
        .from('memorable_moments')
        .upsert(
          [{ user_id: userKey, date: dateISO, moment: momentText }],
          { onConflict: 'user_id,date' }
        );
      if (error) {
        console.error('Error upserting memorable moment:', error);
      } else {
        setMemorableMoments(prev => ({
          ...prev,
          [keyForState]: momentText,
        }));
      }
    } catch (err) {
      console.error('Unexpected error upserting memorable moment:', err);
    }
  }

  const toggleHabit = (day, habitIndex) => {
    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateISO = dateObj.toISOString().slice(0, 10);
    const currentVal = habitTracker[dateISO]?.[habitIndex] ?? false;
    upsertHabitTracking(dateISO, habitIndex, !currentVal);
  };

  const addMemorableMoment = (day) => {
    if (newMoment.trim() === '') return;
    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const key = dateObj.toISOString().slice(0, 10);
    upsertMemorableMoment(dateObj, newMoment.trim(), key);
    setNewMoment('');
    setEditingDay(null);
  };

  const startEditing = (day) => {
    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const key = dateObj.toISOString().slice(0, 10);
    setNewMoment(memorableMoments[key] || '');
    setEditingDay(day);
  };

  const saveEdit = (day) => {
    addMemorableMoment(day);
  };

  const goToPrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() === now.getMonth();
  };

  const isToday = (day) => {
    const now = new Date();
    return (
      now.getFullYear() === currentDate.getFullYear() &&
      now.getMonth() === currentDate.getMonth() &&
      now.getDate() === day
    );
  };

  const getHabitStats = (habitIndex) => {
    let count = 0;
    Object.values(habitTracker).forEach(status => {
      if (status[habitIndex]) count++;
    });
    return count;
  };

  if ((status === 'loading' || loading || !currentDate) && !hasLoadedOnce.current) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p style={{ color: "#222", fontWeight: "bold" }}>Loading data...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please sign in to access this page.</p>
      </div>
    );
  }

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

  return (
    <div
      className="min-h-screen p-4 md:p-8"
      style={{ fontFamily: '"Google Sans Code", Inter, Helvetica Neue, Arial, sans-serif' }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 bg-white/80 p-4 rounded-2xl shadow-sm border border-gray-100 backdrop-blur-sm sticky top-4 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="p-2 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-all flex items-center justify-center font-bold"
            title="Previous month"
          >
            ←
          </button>
          <h2 className="text-xl font-extrabold text-[#373737] min-w-[180px] text-center tracking-tight">
            {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-all flex items-center justify-center font-bold"
            title="Next month"
          >
            →
          </button>
          {!isCurrentMonth() && (
            <button
              onClick={goToToday}
              className="ml-2 px-3 py-1 text-[10px] uppercase font-bold bg-[#F8B7D8]/30 hover:bg-[#F8B7D8]/50 text-[#373737] rounded-full transition-all border border-[#F8B7D8]/50"
            >
              Today
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
            <button
              onClick={() => router.push('/habits')}
              className="flex-1 sm:flex-none px-4 py-2 bg-[#373737] text-white text-xs font-bold rounded-lg hover:bg-black transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              ⚙ Edit Habits
            </button>
            <button
              className="flex-1 sm:flex-none px-4 py-2 border-2 border-red-100 text-red-500 text-xs font-bold rounded-lg hover:bg-red-50 transition-all flex items-center justify-center gap-2"
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              Sign Out
            </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="flex mb-16 px-4">
          <div className="hidden md:block w-1/2 pr-4"></div>
          <div className="w-full md:w-1/2 flex justify-start gap-8 md:ml-4 overflow-x-hidden">
            {habits.map((habit, index) => (
              <div key={index} className="relative h-32 w-6 flex items-end justify-center group">
                <div
                  className="absolute text-[10px] text-black font-black whitespace-nowrap transition-colors"
                  style={{
                    transform: 'rotate(-90deg)',
                    transformOrigin: 'center center',
                    bottom: '40px',
                  }}
                >
                  {habit}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1 p-2 md:p-6">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const key = dateObj.toISOString().slice(0, 10);
            const momentValue = memorableMoments[key] || '';
            const today = isToday(day);
            return (
              <div key={day} className={`flex flex-col md:flex-row md:items-center py-3 md:py-2 px-3 rounded-xl transition-all ${today ? 'bg-blue-50/70 ring-1 ring-blue-100 border-b-0' : 'hover:bg-gray-100/30 group border-b border-gray-200/50 last:border-0'}`}>
                {/* Memorable Moments */}
                <div className="w-full md:w-1/2 flex items-center gap-3 pr-4 mb-3 md:mb-0">
                  <span className={`text-xs font-bold min-w-[24px] h-6 flex items-center justify-center rounded-lg ${today ? 'bg-blue-500 text-white' : 'text-gray-500 font-black group-hover:text-black'}`}>{day}</span>
                  <div className="flex-1 border-b border-gray-400 min-h-[28px] flex items-center group/moment">
                    {editingDay === day ? (
                      <div className="flex gap-2 w-full">
                        <input
                          type="text"
                          value={newMoment}
                          onChange={(e) => setNewMoment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit(day)}
                          className="flex-1 text-xs py-1 focus:outline-none bg-transparent font-medium placeholder:italic"
                          style={{ color: "#373737" }}
                          placeholder="What happened today? ✨"
                          autoFocus
                        />
                        <button
                          onClick={() => saveEdit(day)}
                          className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-md hover:bg-green-600 transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    ) : momentValue ? (
                      <>
                        <span className="text-xs text-gray-600 flex-1 font-medium">{momentValue}</span>
                        <button
                          onClick={() => startEditing(day)}
                          className="text-[10px] text-blue-400 opacity-0 group-hover/moment:opacity-100 transition-opacity hover:text-blue-600 flex items-center gap-0.5"
                        >
                          ✎
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEditing(day)}
                        className="text-[10px] font-medium text-gray-300 opacity-0 group-hover/moment:opacity-100 transition-opacity flex items-center gap-1 focus:opacity-100 focus:outline-none"
                        aria-label={`Add memorable moment for day ${day}`}
                      >
                        + Add a memory
                      </button>
                    )}
                  </div>
                </div>

                {/* Habit Checkboxes */}
                <div className="w-full md:w-1/2 flex justify-start gap-8 md:ml-4 overflow-x-auto no-scrollbar pb-1 md:pb-0 scroll-smooth">
                  {habits.map((_, habitIndex) => {
                    const habitStatus = habitTracker[key]?.[habitIndex];
                    const todayInner = isToday(day);
                    return (
                      <div key={habitIndex} className="w-6 flex shrink-0 justify-center">
                        <button
                          onClick={() => toggleHabit(day, habitIndex)}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center text-[10px] font-black transition-all duration-200 ${
                            habitStatus
                              ? 'bg-black border-black text-white shadow-sm scale-105'
                              : todayInner 
                                ? 'bg-white text-blue-500 border-blue-500 border-dashed animate-pulse'
                                : 'bg-transparent text-transparent border-gray-400 hover:border-black hover:text-gray-300'
                          }`}
                          title={`${habits[habitIndex]} - Day ${day}`}
                        >
                          {habitStatus ? '✓' : '•'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Statistics Row */}
        {habits.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-100 px-3">
            <div className="flex flex-col md:flex-row md:items-center">
              <div className="w-full md:w-1/2 pr-4 text-left md:text-right mb-4 md:mb-0">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Monthly Progress</span>
              </div>
              <div className="w-full md:w-1/2 flex justify-start gap-8 md:ml-4 overflow-x-auto no-scrollbar pb-4 md:pb-0">
                {habits.map((_, habitIndex) => (
                  <div key={habitIndex} className="w-6 flex shrink-0 flex-col items-center">
                    <span className="text-lg font-black text-black leading-none mb-1">
                      {getHabitStats(habitIndex)}
                    </span>
                    <span className="text-[8px] text-gray-500 font-black uppercase tracking-tighter">days</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

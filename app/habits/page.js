// habits/page.js
'use client'

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (replace with your env variables)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function HabitsPage() {
  const { data: session, status } = useSession();
  const [habitInput, setHabitInput] = useState('');
  const [habits, setHabits] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetchHabits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  const fetchHabits = async () => {
    const userKey = session?.user?.email;
    console.log('Fetching habits for user email:', userKey);
    const { data, error } = await supabase
      .from('habits')
      .select('habit_list')
      .eq('user_id', userKey)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching habits:', error?.message, '| code:', error?.code, '| details:', error?.details);
      return;
    }
    if (data?.habit_list) {
      setHabits(data.habit_list);
    }
  };

  const saveHabits = async (updatedHabits) => {
    const userKey = session?.user?.email;
    console.log("Saving habits for user email:", userKey, updatedHabits);
    const { error } = await supabase
      .from('habits')
      .upsert([{ user_id: userKey, habit_list: updatedHabits }], {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error saving habits:', error?.message, '| code:', error?.code, '| details:', error?.details);
    } else {
      console.log('Habits saved successfully');
    }
  };

  const addHabit = () => {
    if (habitInput.trim() !== '') {
      const updated = [...habits, habitInput.trim()];
      setHabits(updated);
      setHabitInput('');
      saveHabits(updated);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      addHabit();
    }
  };

  const handleThatsIt = async () => {
    await saveHabits(habits);
    router.push('/focus');
  };

  const removeHabit = (indexToRemove) => {
    const updated = habits.filter((_, index) => index !== indexToRemove);
    setHabits(updated);
    saveHabits(updated);
  };

  const reorderHabit = (index, direction) => {
    const updated = [...habits];
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < updated.length) {
      const [movedItem] = updated.splice(index, 1);
      updated.splice(newIndex, 0, movedItem);
      setHabits(updated);
      saveHabits(updated);
    }
  };

  if (status === 'loading') {
    return <p>Loading...</p>;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p>You must be signed in to view this page.</p>
        <button onClick={() => signOut()}>Sign Out</button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-start min-h-screen p-8"
      style={{ fontFamily: '"Google Sans Code", Inter, Helvetica Neue, Arial, sans-serif' }}
    >
      <h1 className="text-3xl font-bold mb-6 text-black">Welcome, {session.user.name}!</h1>
      <p className="mb-4 text-lg text-gray-500">What are the habits that you would like to track?</p>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={habitInput}
          onChange={(e) => setHabitInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="border border-gray-400 rounded px-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-[#e89ecf] text-black"
          placeholder="Enter a habit"
        />
        <button
          onClick={addHabit}
          className="bg-[#373737] text-white px-4 py-2 rounded hover:bg-[#000000] transition-colors"
        >
          Add
        </button>
      </div>

      <ul className="w-full max-w-md mb-6 space-y-2">
        {habits.map((habit, index) => (
          <li
            key={index}
            className="flex items-center justify-between text-gray-700 bg-gray-100 px-4 py-3 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-400 font-mono text-sm">{index + 1}.</span>
              <span className="font-semibold">{habit}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => reorderHabit(index, -1)}
                disabled={index === 0}
                className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"
                title="Move up"
              >
                ▲
              </button>
              <button
                onClick={() => reorderHabit(index, 1)}
                disabled={index === habits.length - 1}
                className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"
                title="Move down"
              >
                ▼
              </button>
              <button
                onClick={() => removeHabit(index)}
                className="ml-2 text-red-500 hover:bg-red-50 p-1 rounded transition-colors font-bold text-xl leading-none"
                aria-label={`Remove ${habit}`}
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center gap-4">
        {habits.length > 0 && (
          <button
            onClick={handleThatsIt}
            className="bg-[#373737] text-white px-8 py-3 rounded-full hover:bg-[#000000] transition-all shadow-md font-bold text-lg"
          >
            Go to Focus Calendar →
          </button>
        )}
      </div>

      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className="text-sm text-gray-500 underline mt-2"
      >
        Sign Out
      </button>
    </div>
  );
}

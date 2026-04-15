import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'habit-tracker-v2';
const BADGE_LEVELS = [
  { days: 7, label: '7-Day Streak 🔥' },
  { days: 30, label: '30-Day Streak 🚀' },
  { days: 100, label: '100-Day Streak 🏆' }
];

const formatDateKey = (date) => date.toISOString().slice(0, 10);

const startOfToday = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};

const getRecentDates = (count = 7) => {
  const today = startOfToday();
  return Array.from({ length: count }, (_, index) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (count - 1 - index));
    return d;
  });
};

const scoreIntensity = (value) => {
  const intensity = Number(value);
  if (Number.isNaN(intensity) || intensity < 1 || intensity > 5) {
    return 0;
  }
  return intensity;
};

const normalizeHabit = (rawHabit, index) => {
  const safeName = String(rawHabit?.name ?? `Habit ${index + 1}`).trim() || `Habit ${index + 1}`;
  const safePoints = Math.max(1, Number(rawHabit?.points) || 1);
  const entries = Object.entries(rawHabit?.entries ?? {}).reduce((acc, [date, value]) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      if (value === true) {
        acc[date] = 1;
      } else if (value === false) {
        acc[date] = 0;
      } else {
        const safe = scoreIntensity(value);
        if (safe >= 0) {
          acc[date] = safe;
        }
      }
    }
    return acc;
  }, {});

  return {
    id: rawHabit?.id || crypto.randomUUID(),
    name: safeName,
    points: safePoints,
    entries
  };
};

const loadHabits = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(normalizeHabit);
  } catch {
    return [];
  }
};

const computeStreak = (entries) => {
  const today = startOfToday();
  let streak = 0;

  for (let offset = 0; offset < 3650; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = formatDateKey(date);
    if (scoreIntensity(entries?.[key]) > 0) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
};

const getIndicatorClass = (value) => {
  const intensity = scoreIntensity(value);
  if (intensity === 0) {
    return 'bg-rose-500/80 text-white';
  }
  if (intensity >= 1) {
    return 'bg-emerald-500/80 text-white';
  }
  return 'bg-slate-700/50 text-slate-300';
};

const App = () => {
  const weekDates = useMemo(() => getRecentDates(7), []);
  const [habits, setHabits] = useState(loadHabits);
  const [habitName, setHabitName] = useState('');
  const [habitPoints, setHabitPoints] = useState(10);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  }, [habits]);

  const addHabit = (event) => {
    event.preventDefault();
    const name = habitName.trim();
    const points = Math.max(1, Number(habitPoints) || 1);

    if (!name) {
      return;
    }

    setHabits((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name,
        points,
        entries: {}
      }
    ]);

    setHabitName('');
    setHabitPoints(10);
  };

  const updateIntensity = (habitId, dateKey, value) => {
    const intensity = Number(value);

    setHabits((current) =>
      current.map((habit) => {
        if (habit.id !== habitId) {
          return habit;
        }

        return {
          ...habit,
          entries: {
            ...habit.entries,
            [dateKey]: Number.isNaN(intensity) ? 0 : Math.max(0, Math.min(5, intensity))
          }
        };
      })
    );
  };

  const removeHabit = (habitId) => {
    setHabits((current) => current.filter((habit) => habit.id !== habitId));
  };

  const totals = useMemo(() => {
    const perHabit = habits.map((habit) => {
      const streak = computeStreak(habit.entries);
      const weeklyScore = weekDates.reduce((sum, date) => {
        const key = formatDateKey(date);
        return sum + scoreIntensity(habit.entries?.[key]) * habit.points;
      }, 0);
      const lifetimeScore = Object.values(habit.entries).reduce(
        (sum, value) => sum + scoreIntensity(value) * habit.points,
        0
      );
      const badges = BADGE_LEVELS.filter((badge) => streak >= badge.days);

      return {
        id: habit.id,
        streak,
        weeklyScore,
        lifetimeScore,
        badges
      };
    });

    const totalScore = perHabit.reduce((sum, item) => sum + item.lifetimeScore, 0);

    return {
      perHabit,
      totalScore
    };
  }, [habits, weekDates]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-700 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
        <header className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-glow backdrop-blur">
          <h1 className="text-3xl font-bold md:text-4xl">Habit Tracker</h1>
          <p className="mt-2 text-sm text-slate-100/85 md:text-base">
            Track daily habits with intensity (1–5), streaks, badges, and points. Data is saved in your browser.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900/40 px-4 py-2 text-sm font-semibold">
            <span>Total Score</span>
            <span className="rounded-lg bg-emerald-500 px-2 py-1 text-emerald-50">{totals.totalScore}</span>
          </div>
        </header>

        <section className="rounded-2xl border border-white/20 bg-slate-900/30 p-5 backdrop-blur">
          <h2 className="text-xl font-semibold">Add a Daily Habit</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr_auto]" onSubmit={addHabit}>
            <label className="flex flex-col gap-1 text-sm">
              Habit Name
              <input
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-base text-white placeholder:text-slate-300 focus:border-indigo-300 focus:outline-none"
                value={habitName}
                onChange={(event) => setHabitName(event.target.value)}
                placeholder="Example: Read 20 minutes"
                maxLength={60}
                required
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Points per intensity
              <input
                type="number"
                min="1"
                max="200"
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-base text-white focus:border-indigo-300 focus:outline-none"
                value={habitPoints}
                onChange={(event) => setHabitPoints(event.target.value)}
              />
            </label>

            <button
              type="submit"
              className="self-end rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400"
            >
              Add Habit
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/20 bg-slate-900/30 backdrop-blur">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-slate-900/40 text-xs uppercase tracking-wide text-slate-200/90">
                <tr>
                  <th className="px-4 py-3">Habit</th>
                  {weekDates.map((date) => {
                    const key = formatDateKey(date);
                    return (
                      <th key={key} className="px-3 py-3 text-center">
                        <div>{date.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                        <div className="text-[11px] normal-case text-slate-300">{date.toLocaleDateString()}</div>
                      </th>
                    );
                  })}
                  <th className="px-4 py-3 text-center">Streak</th>
                  <th className="px-4 py-3 text-center">Badges</th>
                  <th className="px-4 py-3 text-center">Weekly pts</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {habits.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-slate-200/80">
                      No habits yet. Add your first habit above.
                    </td>
                  </tr>
                ) : (
                  habits.map((habit) => {
                    const stats = totals.perHabit.find((item) => item.id === habit.id);

                    return (
                      <tr key={habit.id} className="border-t border-white/10">
                        <td className="px-4 py-4 align-top">
                          <div className="font-semibold">{habit.name}</div>
                          <div className="text-xs text-slate-300">{habit.points} pts × intensity</div>
                        </td>

                        {weekDates.map((date) => {
                          const key = formatDateKey(date);
                          const value = habit.entries?.[key];
                          const indicatorClass = getIndicatorClass(value);
                          return (
                            <td key={key} className="px-2 py-4 text-center align-top">
                              <div className="mx-auto flex max-w-[90px] flex-col items-center gap-1">
                                <span className={`inline-flex min-w-10 justify-center rounded-md px-2 py-1 text-xs font-semibold ${indicatorClass}`}>
                                  {scoreIntensity(value) > 0 ? `Lv ${scoreIntensity(value)}` : value === 0 ? '0' : '—'}
                                </span>
                                <select
                                  className="w-full rounded-md border border-white/20 bg-slate-800/80 px-1 py-1 text-xs text-white"
                                  value={Number.isFinite(value) ? value : ''}
                                  onChange={(event) => updateIntensity(habit.id, key, event.target.value)}
                                  aria-label={`Intensity for ${habit.name} on ${key}`}
                                >
                                  <option value="">—</option>
                                  <option value="0">0</option>
                                  <option value="1">1</option>
                                  <option value="2">2</option>
                                  <option value="3">3</option>
                                  <option value="4">4</option>
                                  <option value="5">5</option>
                                </select>
                              </div>
                            </td>
                          );
                        })}

                        <td className="px-4 py-4 text-center align-top">
                          <span className="rounded-lg bg-indigo-500/70 px-2 py-1 font-semibold">{stats?.streak ?? 0} days</span>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex max-w-[200px] flex-wrap justify-center gap-1">
                            {stats?.badges?.length ? (
                              stats.badges.map((badge) => (
                                <span key={badge.days} className="rounded-full bg-amber-400/90 px-2 py-1 text-[11px] font-semibold text-amber-950">
                                  {badge.label}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-300">No badge yet</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center align-top">
                          <span className="rounded-lg bg-emerald-500/80 px-2 py-1 font-semibold text-emerald-50">
                            {stats?.weeklyScore ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center align-top">
                          <button
                            className="rounded-lg bg-rose-500/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-400"
                            type="button"
                            onClick={() => removeHabit(habit.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default App;

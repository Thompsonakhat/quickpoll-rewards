import React, { useEffect, useMemo, useState } from "react";

const POLL_TYPES = [
  { value: "normal", label: "Normal Poll" },
  { value: "quiz", label: "Quiz" },
  { value: "prediction", label: "Prediction" }
];

function getTg() {
  return window?.Telegram?.WebApp;
}

function themeValue(name, fallback) {
  return document.documentElement.style.getPropertyValue(name) || fallback;
}

function applyTheme(tg) {
  const p = tg?.themeParams || {};
  const bg = p.bg_color || "#08111f";
  const text = p.text_color || "#f3f7fb";
  const hint = p.hint_color || "#8da1bb";
  const accent = p.button_color || "#229ED9";
  document.documentElement.style.setProperty("--bg", bg);
  document.documentElement.style.setProperty("--text", text);
  document.documentElement.style.setProperty("--muted", hint);
  document.documentElement.style.setProperty("--accent", accent);
  document.body.style.backgroundColor = bg;
  document.body.style.color = text;
}

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function Card({ children, className = "" }) {
  return (
    <div
      className={classNames("rounded-[24px] border p-4 shadow-glow", className)}
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      {children}
    </div>
  );
}

function Metric({ label, value, tone = "accent" }) {
  return (
    <div className="rounded-2xl border p-4" style={{ background: "var(--card-2)", borderColor: "var(--border)" }}>
      <div className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="mt-2 text-2xl font-semibold" style={{ color: tone === "accent" ? "var(--text)" : tone }}>{value}</div>
    </div>
  );
}

function Button({ children, onClick, variant = "primary", disabled = false, className = "", type = "button" }) {
  const style = variant === "primary"
    ? { background: "var(--accent)", color: "white" }
    : variant === "ghost"
      ? { background: "var(--accent-soft)", color: "var(--text)" }
      : { background: "transparent", border: `1px solid ${themeValue("--border", "rgba(255,255,255,0.08)")}`, color: "var(--text)" };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={classNames("min-h-[48px] rounded-2xl px-4 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-50", className)}
      style={style}
    >
      {children}
    </button>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className="min-h-[48px] w-full rounded-2xl border px-4 text-sm outline-none"
      style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border)", color: "var(--text)" }}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className="min-h-[48px] w-full rounded-2xl border px-4 text-sm outline-none"
      style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border)", color: "var(--text)" }}
    />
  );
}

function formatDate(value) {
  if (!value) return "No end time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No end time";
  return date.toLocaleString();
}

function rewardStatusSummary(rewards = []) {
  return rewards.reduce((acc, item) => {
    if (item.status === "pending") acc.pending += Number(item.points || 0);
    if (item.status === "claimed") acc.claimed += Number(item.points || 0);
    return acc;
  }, { pending: 0, claimed: 0 });
}

export default function App() {
  const tg = useMemo(() => getTg(), []);
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [polls, setPolls] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [rewardsData, setRewardsData] = useState({ completedPolls: [], rewards: [] });
  const [adminStats, setAdminStats] = useState(null);
  const [submitState, setSubmitState] = useState("");
  const [voteState, setVoteState] = useState({});
  const [form, setForm] = useState({
    question: "",
    pollType: "normal",
    rewardPoints: 5,
    endTime: "",
    correctOptionId: "",
    options: ["", ""]
  });

  const initData = tg?.initData || "";
  const unsafeUser = tg?.initDataUnsafe?.user || null;
  const currentPage = new URLSearchParams(window.location.search).get("page") || "home";

  useEffect(() => {
    if (!tg) return;
    try {
      tg.ready();
      tg.expand();
      tg.disableVerticalSwipes?.();
      applyTheme(tg);
      tg.onEvent?.("themeChanged", () => applyTheme(tg));
    } catch {}
  }, [tg]);

  useEffect(() => {
    setPage(currentPage);
  }, [currentPage]);

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      "x-telegram-init-data": initData,
      ...(options.headers || {})
    };

    const body = options.body ? JSON.stringify({ ...options.body, user: unsafeUser }) : undefined;
    const response = await fetch(path, {
      method: options.method || "GET",
      headers,
      body
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.ok === false) {
      throw new Error(json.error || "Request failed");
    }
    return json;
  }

  async function bootstrap() {
    setLoading(true);
    setError("");
    try {
      const auth = await api("/api/auth/telegram", { method: "POST", body: { initData } });
      setUser(auth.user || unsafeUser);
      const telegramId = auth.user?.telegramId || unsafeUser?.id;
      const [pollsRes, leaderboardRes, rewardsRes] = await Promise.all([
        api("/api/polls?activeOnly=1"),
        api("/api/leaderboard?limit=10"),
        telegramId ? api(`/api/rewards?telegramId=${encodeURIComponent(telegramId)}`) : Promise.resolve({ completedPolls: [], rewards: [], user: null })
      ]);

      setPolls(pollsRes.polls || []);
      setLeaderboard(leaderboardRes.leaderboard || []);
      setRewardsData({
        completedPolls: rewardsRes.completedPolls || [],
        rewards: rewardsRes.rewards || [],
        user: rewardsRes.user || auth.user
      });

      if ((auth.user || unsafeUser)?.isAdmin) {
        const adminRes = await api(`/api/admin/stats?telegramId=${encodeURIComponent(telegramId)}`);
        setAdminStats(adminRes.stats || null);
      }
    } catch (err) {
      setUser(unsafeUser);
      setError(err.message || "Unable to load app data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    bootstrap();
  }, []);

  function navigate(nextPage) {
    const url = new URL(window.location.href);
    if (nextPage === "home") url.searchParams.delete("page");
    else url.searchParams.set("page", nextPage);
    window.history.replaceState({}, "", url.toString());
    setPage(nextPage);
  }

  function updateOption(index, value) {
    setForm((prev) => {
      const options = [...prev.options];
      options[index] = value;
      return { ...prev, options };
    });
  }

  function addOption() {
    setForm((prev) => ({ ...prev, options: [...prev.options, ""] }));
  }

  async function handleCreatePoll(event) {
    event.preventDefault();
    setSubmitState("Creating poll...");
    try {
      const payload = {
        question: form.question,
        pollType: form.pollType,
        rewardPoints: Number(form.rewardPoints || 0),
        endTime: form.endTime || null,
        correctOptionId: form.pollType === "quiz" ? form.correctOptionId : "",
        options: form.options.map((text, index) => ({ id: `opt_${index + 1}`, text }))
      };
      const result = await api("/api/polls", { method: "POST", body: payload });
      setSubmitState("Poll created successfully.");
      setForm({ question: "", pollType: "normal", rewardPoints: 5, endTime: "", correctOptionId: "", options: ["", ""] });
      setPolls((prev) => [result.poll, ...prev]);
      navigate("join");
    } catch (err) {
      setSubmitState(err.message || "Could not create poll.");
    }
  }

  async function handleVote(pollId, optionId) {
    setVoteState((prev) => ({ ...prev, [pollId]: "Submitting vote..." }));
    try {
      const result = await api(`/api/polls/${pollId}/vote`, { method: "POST", body: { optionId } });
      const message = result.duplicate
        ? "You already voted in this poll."
        : `Vote submitted. You earned ${result.pointsEarned || 0} points.`;
      setVoteState((prev) => ({ ...prev, [pollId]: message }));
      await bootstrap();
    } catch (err) {
      setVoteState((prev) => ({ ...prev, [pollId]: err.message || "Vote failed." }));
    }
  }

  async function handleClaimRewards() {
    setSubmitState("Claiming rewards...");
    try {
      const result = await api("/api/rewards/claim", { method: "POST", body: {} });
      setRewardsData((prev) => ({ ...prev, rewards: result.rewards || prev.rewards, user: result.user || prev.user }));
      setSubmitState("Rewards claimed for demo successfully.");
      await bootstrap();
    } catch (err) {
      setSubmitState(err.message || "Claim failed.");
    }
  }

  function sharePoll(poll) {
    const text = `Join my QuickPoll Rewards campaign: ${poll.question}`;
    try {
      if (tg?.switchInlineQuery) {
        tg.switchInlineQuery(text, ["users", "groups", "channels"]);
        return;
      }
      if (navigator.share) {
        navigator.share({ title: "QuickPoll Rewards", text });
        return;
      }
      tg?.showAlert?.("Share is available from Telegram mobile.");
    } catch {
      tg?.showAlert?.("Share could not be opened.");
    }
  }

  const currentRewards = rewardsData.user || user || {};
  const rewardTotals = rewardStatusSummary(rewardsData.rewards || []);
  const isAdmin = Boolean((rewardsData.user || user)?.isAdmin);

  return (
    <div className="min-h-screen px-4 pt-4" style={{ paddingBottom: "max(96px, calc(env(safe-area-inset-bottom) + 88px))" }}>
      <div className="mx-auto w-full max-w-[430px] space-y-4 md:max-w-3xl">
        <Card className="overflow-hidden p-0">
          <div className="rounded-[24px] bg-gradient-to-br from-cyan-500/20 via-accent/20 to-blue-900/20 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[26px] font-semibold leading-tight">QuickPoll Rewards</div>
                <p className="mt-2 max-w-[280px] text-sm leading-6" style={{ color: "var(--muted)" }}>
                  Create polls, launch quizzes, vote in community campaigns, and earn points inside Telegram.
                </p>
              </div>
              <div className="rounded-2xl border px-3 py-2 text-right" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.04)" }}>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Points</div>
                <div className="text-lg font-semibold">{currentRewards.pointsBalance || 0}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl border bg-white/5" style={{ borderColor: "var(--border)", backgroundImage: user?.photoUrl ? `url(${user.photoUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }} />
              <div>
                <div className="text-sm font-medium">{user?.firstName || unsafeUser?.first_name || "Telegram user"}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  {user?.username ? `@${user.username}` : unsafeUser?.username ? `@${unsafeUser.username}` : "Connected with Telegram"}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => navigate("create")} className="w-full">Create Poll</Button>
          <Button onClick={() => navigate("join")} variant="ghost" className="w-full">Join Poll</Button>
          <Button onClick={() => navigate("leaderboard")} variant="secondary" className="w-full">Leaderboard</Button>
          <Button onClick={() => navigate("rewards")} variant="secondary" className="w-full">My Rewards</Button>
        </div>

        {error ? (
          <Card>
            <div className="text-sm" style={{ color: "var(--danger)" }}>{error}</div>
          </Card>
        ) : null}

        {loading ? (
          <Card>
            <div className="space-y-3 animate-pulse">
              <div className="h-5 w-1/2 rounded bg-white/10" />
              <div className="h-12 rounded-2xl bg-white/10" />
              <div className="h-12 rounded-2xl bg-white/10" />
            </div>
          </Card>
        ) : (
          <>
            {page === "home" && (
              <div className="space-y-4">
                <Card>
                  <div className="text-lg font-semibold">Launch community campaigns with rewards</div>
                  <div className="mt-2 text-sm leading-6" style={{ color: "var(--muted)" }}>
                    Create a normal poll, run a quiz with a correct answer, or launch a prediction campaign. Users vote once, earn reward points, and climb the leaderboard.
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Active Polls" value={polls.length} />
                  <Metric label="Pending Rewards" value={currentRewards.pendingRewards || 0} />
                  <Metric label="Claimed" value={currentRewards.claimedRewards || 0} />
                  <Metric label="Completed" value={currentRewards.completedPollCount || 0} />
                </div>
              </div>
            )}

            {page === "create" && (
              <Card>
                <div className="text-lg font-semibold">Create Poll</div>
                <div className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Set up a normal poll, quiz, or prediction campaign with optional rewards.</div>
                <form className="mt-4 space-y-3" onSubmit={handleCreatePoll}>
                  <Input value={form.question} onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))} placeholder="Poll question" />
                  <Select value={form.pollType} onChange={(e) => setForm((prev) => ({ ...prev, pollType: e.target.value, correctOptionId: "" }))}>
                    {POLL_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </Select>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="number" min="0" value={form.rewardPoints} onChange={(e) => setForm((prev) => ({ ...prev, rewardPoints: e.target.value }))} placeholder="Reward points" />
                    <Input type="datetime-local" value={form.endTime} onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    {form.options.map((option, index) => (
                      <Input key={index} value={option} onChange={(e) => updateOption(index, e.target.value)} placeholder={`Option ${index + 1}`} />
                    ))}
                    <Button onClick={addOption} variant="secondary" className="w-full">Add Option</Button>
                  </div>
                  {form.pollType === "quiz" && (
                    <Select value={form.correctOptionId} onChange={(e) => setForm((prev) => ({ ...prev, correctOptionId: e.target.value }))}>
                      <option value="">Select correct option</option>
                      {form.options.map((option, index) => (
                        option.trim() ? <option key={index} value={`opt_${index + 1}`}>{option}</option> : null
                      ))}
                    </Select>
                  )}
                  <Button type="submit" className="w-full">Save Poll</Button>
                  {submitState ? <div className="text-sm" style={{ color: "var(--muted)" }}>{submitState}</div> : null}
                </form>
              </Card>
            )}

            {page === "join" && (
              <div className="space-y-3">
                {polls.length === 0 ? (
                  <Card>
                    <div className="text-sm" style={{ color: "var(--muted)" }}>No active polls yet. Create the first campaign to get started.</div>
                  </Card>
                ) : polls.map((poll) => (
                  <Card key={poll.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold">{poll.question}</div>
                        <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                          {poll.pollType} • {poll.rewardPoints || 0} pts • {formatDate(poll.endTime)}
                        </div>
                      </div>
                      <Button onClick={() => sharePoll(poll)} variant="secondary" className="px-3">Share</Button>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {(poll.options || []).map((option) => (
                        <Button key={option.id} onClick={() => handleVote(poll.id, option.id)} variant="secondary" className="w-full text-left">
                          {option.text}
                        </Button>
                      ))}
                    </div>
                    {voteState[poll.id] ? <div className="mt-3 text-sm" style={{ color: "var(--muted)" }}>{voteState[poll.id]}</div> : null}
                  </Card>
                ))}
              </div>
            )}

            {page === "leaderboard" && (
              <div className="space-y-3">
                {leaderboard.length === 0 ? (
                  <Card>
                    <div className="text-sm" style={{ color: "var(--muted)" }}>No rankings yet. Participate in polls to appear here.</div>
                  </Card>
                ) : leaderboard.map((entry) => (
                  <Card key={entry.telegramId} className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">#{entry.rank} {entry.username ? `@${entry.username}` : entry.firstName || "User"}</div>
                      <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Telegram ID: {entry.telegramId}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">{entry.totalPointsEarned || 0}</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>points</div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {page === "rewards" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Balance" value={currentRewards.pointsBalance || 0} />
                  <Metric label="Pending" value={rewardTotals.pending} />
                  <Metric label="Claimed" value={rewardTotals.claimed} />
                  <Metric label="Completed Polls" value={(rewardsData.completedPolls || []).length} />
                </div>
                <Card>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold">My Rewards</div>
                      <div className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Review completed polls and claim demo rewards.</div>
                    </div>
                    <Button onClick={handleClaimRewards}>Claim Reward</Button>
                  </div>
                  {submitState ? <div className="mt-3 text-sm" style={{ color: "var(--muted)" }}>{submitState}</div> : null}
                </Card>
                <Card>
                  <div className="text-sm font-semibold">Completed Polls</div>
                  <div className="mt-3 space-y-3">
                    {(rewardsData.completedPolls || []).length === 0 ? (
                      <div className="text-sm" style={{ color: "var(--muted)" }}>You have not completed any polls yet.</div>
                    ) : rewardsData.completedPolls.map((item) => (
                      <div key={item.id} className="rounded-2xl border p-3" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.02)" }}>
                        <div className="text-sm font-medium">{item.poll?.question || "Poll"}</div>
                        <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Earned {item.awardedPoints || 0} points</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {page === "admin" && (
              isAdmin ? (
                <div className="space-y-4">
                  <Card>
                    <div className="text-lg font-semibold">Admin Dashboard</div>
                    <div className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Track poll, vote, and user totals across the app.</div>
                  </Card>
                  <div className="grid grid-cols-2 gap-3">
                    <Metric label="Total Polls" value={adminStats?.totalPolls || 0} />
                    <Metric label="Total Votes" value={adminStats?.totalVotes || 0} />
                    <Metric label="Total Users" value={adminStats?.totalUsers || 0} />
                    <Metric label="Active Polls" value={adminStats?.activePolls || 0} />
                    <Metric label="Ended Polls" value={adminStats?.endedPolls || 0} />
                  </div>
                </div>
              ) : (
                <Card>
                  <div className="text-sm" style={{ color: "var(--muted)" }}>You are not authorized to view the admin dashboard.</div>
                </Card>
              )
            )}
          </>
        )}

        <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-4 pt-3 backdrop-blur md:static md:px-0 md:pb-0 md:pt-0">
          <div className="mx-auto grid max-w-[430px] grid-cols-5 gap-2 rounded-[24px] border p-2 md:max-w-3xl" style={{ background: "rgba(8,17,31,0.88)", borderColor: "var(--border)" }}>
            {[
              ["home", "Home"],
              ["create", "Create"],
              ["join", "Join"],
              ["leaderboard", "Top"],
              ["rewards", "Rewards"]
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => navigate(value)}
                className="min-h-[44px] rounded-2xl text-xs font-semibold"
                style={{ background: page === value ? "var(--accent-soft)" : "transparent", color: page === value ? "var(--text)" : "var(--muted)" }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

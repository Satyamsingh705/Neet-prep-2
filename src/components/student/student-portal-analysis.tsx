type Analytics = {
  totalSubmitted: number;
  bestScore: number;
  averageScore: number;
  averageAccuracy: number;
  subjectAverages: Array<{
    subject: string;
    averageScore: number;
    averageAccuracy: number;
  }>;
  strongestSubject: { subject: string; averageScore: number; averageAccuracy: number } | null;
  weakestSubject: { subject: string; averageScore: number; averageAccuracy: number } | null;
  recentAttempts: Array<{
    id: string;
    testId: string;
    testName: string;
    testCode: string | null;
    submittedAt: string | null;
    score: number;
    accuracy: number;
  }>;
};

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(centerX: number, centerY: number, radius: number, endAngle: number) {
  const start = polarToCartesian(centerX, centerY, radius, 0);
  const end = polarToCartesian(centerX, centerY, radius, endAngle);
  const largeArcFlag = endAngle > 180 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function buildSparkline(values: number[]) {
  if (values.length === 0) {
    return "";
  }

  const width = 320;
  const height = 120;
  const padding = 12;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  return values
    .map((value, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
      const y = height - padding - ((value - min) * (height - padding * 2)) / range;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function getCoveragePlan(analytics: Analytics) {
  const focusSubjects = analytics.subjectAverages.filter((subject) => subject.averageAccuracy < 70);

  if (focusSubjects.length === 0) {
    return [
      "Maintain momentum with one full mock and one weak-topic revision cycle each week.",
      "Review only the questions you got wrong in the last two tests to protect your current accuracy.",
      "Keep Biology speed sharp with timed 45-minute section drills.",
    ];
  }

  return focusSubjects.slice(0, 3).map((subject) => {
    if (subject.averageAccuracy < 50) {
      return `${subject.subject}: rebuild fundamentals first, then solve a timed mixed set before the next full test.`;
    }

    return `${subject.subject}: focus on error correction and question selection to push accuracy above 70%.`;
  });
}

export function StudentPortalAnalysis(props: {
  totalQuestions: number;
  liveTests: number;
  totalAttempts: number;
  analytics: Analytics;
}) {
  const readinessAngle = Math.max(12, Math.min(359, Math.round((props.analytics.averageAccuracy / 100) * 360)));
  const sparklineValues = [...props.analytics.recentAttempts].reverse().map((attempt) => attempt.score);
  const subjectScoreMax = Math.max(...props.analytics.subjectAverages.map((subject) => subject.averageScore), 1);
  const coveragePlan = getCoveragePlan(props.analytics);

  return (
    <section id="analysis" className="panel overflow-hidden rounded-none border-x-0 sm:rounded-[1.6rem] sm:border-x">
      <div className="grid gap-5 bg-[linear-gradient(135deg,rgba(255,247,239,0.96),rgba(255,255,255,0.96))] px-3 py-5 sm:px-6 sm:py-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8 lg:px-10 lg:py-10">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b56d3d]">Student Portal</p>
            <h2 className="mt-3 max-w-[12ch] text-3xl leading-[1.02] font-semibold text-[#2f241c] sm:text-4xl lg:text-5xl">Full analysis with clear weak-point mapping.</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#65584a] sm:text-lg sm:leading-8">Use this dashboard to see where marks are leaking, which subjects need immediate correction, and what to cover before the next test.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.2rem] border border-[#ead9c9] bg-white/90 p-5">
              <div className="text-sm uppercase tracking-[0.2em] text-[#957660]">Submitted</div>
              <div className="mt-2 text-4xl font-semibold text-[#2f241c]">{props.analytics.totalSubmitted}</div>
              <div className="mt-2 text-sm text-[#6d5a49]">Completed tests used for analysis.</div>
            </div>
            <div className="rounded-[1.2rem] border border-[#ead9c9] bg-white/90 p-5">
              <div className="text-sm uppercase tracking-[0.2em] text-[#957660]">Average Accuracy</div>
              <div className="mt-2 text-4xl font-semibold text-[#d7671b]">{props.analytics.averageAccuracy}%</div>
              <div className="mt-2 text-sm text-[#6d5a49]">Overall conversion from attempts to marks.</div>
            </div>
            <div className="rounded-[1.2rem] border border-[#ead9c9] bg-white/90 p-5">
              <div className="text-sm uppercase tracking-[0.2em] text-[#957660]">Best Score</div>
              <div className="mt-2 text-4xl font-semibold text-[#2f241c]">{props.analytics.bestScore}</div>
              <div className="mt-2 text-sm text-[#6d5a49]">Peak score across your submitted tests.</div>
            </div>
            <div className="rounded-[1.2rem] border border-[#ead9c9] bg-white/90 p-5">
              <div className="text-sm uppercase tracking-[0.2em] text-[#957660]">Questions In Live Tests</div>
              <div className="mt-2 text-4xl font-semibold text-[#2f241c]">{props.totalQuestions}</div>
              <div className="mt-2 text-sm text-[#6d5a49]">Questions currently attached to published student-visible tests.</div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="rounded-[1.3rem] border border-[#ead9c9] bg-white/90 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-[0.2em] text-[#957660]">Weak-Point Diagram</div>
                  <div className="mt-2 text-2xl font-semibold text-[#2f241c]">Subject accuracy and score pressure</div>
                </div>
                <div className="rounded-full bg-[#fff3e6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#b46916]">Live</div>
              </div>
              <div className="mt-5 space-y-4">
                {props.analytics.subjectAverages.length > 0 ? props.analytics.subjectAverages.map((subject) => (
                  <div key={subject.subject} className="rounded-[1rem] border border-[#efe3d6] bg-[#fffdfa] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="font-semibold text-[#2f241c]">{subject.subject}</div>
                      <div className="text-sm text-[#6d5a49]">Score {subject.averageScore} · Accuracy {subject.averageAccuracy}%</div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6a52]">
                          <span>Accuracy</span>
                          <span>{subject.averageAccuracy}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-[#f3e9dc]">
                          <div className="h-3 rounded-full bg-[linear-gradient(90deg,#d85b58,#d7671b)]" style={{ width: `${Math.max(6, subject.averageAccuracy)}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6a52]">
                          <span>Score Output</span>
                          <span>{subject.averageScore}</span>
                        </div>
                        <div className="h-3 rounded-full bg-[#f3e9dc]">
                          <div className="h-3 rounded-full bg-[linear-gradient(90deg,#ffcf9f,#d7671b)]" style={{ width: `${Math.max(6, Math.round((subject.averageScore / subjectScoreMax) * 100))}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[1rem] border border-dashed border-[#d9cfc3] bg-white px-4 py-5 text-sm text-[#736455]">
                    Submit a test to unlock subject-wise diagrams.
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[1.3rem] border border-[#ead9c9] bg-white/90 p-5">
                <div className="text-sm uppercase tracking-[0.2em] text-[#957660]">Readiness Meter</div>
                <div className="relative mt-4 flex items-center justify-center">
                  <svg width="220" height="220" viewBox="0 0 220 220" aria-hidden="true">
                    <circle cx="110" cy="110" r="78" fill="none" stroke="#f0e3d5" strokeWidth="18" />
                    <path d={describeArc(110, 110, 78, readinessAngle)} fill="none" stroke="#d7671b" strokeWidth="18" strokeLinecap="round" />
                  </svg>
                  <div className="pointer-events-none absolute flex flex-col items-center">
                    <div className="text-4xl font-semibold text-[#2f241c]">{props.analytics.averageAccuracy}%</div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a52]">Exam Readiness</div>
                  </div>
                </div>
                <div className="mt-4 rounded-[1rem] bg-[#fff7ef] px-4 py-3 text-sm text-[#6d5a49]">
                  {props.analytics.weakestSubject
                    ? `Biggest drag right now: ${props.analytics.weakestSubject.subject}. Improve that first to lift the whole score curve.`
                    : "Complete at least one submitted test to generate a readiness signal."}
                </div>
              </div>

              <div className="rounded-[1.3rem] border border-[#ead9c9] bg-white/90 p-5">
                <div className="text-sm uppercase tracking-[0.2em] text-[#957660]">Score Trend</div>
                <div className="mt-2 text-2xl font-semibold text-[#2f241c]">Recent performance path</div>
                <div className="mt-4 rounded-[1rem] border border-[#efe3d6] bg-[#fffdfa] p-3">
                  {sparklineValues.length > 0 ? (
                    <svg viewBox="0 0 320 120" className="h-[120px] w-full" aria-hidden="true">
                      <path d={buildSparkline(sparklineValues)} fill="none" stroke="#d7671b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                      {sparklineValues.map((value, index) => {
                        const max = Math.max(...sparklineValues, 1);
                        const min = Math.min(...sparklineValues, 0);
                        const range = Math.max(max - min, 1);
                        const x = 12 + (index * (320 - 24)) / Math.max(sparklineValues.length - 1, 1);
                        const y = 120 - 12 - ((value - min) * (120 - 24)) / range;

                        return <circle key={`${index}-${value}`} cx={x} cy={y} r="5" fill="#fff" stroke="#d7671b" strokeWidth="3" />;
                      })}
                    </svg>
                  ) : (
                    <div className="px-2 py-10 text-center text-sm text-[#736455]">No submitted tests yet.</div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-[#6d5a49]">
                  <span className="rounded-full bg-[#f5f0e8] px-3 py-1">Live Tests {props.liveTests}</span>
                  <span className="rounded-full bg-[#f5f0e8] px-3 py-1">Attempts {props.totalAttempts}</span>
                  <span className="rounded-full bg-[#f5f0e8] px-3 py-1">Avg Score {props.analytics.averageScore}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 self-start">
          <div className="rounded-[1.3rem] border border-[#ead9c9] bg-white/92 p-5">
            <div className="text-sm uppercase tracking-[0.2em] text-[#957660]">What To Cover Next</div>
            <div className="mt-3 space-y-3">
              {coveragePlan.map((item) => (
                <div key={item} className="rounded-[1rem] border border-[#efe3d6] bg-[#fffdfa] px-4 py-3 text-sm leading-7 text-[#5f5246]">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.3rem] border border-[#ead9c9] bg-white/92 p-5">
            <div className="text-sm uppercase tracking-[0.2em] text-[#957660]">Priority Signals</div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-[1rem] bg-[#fff7ef] px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b46916]">Strongest Subject</div>
                <div className="mt-2 text-lg font-semibold text-[#2f241c]">{props.analytics.strongestSubject?.subject ?? "No data yet"}</div>
              </div>
              <div className="rounded-[1rem] bg-[#fff1ef] px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c45b4a]">Weakest Subject</div>
                <div className="mt-2 text-lg font-semibold text-[#2f241c]">{props.analytics.weakestSubject?.subject ?? "No data yet"}</div>
              </div>
              <div className="rounded-[1rem] bg-[#f6f1ff] px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7d57a7]">Improvement Trigger</div>
                <div className="mt-2 text-sm leading-7 text-[#5f5246]">{props.analytics.averageAccuracy < 60 ? "Reduce negative marking by revising elimination and selection discipline before taking another full mock." : "Push accuracy upward by revisiting only incorrectly answered and ignored questions from recent tests."}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.3rem] border border-[#ead9c9] bg-white/92 p-5">
            <div className="text-sm uppercase tracking-[0.2em] text-[#957660]">Latest Tests</div>
            <div className="mt-4 space-y-3">
              {props.analytics.recentAttempts.length > 0 ? props.analytics.recentAttempts.map((attempt) => (
                <div key={attempt.id} className="rounded-[1rem] border border-[#efe3d6] bg-[#fffdfa] px-4 py-3">
                  <div className="font-semibold text-[#2f241c]">{attempt.testName}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6a52]">{attempt.testCode ?? `TST-${attempt.testId.slice(-8).toUpperCase()}`}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-[#65584a]">
                    <span>Score {attempt.score}</span>
                    <span>Accuracy {attempt.accuracy}%</span>
                  </div>
                </div>
              )) : (
                <div className="rounded-[1rem] border border-dashed border-[#d9cfc3] bg-white px-4 py-5 text-sm text-[#736455]">Your latest submitted tests will appear here.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

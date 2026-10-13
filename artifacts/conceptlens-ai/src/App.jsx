import { useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Route, Switch, Link, useLocation, useRoute } from 'wouter';
import {
  ArrowDownRight, ArrowLeft, ArrowRight, BarChart3, BookOpen, BrainCircuit, Check,
  CheckCircle2, ChevronRight, CircleHelp, Clock3, Compass, GraduationCap, Lightbulb,
  Menu, MoveUpRight, RefreshCw, ShieldCheck, Sparkles, Target, TrendingUp,
  Users, X, AlertCircle, Languages, ChevronDown,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  BarChart, Bar, Cell,
} from 'recharts';
import {
  useListQuestions, useSubmitAssessment, useGetAssessment, useGetRecovery,
  useSubmitReassessment, useGetStudentDashboard, useGetTeacherDashboard,
  getGetAssessmentQueryKey, getGetRecoveryQueryKey, getGetStudentDashboardQueryKey,
  getGetTeacherDashboardQueryKey, getListQuestionsQueryKey,
} from './services/api';
import NotFound from './pages/not-found';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } });
const IconMark = ({ small = false }) => <span className={`brand-mark ${small ? 'brand-mark-sm' : ''}`}><BrainCircuit size={small ? 16 : 19} strokeWidth={2.2}/></span>;

function Header() {
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);
  const links = [{href:'/student',label:'Student hub'}, {href:'/teacher',label:'For teachers'}];
  return <header className="site-header">
    <div className="header-inner">
      <Link href="/" className="brand" data-testid="link-home"><IconMark/><span>concept<span className="brand-lens">lens</span><sup> AI</sup></span></Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        {links.map(l=><Link key={l.href} href={l.href} className={`nav-link ${loc===l.href?'nav-active':''}`} data-testid={`link-${l.href.slice(1)}`}>{l.label}</Link>)}
        <Link href="/assessment" className="button button-primary button-nav" data-testid="link-start-diagnostic">Start a diagnostic <ArrowRight size={15}/></Link>
      </nav>
      <button className="mobile-menu" aria-label="Toggle navigation" onClick={()=>setOpen(!open)} data-testid="button-mobile-menu">{open?<X size={20}/>:<Menu size={20}/>}</button>
    </div>
    {open && <div className="mobile-nav">{links.map(l=><Link key={l.href} href={l.href} onClick={()=>setOpen(false)}>{l.label}</Link>)}<Link href="/assessment" onClick={()=>setOpen(false)} className="button button-primary">Start a diagnostic <ArrowRight size={15}/></Link></div>}
  </header>;
}

function Shell({ children, eyebrow }) {
  return <div className="app-shell"><Header/><main className="page-wrap">{eyebrow && <div className="page-eyebrow"><span className="eyebrow-dot"/>{eyebrow}</div>}{children}</main><footer className="site-footer"><div className="footer-inner"><Link href="/" className="brand"><IconMark small/><span>concept<span className="brand-lens">lens</span><sup> AI</sup></span></Link><span>Clear thinking starts with the right question.</span><span>Built for every learner.</span></div></footer></div>;
}

function Loading({ label='Getting your learning space ready' }) {
  return <div className="status-panel" role="status"><div className="skeleton skeleton-title"/><div className="skeleton skeleton-line"/><div className="skeleton skeleton-line short"/><span className="status-caption">{label}</span></div>;
}
function ErrorState({ error, retry }) {
  return <div className="state-card error-state"><span className="state-icon error-icon"><AlertCircle size={21}/></span><h3>We couldn't reach the learning service</h3><p>{error?.message || 'Check your connection, then try again.'}</p><button className="button button-secondary" onClick={retry}><RefreshCw size={15}/> Try again</button></div>;
}
function EmptyState({ title='Your next insight starts here', children, action }) {
  return <div className="state-card empty-state"><span className="state-icon"><Compass size={21}/></span><h3>{title}</h3><p>{children}</p>{action}</div>;
}
function PageTitle({ kicker, title, sub, aside }) {
  return <div className="page-title-row"><div><div className="section-kicker">{kicker}</div><h1 className="page-title font-display">{title}</h1>{sub&&<p className="page-subtitle">{sub}</p>}</div>{aside}</div>;
}
function ProgressBar({ value, color='green' }) { return <div className={`progress-track ${color}`}><span className="progress-fill" style={{width:`${Math.max(0,Math.min(100,value||0))}%`}}/></div>; }

function Landing() {
  return <div className="app-shell landing">
    <Header/>
    <main>
      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-copy reveal">
            <div className="hero-kicker"><span className="sparkle-dot"><Sparkles size={13}/></span> A clearer way to learn mathematics</div>
            <h1 className="font-display">Wrong answers<br/>have <em>reasons.</em></h1>
            <p className="hero-usp">Don't just find the wrong answer. Find the reason behind it.</p>
            <p className="hero-desc">ConceptLens looks beneath the answer to uncover the idea that got tangled—then helps students rebuild it, one clear step at a time.</p>
            <div className="hero-actions"><Link href="/assessment" className="button button-primary button-large" data-testid="button-begin-diagnostic">Begin a diagnostic <ArrowRight size={18}/></Link><Link href="/student" className="text-link" data-testid="link-explore-dashboard">Explore student hub <MoveUpRight size={15}/></Link></div>
            <div className="hero-proof"><span className="avatar-stack"><b>J</b><b>M</b><b>A</b></span><span>Designed for curious students<br/><strong>and the teachers who guide them</strong></span></div>
          </div>
          <div className="hero-visual reveal-delay" aria-label="Example of concept diagnosis">
            <div className="visual-orbit orbit-one"/><div className="visual-orbit orbit-two"/>
            <div className="lens-card">
              <div className="lens-card-top"><span className="mini-label"><span className="live-dot"/> CONCEPT SNAPSHOT</span><span className="dots">•••</span></div>
              <div className="math-question"><span className="math-label">YOUR ANSWER</span><div className="equation">½ + ⅓ <span>=</span> <b className="wrong">⅖</b></div></div>
              <div className="diagnosis-line"><span className="diagnosis-icon"><BrainCircuit size={17}/></span><div><b>We found the hidden idea</b><small>Added numerators and denominators directly</small></div><ChevronRight size={16}/></div>
              <div className="lens-bottom"><span className="tiny-bars"><i/><i/><i/><i/><i/></span><span>Concept clarity</span><b>Building</b></div>
            </div>
            <div className="floating-note note-a"><span className="note-icon"><Lightbulb size={16}/></span><span><b>Not a score.</b><small>A starting point.</small></span></div>
            <div className="floating-note note-b"><span className="note-check"><Check size={15}/></span><span><b>Targeted recovery</b><small>In your language</small></span></div>
            <div className="visual-caption">From answer → understanding <ArrowDownRight size={14}/></div>
          </div>
        </div>
        <div className="hero-bottom"><span>LEARNING THAT LOOKS CLOSER</span><span className="bottom-rule"/><span>FIND THE GAP · REPAIR THE IDEA · CHECK THE GROWTH</span></div>
      </section>
      <section className="section section-how" id="how">
        <div className="section-head"><div><div className="section-kicker">A more human diagnosis</div><h2 className="font-display">The answer is only<br/><em>the beginning.</em></h2></div><p>Every mistake carries a clue. We turn that clue into a practical next step—without turning learning into a label.</p></div>
        <div className="steps-row">
          {[{n:'01',icon:<Target/>,title:'See the thinking',copy:'A short diagnostic reveals patterns in the way a student approaches a concept.'},{n:'02',icon:<BrainCircuit/>,title:'Name the root cause',copy:'Clear feedback identifies the misconception or prerequisite gap—not just what was missed.'},{n:'03',icon:<TrendingUp/>,title:'Build it back',copy:'A tailored explanation, worked example, and fresh question put understanding to the test.'}].map((s,i)=><article className="step-card" key={s.n}><div className="step-top"><span>{s.n}</span><span className="step-icon">{s.icon}</span></div><h3>{s.title}</h3><p>{s.copy}</p><span className="step-connector">{i<2&&<ArrowRight size={15}/>}</span></article>)}
        </div>
      </section>
      <section className="section insight-section">
        <div className="insight-art"><div className="art-rings"><div className="art-center"><span>½</span><span>+</span><span>⅓</span></div><div className="art-orbit-label label-top">COMMON DENOMINATOR</div><div className="art-orbit-label label-right">2/6 + 2/6</div><div className="art-orbit-label label-bottom">5/6</div></div></div>
        <div className="insight-copy"><div className="section-kicker">A small example. A big difference.</div><h2 className="font-display">“I added the tops<br/>and the bottoms.”</h2><p>For <strong>½ + ⅓ = ⅖</strong>, the arithmetic is consistent. The mental model isn't. ConceptLens spots direct numerator-and-denominator addition, then shows why equal-sized parts matter.</p><div className="insight-quote"><span className="quote-mark">“</span><span>We don't tell a student they're wrong.<br/><b>We show them what to try next.</b></span></div><Link href="/assessment" className="text-link" data-testid="link-try-fraction-diagnostic">Try the fraction diagnostic <ArrowRight size={15}/></Link></div>
      </section>
      <section className="section audience-section">
        <div className="section-head audience-head"><div><div className="section-kicker">One clearer picture</div><h2 className="font-display">Different seats.<br/><em>Same progress.</em></h2></div><p>Useful enough for a student working alone. Insightful enough for a teacher planning the next lesson.</p></div>
        <div className="audience-grid">
          <article className="audience-card student-audience"><div className="audience-icon"><GraduationCap size={21}/></div><div className="audience-label">FOR STUDENTS</div><h3>Know what to work on next.</h3><p>See concept mastery, follow recovery in English, Hindi, or Marathi, and watch your understanding grow.</p><Link href="/student" className="button button-dark" data-testid="button-student-dashboard">Open student hub <ArrowRight size={15}/></Link><div className="audience-decoration"><div className="mini-chart"><i/><i/><i/><i/><i/><i/></div><span>your progress, in focus</span></div></article>
          <article className="audience-card teacher-audience"><div className="audience-icon"><Users size={21}/></div><div className="audience-label">FOR TEACHERS</div><h3>See the class behind the average.</h3><p>Find shared misconceptions, identify students needing support, and turn analytics into timely intervention.</p><Link href="/teacher" className="button button-outline" data-testid="button-teacher-analytics">Explore class insights <ArrowRight size={15}/></Link><div className="teacher-decoration"><span>CLASS PULSE</span><b>Concepts first,<br/>scores second.</b></div></article>
        </div>
      </section>
      <section className="closing-cta"><div className="closing-glow"/><span className="closing-icon"><BookOpen size={20}/></span><div><div className="section-kicker">Start with one question</div><h2 className="font-display">Make the next step<br/>make sense.</h2></div><Link href="/assessment" className="button button-warm button-large" data-testid="button-start-assessment-bottom">Start a diagnostic <ArrowRight size={17}/></Link></section>
    </main><footer className="site-footer"><div className="footer-inner"><Link href="/" className="brand"><IconMark small/><span>concept<span className="brand-lens">lens</span><sup> AI</sup></span></Link><span>Clear thinking starts with the right question.</span><span>Built for every learner.</span></div></footer>
  </div>;
}

function StudentDashboard() {
  const q = useGetStudentDashboard();
  const data = q.data;
  if(q.isLoading) return <Shell eyebrow="STUDENT SPACE"><Loading label="Loading your mastery snapshot"/></Shell>;
  if(q.isError) return <Shell eyebrow="STUDENT SPACE"><ErrorState error={q.error} retry={()=>q.refetch()}/></Shell>;
  if(!data) return <Shell eyebrow="STUDENT SPACE"><EmptyState title="No learning snapshot yet" action={<Link href="/assessment" className="button button-primary">Take your first diagnostic <ArrowRight size={15}/></Link>}>Your first diagnostic gives ConceptLens a place to begin.</EmptyState></Shell>;
  const chartData=(data.concept_mastery||[]).map((c,i)=>({week:['Mon','Tue','Wed','Thu','Fri','Sat'][i%6], mastery:c.score, concept:c.concept}));
  return <Shell eyebrow="STUDENT SPACE">
    <PageTitle kicker="YOUR LEARNING, IN FOCUS" title={`Good to see you, ${data.student_name}.`} sub="A clear picture of what’s clicking—and what to try next." aside={<Link href="/assessment" className="button button-primary" data-testid="button-new-diagnostic"><Target size={16}/> New diagnostic</Link>}/>
    <div className="dashboard-grid">
      <section className="mastery-feature surface"><div className="feature-overline"><span className="status-pill"><span className="live-dot"/> YOUR CURRENT PICTURE</span><span className="quiet-small">{data.recent_assessment||'Learning overview'}</span></div><div className="mastery-flex"><div><div className="mastery-number">{Math.round(data.overall_mastery)}<small>%</small></div><h2>Overall mastery</h2><p>Concept clarity is built through practice.</p></div><div className="mastery-ring" style={{'--score':`${data.overall_mastery||0}%`}}><div><strong>{Math.round(data.overall_mastery)}%</strong><span>MASTERY</span></div></div></div><div className="mastery-footer"><span><CheckCircle2 size={15}/> {data.concepts_mastered} concepts feeling strong</span><span><CircleHelp size={15}/> {data.concepts_needing_attention} to revisit</span></div></section>
      <section className="quick-stat surface"><div className="stat-icon amber"><TrendingUp size={18}/></div><span className="section-kicker">LEARNING MOMENTUM</span><strong>{Math.round(data.learning_progress)}<small>%</small></strong><p>Progress across your learning journey</p><div className="stat-foot"><span className="stat-trend"><ArrowDownRight size={14}/> Keep building</span><span>One step at a time</span></div></section>
      <section className="concept-panel surface"><div className="panel-heading"><div><div className="section-kicker">CONCEPT BY CONCEPT</div><h2>Where things stand</h2></div><span className="soft-counter">{data.concept_mastery?.length||0} concepts</span></div>{data.concept_mastery?.length? <div className="concept-list">{data.concept_mastery.map((c,i)=><div className="concept-row" key={`${c.concept}-${i}`}><div className="concept-row-top"><span className="concept-dot" style={{background:c.needs_attention?'#D9933D':'#3E8870'}}/><strong>{c.concept}</strong><span className={`mastery-tag ${c.needs_attention?'needs-tag':''}`}>{c.needs_attention?'Revisit':'On track'}</span><b>{Math.round(c.score)}%</b></div><ProgressBar value={c.score} color={c.needs_attention?'amber':'green'}/></div>)}</div>:<EmptyState title="No concept data yet" action={<Link className="text-link" href="/assessment">Start with a diagnostic <ArrowRight size={15}/></Link>}>Take a diagnostic to see your concept-by-concept progress.</EmptyState>}</section>
      <section className="progress-panel surface"><div className="panel-heading"><div><div className="section-kicker">YOUR PRACTICE</div><h2>Progress over concepts</h2></div><span className="chart-legend"><i/> Mastery</span></div>{chartData.length?<div className="chart-wrap"><ResponsiveContainer width="100%" height={225}><AreaChart data={chartData} margin={{top:15,right:8,left:-25,bottom:0}}><defs><linearGradient id="masteryFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#397B66" stopOpacity={.21}/><stop offset="95%" stopColor="#397B66" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#e9e8df" vertical={false}/><XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fill:'#92958b',fontSize:11}}/><YAxis domain={[0,100]} axisLine={false} tickLine={false} tick={{fill:'#92958b',fontSize:11}}/><Tooltip contentStyle={{border:'1px solid #e3e3d9',borderRadius:12,fontSize:12}}/><Area type="monotone" dataKey="mastery" stroke="#367b65" strokeWidth={2.5} fill="url(#masteryFill)" activeDot={{r:5,fill:'#367b65'}}/></AreaChart></ResponsiveContainer></div>:<EmptyState title="Progress appears as you learn">Complete a diagnostic to begin tracking your momentum.</EmptyState>}</section>
      <section className="recovery-card"><div className="recovery-card-copy"><div className="section-kicker">A GOOD NEXT STEP</div><h2 className="font-display">Start with what<br/>needs a little care.</h2><p>{data.recommended_recovery||'Review a concept with a short, targeted learning path.'}</p><Link href="/assessment" className="button button-warm" data-testid="button-recommended-recovery">Explore your recovery <ArrowRight size={15}/></Link></div><div className="recovery-graphic"><div className="graphic-circle circle-outer"/><div className="graphic-circle circle-mid"/><div className="graphic-core"><Lightbulb size={28}/></div><span className="graphic-spark spark-one"/><span className="graphic-spark spark-two"/></div></section>
    </div>
  </Shell>;
}

function Assessment() {
  const q=useListQuestions();
  const submit=useSubmitAssessment();
  const qc=useQueryClient();
  const [,go]=useLocation();
  const [name,setName]=useState('');
  const [answers,setAnswers]=useState({});
  const questions=[...(q.data||[])].sort((a,b)=>a.order-b.order);
  const complete=questions.length===5 && questions.every(item=>answers[item.id]);
  const send=()=>{
    if(!complete||!name.trim()) return;
    submit.mutate({data:{student_name:name.trim(),answers:questions.map(item=>({question_id:item.id,answer:answers[item.id]}))}},{onSuccess:(result)=>{qc.invalidateQueries({queryKey:getGetStudentDashboardQueryKey()});qc.invalidateQueries({queryKey:getListQuestionsQueryKey()});go(`/analysis/${encodeURIComponent(result.assessment_id)}`);}});
  };
  if(q.isLoading) return <Shell eyebrow="DIAGNOSTIC"><Loading label="Preparing five thoughtful questions"/></Shell>;
  if(q.isError) return <Shell eyebrow="DIAGNOSTIC"><ErrorState error={q.error} retry={()=>q.refetch()}/></Shell>;
  return <Shell eyebrow="FIVE QUESTIONS · NO TIMER">
    <div className="assessment-wrap"><PageTitle kicker="A SNAPSHOT, NOT A SCORE" title="Let's find your next step." sub="Answer how you really think. Your reasoning is what helps us help you." aside={<div className="assessment-progress-badge"><Clock3 size={15}/> About 3 minutes</div>}/>
      <div className="assessment-intro surface"><div className="intro-icon"><ShieldCheck size={20}/></div><div><b>A safe place to get curious.</b><span>There are no grades here. ConceptLens uses your answers to understand how you’re thinking.</span></div></div>
      <label className="name-field"><span>Your name</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="What should we call you?" data-testid="input-student-name"/></label>
      {questions.length===0?<EmptyState title="Questions are taking a moment" action={<button onClick={()=>q.refetch()} className="button button-secondary">Reload questions</button>}>We couldn't find diagnostic questions right now.</EmptyState>:questions.map((item,index)=><section className="question-card surface" key={item.id}><div className="question-top"><span className="question-number">0{index+1}</span><span className="question-concept">{item.concept}</span><span className="question-progress">{index+1} of 5</span></div><h2>{item.prompt}</h2><div className="answer-options">{item.options.map((option,i)=><button key={option} onClick={()=>setAnswers({...answers,[item.id]:option})} className={`answer-option ${answers[item.id]===option?'selected':''}`} data-testid={`answer-${index+1}-${i+1}`}><span className="option-letter">{String.fromCharCode(65+i)}</span><span>{option}</span>{answers[item.id]===option&&<CheckCircle2 className="option-check" size={18}/>}</button>)}</div></section>)}
      {submit.isError&&<div className="inline-error" role="alert"><AlertCircle size={16}/>{submit.error?.message||'Your answers could not be submitted. Please try again.'}</div>}
      <div className="assessment-submit"><div><span className="submit-counter">{Object.keys(answers).length} / 5 answered</span><ProgressBar value={Object.keys(answers).length*20}/></div><button onClick={send} disabled={!complete||!name.trim()||submit.isPending} className="button button-primary button-large" data-testid="button-submit-assessment">{submit.isPending?'Reading your thinking…':'See what your answers reveal'} {submit.isPending?<span className="button-pulse"/>:<ArrowRight size={17}/>}</button></div>
    </div>
  </Shell>;
}

function Analysis() {
  const [,params]=useRoute('/analysis/:assessmentId');
  const id=params?.assessmentId||'';
  const q=useGetAssessment(id,{query:{enabled:!!id,queryKey:getGetAssessmentQueryKey(id)}});
  if(q.isLoading)return <Shell eyebrow="YOUR LEARNING ANALYSIS"><Loading label="Looking beneath the answers"/></Shell>;
  if(q.isError)return <Shell eyebrow="YOUR LEARNING ANALYSIS"><ErrorState error={q.error} retry={()=>q.refetch()}/></Shell>;
  const assessment=q.data, focus=assessment?.focus_result;
  if(!focus)return <Shell eyebrow="YOUR LEARNING ANALYSIS"><EmptyState title="We couldn't find that analysis" action={<Link href="/assessment" className="button button-primary">Take a new diagnostic</Link>}>Try a new diagnostic and we'll build a fresh learning picture.</EmptyState></Shell>;
  return <Shell eyebrow="YOUR LEARNING ANALYSIS">
    <div className="analysis-wrap"><Link href="/student" className="back-link"><ArrowLeft size={15}/> Student hub</Link><div className="analysis-hero"><div><div className="section-kicker">A REASON TO BUILD ON</div><h1 className="font-display">Here's what your<br/><em>thinking tells us.</em></h1><p>Hi {assessment.student_name}, this is a map—not a mark. Let's look at one idea together.</p></div><div className="score-seal"><span>DIAGNOSTIC</span><strong>{assessment.score}<small>/{assessment.total}</small></strong><span>answers aligned</span></div></div>
      <div className="analysis-columns"><div className="analysis-main">
        <section className="diagnosis-card"><div className="diagnosis-card-header"><span className="diagnosis-icon large"><BrainCircuit size={21}/></span><div><div className="section-kicker">THE CONCEPT TO UNPACK</div><h2>{focus.concept}</h2></div><span className="focus-number">01</span></div>
          <div className="answer-compare"><div><span>YOUR ANSWER</span><b className="answer-wrong">{focus.selected_answer}</b></div><ArrowRight size={17}/><div><span>ONE WAY TO SEE IT</span><b>{focus.correct_answer}</b></div></div>
          {focus.misconception&&<div className="insight-callout"><span className="callout-mark"><Lightbulb size={18}/></span><div><b>The pattern we noticed</b><p>{focus.misconception}</p></div></div>}
          <div className="root-detail"><div className="root-label"><span className="root-dot"/> WHY IT HAPPENED</div><p>{focus.root_cause||focus.explanation}</p></div>
          {focus.prerequisite_gap&&<div className="prereq-line"><span className="prereq-icon"><BookOpen size={16}/></span><div><b>A building block to revisit</b><span>{focus.prerequisite_gap}</span></div></div>}
        </section>
        <section className="explanation-card surface"><div className="section-kicker">MAKE THE IDEA VISIBLE</div><h2>Let's work through it.</h2><p>{focus.explanation}</p><div className="worked-example"><div className="example-label"><span><BookOpen size={14}/></span> A worked example</div><p>{focus.worked_example}</p></div><div className="tip-strip"><Lightbulb size={17}/><span><b>Try this next time</b>{focus.learning_tip}</span></div></section>
        <div className="analysis-actions"><Link href={`/recovery/${encodeURIComponent(id)}`} className="button button-primary button-large" data-testid="button-open-recovery"><Sparkles size={16}/> Explore a learning path <ArrowRight size={16}/></Link><Link href="/student" className="text-link">Back to my hub</Link></div>
      </div><aside className="analysis-aside"><div className="aside-card surface"><span className="aside-icon"><Target size={19}/></span><div className="section-kicker">YOUR NEXT MILESTONE</div><h3>Understand it.<br/>Then show it.</h3><p>Try a guided recovery, then check your understanding with a fresh question.</p><div className="milestone-line"><span className="milestone-done"><Check size={12}/></span><span>Your reasoning reviewed</span></div><div className="milestone-line"><span className="milestone-next">2</span><span>Targeted recovery</span></div><div className="milestone-line"><span className="milestone-next">3</span><span>New question, new evidence</span></div><Link href={`/recovery/${encodeURIComponent(id)}`} className="aside-link">Continue learning <ArrowRight size={14}/></Link></div><div className="gentle-note"><ShieldCheck size={16}/><span>One missed idea never defines what you can learn.</span></div></aside></div>
    </div>
  </Shell>;
}

function Recovery() {
  const [,params]=useRoute('/recovery/:assessmentId');
  const id=params?.assessmentId||'';
  const [language,setLanguage]=useState('English');
  const q=useGetRecovery(id,language,{query:{enabled:!!id,queryKey:getGetRecoveryQueryKey(id,language)}});
  const ass=useGetAssessment(id,{query:{enabled:!!id,queryKey:getGetAssessmentQueryKey(id)}});
  const recovery=q.data;
  if(q.isLoading)return <Shell eyebrow="TARGETED RECOVERY"><Loading label={`Finding the clearest explanation in ${language}`}/></Shell>;
  if(q.isError)return <Shell eyebrow="TARGETED RECOVERY"><ErrorState error={q.error} retry={()=>q.refetch()}/></Shell>;
  if(!recovery)return <Shell eyebrow="TARGETED RECOVERY"><EmptyState title="This learning path isn't available" action={<Link href="/assessment" className="button button-primary">Start a new diagnostic</Link>}>Try again after completing a diagnostic.</EmptyState></Shell>;
  const focus=ass.data?.focus_result;
  return <Shell eyebrow="A LEARNING PATH, MADE FOR YOU">
    <div className="recovery-wrap"><Link href={`/analysis/${encodeURIComponent(id)}`} className="back-link"><ArrowLeft size={15}/> Back to your insight</Link><div className="recovery-heading"><div><div className="section-kicker">LET'S MAKE THIS CLICK</div><h1 className="font-display">A fresh look at<br/><em>{recovery.concept}.</em></h1><p>Small steps. Clear examples. No rush.</p></div><div className="language-picker"><Languages size={16}/><label htmlFor="recovery-language">Learning in</label><select id="recovery-language" value={language} onChange={e=>setLanguage(e.target.value)} data-testid="select-recovery-language"><option>English</option><option>Hindi</option><option>Marathi</option></select><ChevronDown size={14}/></div></div>
      {q.isFetching&&<div className="language-loading"><span className="button-pulse"/> Switching to {language}…</div>}
      <div className="recovery-grid"><div className="recovery-main">
        {focus?.misconception&&<div className="recovery-reminder"><span><BrainCircuit size={16}/></span><p><b>What we're untangling</b>{focus.misconception}</p></div>}
        <article className="lesson-card surface"><div className="lesson-step"><span>01</span><div><div className="section-kicker">THE IDEA, SIMPLY</div><h2>Start with the meaning.</h2></div></div><p className="lesson-copy">{recovery.simple_explanation}</p><div className="example-box"><div className="example-label"><BookOpen size={14}/> WALK IT THROUGH</div><p>{recovery.worked_example}</p></div></article>
        <article className="tip-card"><div className="tip-bulb"><Lightbulb size={19}/></div><div><div className="section-kicker">A HELPFUL HABIT</div><h3>Keep this thought close.</h3><p>{recovery.learning_tip}</p></div></article>
        {recovery.practice_questions?.length>0&&<article className="practice-card surface"><div className="section-kicker">A LITTLE PRACTICE</div><h2>Try these in your own words.</h2><ol>{recovery.practice_questions.map((item,i)=><li key={`${i}-${item}`}><span>{String(i+1).padStart(2,'0')}</span><p>{item}</p></li>)}</ol></article>}
        <div className="recovery-finish"><div><CheckCircle2 size={19}/><span>Ready to see what stuck?</span></div><Link href={`/reassessment/${encodeURIComponent(id)}`} className="button button-primary button-large" data-testid="button-start-reassessment">Try a fresh question <ArrowRight size={16}/></Link></div>
      </div><aside className="recovery-side"><div className="path-card"><div className="section-kicker">YOUR LEARNING PATH</div><div className="path-step done"><span><Check size={13}/></span><div><b>Find the reason</b><small>We looked beneath the answer</small></div></div><div className="path-rail"/><div className="path-step current"><span>2</span><div><b>Build the concept</b><small>You're here, learning at your pace</small></div></div><div className="path-rail"/><div className="path-step"><span>3</span><div><b>Check your understanding</b><small>A different question, just for you</small></div></div></div><div className="recovery-side-note"><ShieldCheck size={15}/>Your progress is yours. Take the time you need.</div></aside></div>
    </div>
  </Shell>;
}

function Reassessment() {
  const [,params]=useRoute('/reassessment/:assessmentId');
  const id=params?.assessmentId||'';
  const questions=useListQuestions();
  const assessment=useGetAssessment(id,{query:{enabled:!!id,queryKey:getGetAssessmentQueryKey(id)}});
  const mutation=useSubmitReassessment();
  const qc=useQueryClient();
  const [answer,setAnswer]=useState('');
  const result=mutation.data;
  const focus=assessment.data?.focus_result;
  const questionBank=[...(questions.data||[])].sort((a,b)=>a.order-b.order);
  const candidates=questionBank.filter(x=>x.concept===focus?.concept);
  const source=candidates.find(x=>x.prompt!==focus?.prompt)||questionBank.find(x=>x.prompt!==focus?.prompt)||candidates[0];
  const question=result?.question||source?.prompt||'';
  const options=source?.options||[];
  if(questions.isLoading||assessment.isLoading)return <Shell eyebrow="CHECK YOUR UNDERSTANDING"><Loading label="Preparing a fresh question"/></Shell>;
  if(questions.isError)return <Shell eyebrow="CHECK YOUR UNDERSTANDING"><ErrorState error={questions.error} retry={()=>questions.refetch()}/></Shell>;
  const submit=()=>{if(!answer)return;mutation.mutate({assessmentId:id,data:{answer}},{onSuccess:()=>{qc.invalidateQueries({queryKey:getGetAssessmentQueryKey(id)});qc.invalidateQueries({queryKey:getGetStudentDashboardQueryKey()});qc.invalidateQueries({queryKey:getGetTeacherDashboardQueryKey()});}});};
  return <Shell eyebrow="ONE MORE STEP">
    <div className="reassessment-wrap"><Link href={`/recovery/${encodeURIComponent(id)}`} className="back-link"><ArrowLeft size={15}/> Back to recovery</Link>
      {!result?<><div className="reassessment-head"><div className="section-kicker">A FRESH QUESTION</div><h1 className="font-display">Let's see what<br/><em>makes sense now.</em></h1><p>This isn't a repeat. It's a new way to show what you've picked up.</p></div>
        <section className="retest-card surface"><div className="retest-label"><span className="live-dot"/> {focus?.concept||'CONCEPT CHECK'}</div><h2>{question||'A targeted question is getting ready.'}</h2>{options.length?<div className="answer-options">{options.map((option,i)=><button key={option} onClick={()=>setAnswer(option)} className={`answer-option ${answer===option?'selected':''}`} data-testid={`reassessment-answer-${i+1}`}><span className="option-letter">{String.fromCharCode(65+i)}</span>{option}{answer===option&&<CheckCircle2 className="option-check" size={18}/>}</button>)}</div>:<label className="retest-input-label">Your answer<input value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Type your answer" data-testid="input-reassessment-answer"/></label>}
          {mutation.isError&&<div className="inline-error"><AlertCircle size={16}/>{mutation.error?.message||'Could not submit your answer. Try again.'}</div>}
          <div className="retest-footer"><span><ShieldCheck size={15}/> One answer. A useful next signal.</span><button className="button button-primary" disabled={!answer||mutation.isPending} onClick={submit} data-testid="button-submit-reassessment">{mutation.isPending?'Checking your thinking…':'Check my understanding'} {mutation.isPending?<span className="button-pulse"/>:<ArrowRight size={16}/>}</button></div>
        </section></>:<section className={`outcome-card ${result.resolved?'outcome-success':''}`}><span className="outcome-symbol">{result.resolved?<CheckCircle2 size={28}/>:<Lightbulb size={27}/>}</span><div className="section-kicker">{result.resolved?'CONCEPT REPAIRED':'A GOOD NEXT CLUE'}</div><h1 className="font-display">{result.resolved?'You made the connection.':'Understanding is taking shape.'}</h1><p className="outcome-message">{result.message}</p><div className="mastery-change"><div><span>MASTERY BEFORE</span><b>{Math.round(result.mastery_before)}%</b></div><ArrowRight size={18}/><div><span>MASTERY NOW</span><b className="after-score">{Math.round(result.mastery_after)}%</b></div></div><ProgressBar value={result.mastery_after}/><div className="outcome-explanation"><b>{result.is_correct?'Why your answer works':'A useful way to see it'}</b><p>{result.explanation}</p><small>Question: {result.question} <span>·</span> Answer: {result.correct_answer}</small></div><div className="outcome-actions"><Link href="/student" className="button button-primary" data-testid="button-back-student-hub">Back to my hub <ArrowRight size={15}/></Link><Link href="/assessment" className="text-link">Explore another concept</Link></div></section>}
    </div>
  </Shell>;
}

function TeacherDashboard() {
  const q=useGetTeacherDashboard();
  const data=q.data;
  if(q.isLoading)return <Shell eyebrow="TEACHER SPACE"><Loading label="Gathering class-level learning signals"/></Shell>;
  if(q.isError)return <Shell eyebrow="TEACHER SPACE"><ErrorState error={q.error} retry={()=>q.refetch()}/></Shell>;
  if(!data)return <Shell eyebrow="TEACHER SPACE"><EmptyState title="Class insights are on their way">When students complete diagnostics, shared concept patterns will appear here.</EmptyState></Shell>;
  const bars=(data.concept_weakness||[]).map((x,i)=>({...x,fill:['#397b66','#d69b48','#77a392','#be744f','#617f9d'][i%5]}));
  return <Shell eyebrow="TEACHER SPACE">
    <PageTitle kicker="CLASS LEARNING, IN FOCUS" title="Understand the class behind the numbers." sub="Spot shared learning gaps early. Plan the next lesson with more clarity." aside={<div className="teacher-date"><span className="live-dot"/> LIVE CLASS PICTURE</div>}/>
    <div className="teacher-stat-grid"><article className="teacher-stat surface"><div className="stat-icon green"><Users size={18}/></div><span className="section-kicker">STUDENTS IN VIEW</span><strong>{data.total_students}</strong><span className="stat-footnote">Learning signals collected</span></article><article className="teacher-stat surface"><div className="stat-icon amber"><BarChart3 size={18}/></div><span className="section-kicker">CLASS MASTERY</span><strong>{Math.round(data.average_mastery)}<small>%</small></strong><ProgressBar value={data.average_mastery}/></article><article className="teacher-stat intervention surface"><div className="stat-icon rose"><Target size={18}/></div><span className="section-kicker">READY FOR A CHECK-IN</span><strong>{data.students_requiring_intervention}</strong><span className="stat-footnote">Students may benefit from support</span></article></div>
    <div className="teacher-grid"><section className="weakness-panel surface"><div className="panel-heading"><div><div className="section-kicker">WHERE THINKING GETS STUCK</div><h2>Concepts to bring into focus</h2></div><span className="soft-counter">{bars.length} patterns</span></div>{bars.length?<div className="weakness-chart"><ResponsiveContainer width="100%" height={300}><BarChart data={bars} layout="vertical" margin={{left:5,right:18,top:6,bottom:6}}><CartesianGrid stroke="#e9e8df" horizontal={false}/><XAxis type="number" domain={[0,100]} tick={{fontSize:11,fill:'#8b9086'}} axisLine={false} tickLine={false} unit="%"/><YAxis type="category" dataKey="concept" width={126} tick={{fontSize:12,fill:'#525e56'}} axisLine={false} tickLine={false}/><Tooltip formatter={(v)=>[`${v}% struggling`,'Learners']} contentStyle={{borderRadius:12,borderColor:'#e3e3d9',fontSize:12}}/><Bar dataKey="struggling_percent" radius={[0,7,7,0]} barSize={18}>{bars.map((b,i)=><Cell key={i} fill={b.fill}/>)}</Bar></BarChart></ResponsiveContainer></div>:<EmptyState title="No patterns to chart yet">Concept patterns appear as diagnostics are completed.</EmptyState>}<div className="hardest-concept"><span className="hardest-icon"><AlertCircle size={17}/></span><span><small>MOST DIFFICULT CONCEPT</small><b>{data.most_difficult_concept||'Not enough data yet'}</b></span><ArrowRight size={16}/></div></section>
      <aside className="teacher-insight"><div className="insight-top"><span><Sparkles size={16}/></span><span>CONCEPTLENS CLASS NOTE</span></div><h2>A signal worth noticing.</h2><p>{data.ai_teacher_insight||'Complete more diagnostics to reveal class-wide learning patterns.'}</p><div className="insight-bottom"><span className="insight-line"/><small>One actionable insight, grounded in student thinking.</small></div></aside>
      <section className="students-panel surface"><div className="panel-heading"><div><div className="section-kicker">STUDENT SUPPORT</div><h2>Who may need a closer look</h2></div><span className="soft-counter">{data.students?.length||0} learners</span></div>{data.students?.length?<div className="student-table-wrap"><table className="student-table"><thead><tr><th>STUDENT</th><th>CONCEPT TO REVISIT</th><th>MASTERY</th><th>NEXT STEP</th></tr></thead><tbody>{data.students.map((s,i)=><tr key={`${s.name}-${i}`}><td><span className="student-name-cell"><span className={`initial-avatar avatar-${i%4}`}>{s.name?.slice(0,1)||'?'}</span><b>{s.name}</b></span></td><td>{s.weak_concept}</td><td><span className="mastery-cell">{Math.round(s.mastery)}%</span></td><td><span className={`intervention-pill ${String(s.intervention_status).toLowerCase().includes('need')||String(s.intervention_status).toLowerCase().includes('support')?'support-pill':''}`}>{s.intervention_status}</span></td></tr>)}</tbody></table></div>:<EmptyState title="No students to display yet">Class roster details will show here after the first diagnostic.</EmptyState>}</section></div>
  </Shell>;
}

function Router() {
  return <Switch><Route path="/" component={Landing}/><Route path="/student" component={StudentDashboard}/><Route path="/assessment" component={Assessment}/><Route path="/analysis/:assessmentId" component={Analysis}/><Route path="/recovery/:assessmentId" component={Recovery}/><Route path="/reassessment/:assessmentId" component={Reassessment}/><Route path="/teacher" component={TeacherDashboard}/><Route component={NotFound}/></Switch>;
}
function App() { return <QueryClientProvider client={queryClient}><Router/></QueryClientProvider>; }
export default App;

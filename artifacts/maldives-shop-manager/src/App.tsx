import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, Show, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ArrowRight, Check, ChevronRight, CircleAlert, Clock3, Compass, LockKeyhole, LogOut, Mail, ShieldCheck, Store, Users, Waves } from 'lucide-react';
import { Link, Redirect, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import {
  getGetCurrentUserQueryKey,
  getListStaffQueryKey,
  type CurrentUser,
  useGetCurrentUser,
  useHealthCheck,
  useInviteCashier,
  useListStaff,
} from '@workspace/api-client-react';

const queryClient = new QueryClient();
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#28665f',
    colorForeground: '#233b39',
    colorMutedForeground: '#71817b',
    colorDanger: '#b5473c',
    colorBackground: '#fbfaf5',
    colorInput: '#fffefa',
    colorInputForeground: '#233b39',
    colorNeutral: '#d7d4c9',
    fontFamily: 'Manrope, sans-serif',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fbfaf5] rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#233b39] font-extrabold tracking-tight',
    headerSubtitle: 'text-[#71817b]',
    socialButtonsBlockButtonText: 'text-[#233b39] font-semibold',
    formFieldLabel: 'text-[#38514e] font-semibold',
    footerActionLink: 'text-[#28665f] font-bold',
    footerActionText: 'text-[#71817b]',
    dividerText: 'text-[#71817b]',
    identityPreviewEditButton: 'text-[#28665f]',
    formFieldSuccessText: 'text-[#28665f]',
    alertText: 'text-[#853d36]',
    logoBox: 'rounded-lg overflow-hidden',
    logoImage: 'object-contain',
    socialButtonsBlockButton: 'border-[#d7d4c9] bg-[#fffefa] hover:bg-[#f3f1e8]',
    formButtonPrimary: 'bg-[#28665f] hover:bg-[#1d534d] shadow-none',
    formFieldInput: 'border-[#d7d4c9] bg-[#fffefa] text-[#233b39]',
    footerAction: 'border-t border-[#e6e2d7]',
    dividerLine: 'bg-[#e2dfd5]',
    alert: 'bg-[#fff1ed] border-[#f0c7bd]',
    otpCodeFieldInput: 'border-[#d7d4c9] bg-[#fffefa]',
    formFieldRow: 'gap-2',
    main: 'gap-5',
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const cache = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const nextUserId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== nextUserId) cache.clear();
      previousUserId.current = nextUserId;
    });
    return unsubscribe;
  }, [addListener, cache]);
  return null;
}

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className={`brand-lockup ${inverse ? 'brand-inverse' : ''}`} data-testid="link-brand-home">
      <span className="brand-mark"><Waves size={19} strokeWidth={2.2} /></span>
      <span className="brand-name">isle<span>desk</span></span>
    </Link>
  );
}

function PublicHome() {
  const health = useHealthCheck();
  return (
    <main className="public-page grain">
      <nav className="public-nav">
        <Brand />
        <div className="public-nav-right">
          <span className="nav-note"><span className="live-dot" /> Built for island shops</span>
          <Link href="/sign-in" className="nav-signin" data-testid="link-sign-in">Sign in <ArrowRight size={15} /></Link>
        </div>
      </nav>
      <section className="hero-shell">
        <div className="hero-copy rise">
          <div className="eyebrow"><span className="eyebrow-line" /> A steadier start for your shop</div>
          <h1>Your counter,<br />in good <em>hands.</em></h1>
          <p className="hero-lede">The simple first step to running your shop with confidence. Set up your people, know who has access, and get ready for what’s next.</p>
          <div className="hero-actions">
            <Link href="/sign-up" className="button-primary" data-testid="link-get-started">Set up your shop <ArrowRight size={17} /></Link>
            <Link href="/sign-in" className="button-quiet" data-testid="link-existing-account">I already have an account <ChevronRight size={16} /></Link>
          </div>
          <div className="hero-trust"><ShieldCheck size={16} /> Your shop. Your people. Your permissions.</div>
        </div>
        <div className="hero-art rise-delay" aria-label="Illustration of a tidy island shop counter">
          <div className="sun-disc" />
          <div className="art-island" />
          <div className="counter-scene">
            <div className="scene-window"><div className="window-sky" /><div className="window-sea" /><div className="palm palm-one" /><div className="palm palm-two" /></div>
            <div className="scene-shelf"><i /><i /><i /></div>
            <div className="scene-counter"><div className="counter-top" /><div className="counter-front"><span>ISLE MARKET</span></div></div>
            <div className="scene-terminal"><div className="terminal-screen" /><div className="terminal-base" /></div>
            <div className="plant-pot"><div className="leaf leaf-a" /><div className="leaf leaf-b" /><div className="leaf leaf-c" /><div className="pot" /></div>
          </div>
          <div className="art-caption"><span>01 / START WITH THE RIGHT PEOPLE</span><span>MALE’ · MALDIVES</span></div>
          <div className="floating-note"><span className="note-icon"><Check size={14} /></span><span><b>Owner access</b><small>Ready from day one</small></span></div>
        </div>
      </section>
      <section className="promise-strip">
        <div><span className="strip-index">01</span><b>One clear owner</b><small>Your shop starts with the right access.</small></div>
        <div><span className="strip-index">02</span><b>Cashier access</b><small>Owners choose who can help at the counter.</small></div>
        <div><span className="strip-index">03</span><b>Demo shop set up</b><small>MVR defaults and sample records are in place.</small></div>
        <div className="strip-status"><span className={`status-dot ${health.isError ? 'offline' : ''}`} /> {health.isLoading ? 'Checking service' : health.isError ? 'Service status unavailable' : 'Service is ready'}</div>
      </section>
      <section className="intro-section">
        <div className="section-kicker">A GOOD SHOP STARTS HERE <span>—</span> STAGE 01</div>
        <div className="intro-grid">
          <h2>Clear roles make<br />a calmer counter.</h2>
          <div><p>Before the rush, before the receipts, before anything else — know who owns the shop and who’s trusted to serve.</p><p>Isledesk keeps the setup straightforward, so you can focus on the people and place that make your shop yours.</p></div>
        </div>
      </section>
      <section className="steps-section">
        <div className="steps-heading"><div><div className="section-kicker">HOW IT BEGINS</div><h2>Three small steps.<br /><em>A solid foundation.</em></h2></div><span className="steps-aside">No clutter. No guesswork.<br />Just the essentials.</span></div>
        <div className="steps-list">
          <article><span className="step-number">01</span><div className="step-glyph"><Store size={21} /></div><div><h3>Claim your shop</h3><p>Create the owner account. You remain in control of access from the very beginning.</p></div><span className="step-arrow"><ArrowRight size={17} /></span></article>
          <article><span className="step-number">02</span><div className="step-glyph coral"><Users size={21} /></div><div><h3>Grant cashier access</h3><p>Add a verified email. The cashier signs in to activate their access.</p></div><span className="step-arrow"><ArrowRight size={17} /></span></article>
          <article><span className="step-number">03</span><div className="step-glyph sand"><LockKeyhole size={20} /></div><div><h3>Know where you stand</h3><p>See active and pending access in one clear staff list, only visible to owners.</p></div><span className="step-arrow"><ArrowRight size={17} /></span></article>
        </div>
      </section>
      <footer className="public-footer"><Brand /><span>Made for the everyday rhythm of island retail.</span><span className="footer-location">MALDIVES · <span>{new Date().getFullYear()}</span></span></footer>
    </main>
  );
}

function SignInPage() {
  return <div className="auth-page"><div className="auth-aside"><Brand inverse /><div><div className="eyebrow light"><span className="eyebrow-line" /> YOUR SHOP, IN ORDER</div><h1>Back to<br /><em>your corner.</em></h1><p>A steadier way to take care of the people behind your counter.</p></div><span className="auth-footer-note">ISLEDESK · MALDIVES</span></div><div className="auth-form-area"><div className="auth-mobile-brand"><Brand /></div><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div></div>;
}

function SignUpPage() {
  return <div className="auth-page"><div className="auth-aside"><Brand inverse /><div><div className="eyebrow light"><span className="eyebrow-line" /> A GOOD PLACE TO BEGIN</div><h1>Make room<br />for <em>what’s next.</em></h1><p>Start with clear ownership and access that stays in your hands.</p></div><span className="auth-footer-note">ISLEDESK · MALDIVES</span></div><div className="auth-form-area"><div className="auth-mobile-brand"><Brand /></div><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div></div>;
}

function RouteGuard({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <ScreenLoading />;
  if (!isSignedIn) return <Redirect to="/" />;
  return <>{children}</>;
}

function ScreenLoading() {
  return <div className="loading-screen"><div className="loading-brand"><span className="brand-mark"><Waves size={18} /></span><span className="brand-name">isle<span>desk</span></span></div><div className="loading-lines"><i /><i /><i /></div></div>;
}

function AppShell({ children, active }: { children: ReactNode; active: 'home' | 'staff' }) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Shop owner';
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand inverse />
        <div className="sidebar-label">YOUR SHOP</div>
        <nav className="side-nav">
          <Link href="/home" className={`side-link ${active === 'home' ? 'selected' : ''}`} data-testid="nav-home"><Compass size={18} /><span>Overview</span>{active === 'home' && <span className="side-current" />}</Link>
          <Link href="/staff" className={`side-link ${active === 'staff' ? 'selected' : ''}`} data-testid="nav-staff"><Users size={18} /><span>People & access</span>{active === 'staff' && <span className="side-current" />}</Link>
        </nav>
        <div className="sidebar-bottom"><div className="side-stage"><span>STAGE ONE</span><strong>Getting set up</strong><div className="stage-track"><i /></div><small>Your foundation is taking shape.</small></div><button className="side-signout" onClick={() => signOut({ redirectUrl: basePath || '/' })} data-testid="button-sign-out"><LogOut size={16} /> Sign out</button></div>
      </aside>
      <div className="workspace">
        <header className="topbar"><div className="breadcrumb">Shop setup <span>/</span> <b>{active === 'home' ? 'Overview' : 'People & access'}</b></div><div className="top-user"><span className="user-avatar">{name.slice(0, 1).toUpperCase()}</span><span><b>{name}</b><small>Shop account</small></span></div></header>
        <main className="workspace-content">{children}</main>
        <footer className="workspace-footer"><span>ISLEDESK <i /> STAGE 01</span><span>A steady start for your shop.</span></footer>
      </div>
    </div>
  );
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object') return undefined;
  const value = error as { status?: number; response?: { status?: number } };
  return value.status ?? value.response?.status;
}

function CurrentUserState({ children }: { children: (user: CurrentUser) => ReactNode }) {
  const current = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey() } });
  if (current.isLoading) return <ScreenLoading />;
  if (current.isError || !current.data) {
    const status = getErrorStatus(current.error);
    const unauthorized = status === 401;
    const denied = status === 403;
    return <AccessMessage title={unauthorized ? 'Sign in to continue' : denied ? 'This email does not have shop access yet' : 'We could not load your shop'} description={unauthorized ? 'Sign in with the verified email address associated with your shop.' : denied ? 'Ask the shop owner to grant access to this verified email address, then sign in again.' : 'Your session is still here. Try loading your shop details again.'} retry={() => void current.refetch()} />;
  }
  if (current.data.status === 'pending') return <AccessMessage pending title="Your access is pending" description="The shop owner has not activated your access yet. Once they finish setup, this page will be ready for you." />;
  return <>{children(current.data)}</>;
}

function AccessMessage({ title, description, retry, pending = false }: { title: string; description: string; retry?: () => void; pending?: boolean }) {
  const { signOut } = useClerk();
  return <div className="access-message"><div className={`access-icon ${pending ? 'pending' : ''}`}>{pending ? <Clock3 size={23} /> : <CircleAlert size={23} />}</div><span className="section-kicker">{pending ? 'ACCESS PENDING' : 'SHOP CONNECTION'}</span><h2>{title}</h2><p>{description}</p>{retry && <button className="button-primary" onClick={retry} data-testid="button-retry-current-user">Try again <ArrowRight size={16} /></button>}<button className="button-secondary" onClick={() => void signOut({ redirectUrl: basePath || '/' })} data-testid="button-switch-account">Use another account</button></div>;
}

function HomePage() {
  const health = useHealthCheck();
  return <RouteGuard><CurrentUserState>{(me) => <AppShell active="home">
    <div className="page-topline"><div><div className="section-kicker">YOUR SHOP · STAGE 01</div><h1>Good to have you, <em>{me.fullName?.split(' ')[0] || 'there'}.</em></h1><p className="page-subtitle">Here’s where your shop setup stands today.</p></div><span className="top-status"><i className={`status-dot ${health.isError ? 'offline' : ''}`} />{health.isLoading ? 'Checking connection' : health.isError ? 'Connection unavailable' : 'All systems ready'}</span></div>
    <div className="welcome-panel">
      <div className="welcome-content"><span className="panel-overline">A SOLID START</span><h2>Your shop starts<br />with <em>the right people.</em></h2><p>Set clear access now. The rest of your shop setup can follow, one thoughtful step at a time.</p><Link href={me.role === 'owner' ? '/staff' : '/home'} className="panel-link" data-testid="link-next-step">{me.role === 'owner' ? 'Review people & access' : 'See your access'} <ArrowRight size={16} /></Link></div>
      <div className="welcome-art"><div className="welcome-sun" /><div className="welcome-horizon" /><div className="welcome-palm"><i /><i /><i /><b /></div><div className="welcome-shop"><span /><i /><i /></div><div className="welcome-waterline" /></div>
    </div>
    <section className="setup-section"><div className="setup-heading"><div><div className="section-kicker">YOUR FOUNDATION</div><h2>The essentials, in place.</h2></div><span className="setup-progress">STAGE 01</span></div>
      <div className="setup-checklist">
        <div className="setup-item completed"><span className="setup-check"><Check size={15} /></span><div><b>Shop owner account</b><small>Your account is connected and ready.</small></div><span className="complete-tag">COMPLETE</span></div>
        <Link href={me.role === 'owner' ? '/staff' : '/home'} className="setup-item setup-action" data-testid="link-setup-staff"><span className="setup-number">02</span><div><b>People & access</b><small>{me.role === 'owner' ? 'Invite a cashier when your team is ready.' : 'Your role and access are shown below.'}</small></div><ChevronRight size={18} /></Link>
        <div className="setup-item completed"><span className="setup-check"><Check size={15} /></span><div><b>Demo shop setup</b><small>MVR, Maldives time, accounts and sample stock are ready.</small></div><span className="complete-tag">READY</span></div>
      </div>
    </section>
    <section className="role-card"><div className="role-icon">{me.role === 'owner' ? <ShieldCheck size={22} /> : <Users size={22} />}</div><div className="role-info"><span className="section-kicker">YOUR ACCESS</span><h3>{me.role === 'owner' ? 'Shop owner' : 'Cashier'}</h3><p>{me.role === 'owner' ? 'You manage your shop and decide who can access it.' : 'You have cashier access for this shop. Only the owner can manage staff access.'}</p></div><span className="role-active"><i /> ACTIVE</span></section>
    <div className="home-bottom-note"><LockKeyhole size={15} /> Roles are assigned by the shop owner. Your access is tied to <b>{me.email}</b>.</div>
  </AppShell>}</CurrentUserState></RouteGuard>;
}

function StaffPage() {
  return <RouteGuard><CurrentUserState>{(me) => me.role !== 'owner' ? <AppShell active="staff"><AccessMessage title="This area is for shop owners" description="Cashier access does not include staff management. Your role is assigned by the shop owner and cannot be changed here." /></AppShell> : <StaffOwnerPage />}</CurrentUserState></RouteGuard>;
}

function StaffOwnerPage() {
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');
  const cache = useQueryClient();
  const staffQuery = useListStaff({ query: { queryKey: getListStaffQueryKey() } });
  const invite = useInviteCashier();
  const staff = staffQuery.data ?? [];
  const cashierCount = staff.filter((person) => person.role === 'cashier').length;

  const submitInvite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError('Enter a valid email address to invite a cashier.');
      return;
    }
    setFormError('');
    invite.mutate({ data: { email: cleanEmail } }, {
      onSuccess: () => {
        setEmail('');
        void cache.invalidateQueries({ queryKey: getListStaffQueryKey() });
      },
      onError: (error) => setFormError((error as { message?: string }).message || 'We could not grant access. Please try again.'),
    });
  };

  return <AppShell active="staff">
    <div className="page-topline staff-topline"><div><div className="section-kicker">SHOP OWNER · STAGE 01</div><h1>People & <em>access.</em></h1><p className="page-subtitle">A clear view of who can be at your counter.</p></div><span className="owner-seal"><ShieldCheck size={16} /> OWNER VIEW</span></div>
       <div className="staff-intro"><div className="staff-intro-icon"><Users size={21} /></div><div><b>Access stays in your hands.</b><p>Grant access to a verified email. Cashiers cannot assign or elevate their own role.</p></div><span className="staff-access-note"><LockKeyhole size={14} /> OWNER ONLY</span></div>
     <section className="invite-panel"><div className="invite-heading"><div><div className="section-kicker">GRANT CASHIER ACCESS</div><h2>Add someone to the counter.</h2><p>They must use this verified email to sign in. No email is sent automatically.</p></div><div className="invite-stamp"><Mail size={19} /></div></div>
       <form onSubmit={submitInvite} className="invite-form" noValidate><label htmlFor="cashier-email">Cashier’s email address</label><div className="input-action"><div className="email-input-wrap"><Mail size={17} /><input id="cashier-email" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(event) => { setEmail(event.target.value); setFormError(''); }} data-testid="input-cashier-email" /></div><button className="button-primary" disabled={invite.isPending} type="submit" data-testid="button-invite-cashier">{invite.isPending ? 'Saving…' : 'Grant cashier access'} {!invite.isPending && <ArrowRight size={16} />}</button></div>{formError && <p className="form-error" role="alert" data-testid="status-invite-error"><CircleAlert size={14} />{formError}</p>}{invite.isSuccess && <p className="form-success" role="status" data-testid="status-invite-success"><Check size={14} /> Access is ready. Share the sign-in page with the cashier.</p>}<span className="form-footnote">Only grant access to someone you trust to serve customers.</span></form>
    </section>
    <section className="staff-list-section"><div className="list-head"><div><div className="section-kicker">YOUR SHOP TEAM</div><h2>People with access <span>{staffQuery.isLoading ? '—' : staff.length.toString().padStart(2, '0')}</span></h2></div><div className="list-summary"><span><i className="status-dot" /> {staffQuery.isLoading ? 'Loading' : `${staff.filter((person) => person.status === 'active').length} active`}</span><span><Clock3 size={13} /> {staffQuery.isLoading ? '—' : `${staff.filter((person) => person.status === 'pending').length} pending`}</span></div></div>
      {staffQuery.isLoading ? <div className="staff-skeleton"><i /><i /><i /></div> : staffQuery.isError ? <div className="list-error"><CircleAlert size={20} /><b>{getErrorStatus(staffQuery.error) === 401 ? 'Owner authorization required' : 'Staff list unavailable'}</b><p>{getErrorStatus(staffQuery.error) === 401 ? 'Your shop owner access could not be confirmed. Refresh your session or contact support.' : 'We couldn’t load your people right now.'}</p><button className="button-secondary" onClick={() => void staffQuery.refetch()} data-testid="button-retry-staff">Try again</button></div> : staff.length === 0 ? <div className="staff-empty"><div className="empty-mark"><Users size={20} /></div><b>Your team list starts here.</b><p>No staff have been added yet. When you're ready, invite the first cashier above.</p></div> : <div className="staff-table"><div className="staff-table-labels"><span>PERSON</span><span>ROLE</span><span>ACCESS</span><span>ADDED</span></div>{staff.map((person) => <div className="staff-row" key={person.id} data-testid={`row-staff-${person.id}`}><div className="staff-person"><span className={`staff-avatar ${person.role === 'owner' ? 'owner-avatar' : ''}`}>{person.email.slice(0, 1).toUpperCase()}</span><div><b>{person.email}</b><small>{person.role === 'owner' ? 'Shop account owner' : 'Counter team'}</small></div></div><span className={`role-pill ${person.role}`}>{person.role}</span><span className={`access-pill ${person.status}`}><i />{person.status === 'active' ? 'Active' : 'Pending'}</span><span className="staff-date">{new Date(person.createdAt).toLocaleDateString('en-MV', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>)}</div>}
    </section>
    <div className="staff-privacy"><ShieldCheck size={16} /><span><b>Roles are deliberate.</b> Cashier access is granted only by an owner. Staff cannot grant access to themselves or change their role.</span></div>
  </AppShell>;
}

function HomeRedirect() {
  return <><Show when="signed-in"><Redirect to="/home" /></Show><Show when="signed-out"><PublicHome /></Show></>;
}

function Router() {
  const [location] = useLocation();
  return <div key={location} className="route-frame"><Switch>
    <Route path="/" component={HomeRedirect} />
    <Route path="/sign-in/*?" component={SignInPage} />
    <Route path="/sign-up/*?" component={SignUpPage} />
    <Route path="/home" component={HomePage} />
    <Route path="/staff" component={StaffPage} />
    <Route><Redirect to="/" /></Route>
  </Switch></div>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{ signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to your shop account' } }, signUp: { start: { title: 'Set up your shop', subtitle: 'Start with a clear foundation' } } }} routerPush={(to) => setLocation(stripBase(to))} routerReplace={(to) => setLocation(stripBase(to), { replace: true })}>
    <QueryClientProvider client={queryClient}><ClerkQueryClientCacheInvalidator /><Router /></QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  return <WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter>;
}

export default App;

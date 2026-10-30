import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, ChevronRight, CircleAlert, Clock3, Compass, CreditCard, LockKeyhole, LogOut, Mail, Package, Search, ShieldCheck, ShoppingCart, Store, Users, Waves, X } from 'lucide-react';
import { Link, Redirect, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { useSupabaseAuth, SupabaseAuthProvider } from './lib/auth-context';
import { supabase } from './lib/supabase';
import {
  getGetCurrentUserQueryKey,
  getListCustomersQueryKey,
  getListFinancialAccountsQueryKey,
  getListProductsQueryKey,
  getListStaffQueryKey,
  type Customer,
  type CurrentUser,
  type FinancialAccount,
  type Product,
  type SaleReceipt,
  useCreateCustomer,
  useCreateProduct,
  useCreateSale,
  useGetCurrentUser,
  useHealthCheck,
  useInviteCashier,
  useListCustomers,
  useListFinancialAccounts,
  useListProducts,
  useListStaff,
} from '@workspace/api-client-react';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');


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
          <p className="hero-lede">Record everyday sales, keep stock current, and take cash or bank payments in MVR. Your shop’s catalog and checkout live in one straightforward place.</p>
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
        <div><span className="strip-index">01</span><b>Product catalog</b><small>Add prices and opening stock.</small></div>
        <div><span className="strip-index">02</span><b>MVR checkout</b><small>Cash, bank, split, or customer credit.</small></div>
        <div><span className="strip-index">03</span><b>Stock stays in sync</b><small>Every sale records its stock movement.</small></div>
        <div className="strip-status"><span className={`status-dot ${health.isError ? 'offline' : ''}`} /> {health.isLoading ? 'Checking service' : health.isError ? 'Service status unavailable' : 'Service is ready'}</div>
      </section>
      <section className="intro-section">
        <div className="section-kicker">MADE FOR THE DAILY WORK</div>
        <div className="intro-grid">
          <h2>From stockroom<br />to <em>checkout.</em></h2>
          <div><p>Start with the products on your shelves and the prices you charge. The checkout keeps invoice, payment, and stock records together, even when a customer pays in more than one way.</p><p>Owner and cashier access stays separate, while all money is stored in exact laari amounts.</p></div>
        </div>
      </section>
      <section className="steps-section">
        <div className="steps-heading"><div><div className="section-kicker">A SIMPLE DAILY FLOW</div><h2>Set up once.<br /><em>Keep things moving.</em></h2></div><span className="steps-aside">Built for a real shop counter.<br />Not another spreadsheet.</span></div>
        <div className="steps-list">
          <article><span className="step-number">01</span><div className="step-glyph"><Package size={21} /></div><div><h3>Add products and opening stock</h3><p>Enter selling and cost prices, then record the quantity already on the shelf.</p></div><span className="step-arrow"><ArrowRight size={17} /></span></article>
          <article><span className="step-number">02</span><div className="step-glyph coral"><ShoppingCart size={21} /></div><div><h3>Ring up the sale</h3><p>Choose products, take one or more payments, and email a receipt when configured.</p></div><span className="step-arrow"><ArrowRight size={17} /></span></article>
          <article><span className="step-number">03</span><div className="step-glyph sand"><LockKeyhole size={20} /></div><div><h3>Keep access deliberate</h3><p>Owners can add cashier access without giving up control of shop management.</p></div><span className="step-arrow"><ArrowRight size={17} /></span></article>
        </div>
      </section>
      <footer className="public-footer"><Brand /><span>Made for the everyday rhythm of island retail.</span><span className="footer-location">MALDIVES · <span>{new Date().getFullYear()}</span></span></footer>
    </main>
  );
}

function SignInPage() {
  return <AuthPanel mode="sign-in" />;
}

function SignUpPage() {
  return <AuthPanel mode="sign-up" />;
}

function AuthPanel({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [, setLocation] = useLocation();
  const isSignUp = mode === 'sign-up';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsPending(true);

    try {
      if (isSignUp) {
        const result = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${basePath}/home`,
          },
        });
        if (result.error) throw result.error;
        if (!result.data.session) {
          setNotice('Check your inbox and confirm your email before signing in.');
          return;
        }
      } else {
        const result = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (result.error) throw result.error;
      }
      setLocation('/home');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'We could not complete sign-in. Please try again.',
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-aside">
        <Brand inverse />
        <div>
          <div className="eyebrow light"><span className="eyebrow-line" /> YOUR SHOP, IN ORDER</div>
          <h1>{isSignUp ? <>Set up<br />your <em>shop.</em></> : <>Back to<br /><em>your corner.</em></>}</h1>
          <p>Simple, accurate tools for the people behind your counter.</p>
        </div>
        <span className="auth-footer-note">ISLEDESK · MALDIVES</span>
      </div>
      <div className="auth-form-area">
        <div className="auth-mobile-brand"><Brand /></div>
        <form className="auth-form-card" onSubmit={submit}>
          <span className="section-kicker">{isSignUp ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}</span>
          <h2>{isSignUp ? 'Start with your shop.' : 'Sign in to your shop.'}</h2>
          <p>{isSignUp ? 'Use the owner email configured for this shop. Cashiers need an invitation from the owner.' : 'Use the verified email address linked to your shop access.'}</p>
          <label htmlFor="auth-email">Email address</label>
          <input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="auth-password">Password</label>
          <input id="auth-password" type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
          {error && <p className="form-error" role="alert"><CircleAlert size={14} />{error}</p>}
          {notice && <p className="form-success" role="status"><Check size={14} />{notice}</p>}
          <button className="button-primary auth-submit" type="submit" disabled={isPending}>
            {isPending ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
            {!isPending && <ArrowRight size={16} />}
          </button>
          <p className="auth-switch">
            {isSignUp ? 'Already have an account?' : 'New to the shop?'}
            {' '}
            <Link href={isSignUp ? '/sign-in' : '/sign-up'}>{isSignUp ? 'Sign in' : 'Create account'}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function RouteGuard({ children }: { children: ReactNode }) {
  const { isLoaded, user } = useSupabaseAuth();
  if (!isLoaded) return <ScreenLoading />;
  if (!user) return <Redirect to="/sign-in" />;
  return <>{children}</>;
}

function ScreenLoading() {
  return <div className="loading-screen"><div className="loading-brand"><span className="brand-mark"><Waves size={18} /></span><span className="brand-name">isle<span>desk</span></span></div><div className="loading-lines"><i /><i /><i /></div></div>;
}

type AppSection = 'home' | 'pos' | 'products' | 'staff';

function AppShell({ children, active }: { children: ReactNode; active: AppSection }) {
  const { signOut, user } = useSupabaseAuth();
  const metadataName = user?.user_metadata?.full_name;
  const name = (typeof metadataName === 'string' && metadataName.trim()) || user?.email || 'Shop user';
  const sectionName: Record<AppSection, string> = {
    home: 'Overview',
    pos: 'Point of sale',
    products: 'Products & stock',
    staff: 'People & access',
  };

  const leaveShop = async () => {
    try {
      await signOut();
    } finally {
      window.location.assign(basePath || '/');
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand inverse />
        <div className="sidebar-label">SHOP DESK</div>
        <nav className="side-nav">
          <Link href="/home" className={`side-link ${active === 'home' ? 'selected' : ''}`} data-testid="nav-home"><Compass size={18} /><span>Overview</span>{active === 'home' && <span className="side-current" />}</Link>
          <Link href="/pos" className={`side-link ${active === 'pos' ? 'selected' : ''}`} data-testid="nav-pos"><ShoppingCart size={18} /><span>Sell</span>{active === 'pos' && <span className="side-current" />}</Link>
          <Link href="/products" className={`side-link ${active === 'products' ? 'selected' : ''}`} data-testid="nav-products"><Package size={18} /><span>Products</span>{active === 'products' && <span className="side-current" />}</Link>
          <Link href="/staff" className={`side-link ${active === 'staff' ? 'selected' : ''}`} data-testid="nav-staff"><Users size={18} /><span>People & access</span>{active === 'staff' && <span className="side-current" />}</Link>
        </nav>
        <div className="sidebar-bottom"><div className="side-stage"><span>SHOP DESK</span><strong>Ready for the counter</strong><div className="stage-track"><i /></div><small>Products, sales and shop access.</small></div><button className="side-signout" onClick={() => void leaveShop()} data-testid="button-sign-out"><LogOut size={16} /> Sign out</button></div>
      </aside>
      <div className="workspace">
        <header className="topbar"><div className="breadcrumb">Shop desk <span>/</span> <b>{sectionName[active]}</b></div><div className="top-user"><span className="user-avatar">{name.slice(0, 1).toUpperCase()}</span><span><b>{name}</b><small>Shop account</small></span></div></header>
        <main className="workspace-content">{children}</main>
        <footer className="workspace-footer"><span>ISLEDESK <i /> MALDIVES</span><span>Shop sales and stock, in one place.</span></footer>
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
  const { signOut } = useSupabaseAuth();
  return <div className="access-message"><div className={`access-icon ${pending ? 'pending' : ''}`}>{pending ? <Clock3 size={23} /> : <CircleAlert size={23} />}</div><span className="section-kicker">{pending ? 'ACCESS PENDING' : 'SHOP CONNECTION'}</span><h2>{title}</h2><p>{description}</p>{retry && <button className="button-primary" onClick={retry} data-testid="button-retry-current-user">Try again <ArrowRight size={16} /></button>}<button className="button-secondary" onClick={() => void signOut().finally(() => window.location.assign(basePath || '/'))} data-testid="button-switch-account">Use another account</button></div>;
}

function HomePage() {
  const health = useHealthCheck();
  return <RouteGuard><CurrentUserState>{(me) => <AppShell active="home">
    <div className="page-topline"><div><div className="section-kicker">YOUR SHOP</div><h1>Good to have you, <em>{me.fullName?.split(' ')[0] || 'there'}.</em></h1><p className="page-subtitle">Your products, sales, and access are ready to manage.</p></div><span className="top-status"><i className={`status-dot ${health.isError ? 'offline' : ''}`} />{health.isLoading ? 'Checking connection' : health.isError ? 'Connection unavailable' : 'All systems ready'}</span></div>
    <div className="welcome-panel">
      <div className="welcome-content"><span className="panel-overline">READY FOR THE COUNTER</span><h2>Take your first<br /><em>shop sale.</em></h2><p>Open checkout, add what the customer picked up, and record the payment. Stock updates with the invoice.</p><Link href="/pos" className="panel-link" data-testid="link-next-step">Open point of sale <ArrowRight size={16} /></Link></div>
      <div className="welcome-art"><div className="welcome-sun" /><div className="welcome-horizon" /><div className="welcome-palm"><i /><i /><i /><b /></div><div className="welcome-shop"><span /><i /><i /></div><div className="welcome-waterline" /></div>
    </div>
    <section className="setup-section"><div className="setup-heading"><div><div className="section-kicker">SHOP SHORTCUTS</div><h2>Go straight to the work.</h2></div><span className="setup-progress">MVR · MALDIVES</span></div>
      <div className="setup-checklist">
        <Link href="/pos" className="setup-item setup-action"><span className="setup-check"><ShoppingCart size={15} /></span><div><b>Sell at the counter</b><small>Build a basket and take a cash, bank, or partial payment.</small></div><ChevronRight size={18} /></Link>
        <Link href="/products" className="setup-item setup-action"><span className="setup-number">02</span><div><b>Manage products and stock</b><small>Add prices and the stock you already have.</small></div><ChevronRight size={18} /></Link>
        <Link href={me.role === 'owner' ? '/staff' : '/home'} className="setup-item setup-action" data-testid="link-setup-staff"><span className="setup-number">03</span><div><b>People & access</b><small>{me.role === 'owner' ? 'Grant cashier access to a trusted teammate.' : 'Your role is assigned by the shop owner.'}</small></div><ChevronRight size={18} /></Link>
      </div>
    </section>
    <section className="role-card"><div className="role-icon">{me.role === 'owner' ? <ShieldCheck size={22} /> : <Users size={22} />}</div><div className="role-info"><span className="section-kicker">YOUR ACCESS</span><h3>{me.role === 'owner' ? 'Shop owner' : 'Cashier'}</h3><p>{me.role === 'owner' ? 'You manage your shop and decide who can access it.' : 'You have cashier access for this shop. Only the owner can manage staff access.'}</p></div><span className="role-active"><i /> ACTIVE</span></section>
    <div className="home-bottom-note"><LockKeyhole size={15} /> Roles are assigned by the shop owner. Your access is tied to <b>{me.email}</b>.</div>
  </AppShell>}</CurrentUserState></RouteGuard>;
}

function StaffPage() {
  return <RouteGuard><CurrentUserState>{(me) => me.role !== 'owner' ? <AppShell active="staff"><AccessMessage title="This area is for shop owners" description="Cashier access does not include staff management. Your role is assigned by the shop owner and cannot be changed here." /></AppShell> : <StaffOwnerPage />}</CurrentUserState></RouteGuard>;
}

type CheckoutPaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'other';
type CartLine = { productId: string; quantity: string };
type PaymentLine = {
  id: string;
  method: CheckoutPaymentMethod;
  accountId: string;
  amountMvr: string;
  reference: string;
};

function formatMvrLaari(value: string | bigint): string {
  const amount = typeof value === 'bigint' ? value : BigInt(value || '0');
  const sign = amount < 0n ? '-' : '';
  const absolute = amount < 0n ? -amount : amount;
  const whole = (absolute / 100n).toLocaleString('en-MV');
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  return `${sign}MVR ${whole}.${fraction}`;
}

function laariToMvrInput(value: bigint): string {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;
}

function mvrInputToLaari(value: string, allowBlank = false): bigint {
  const trimmed = value.trim();
  if (!trimmed && allowBlank) return 0n;
  const match = /^([0-9]+)(?:\.([0-9]{1,2}))?$/.exec(trimmed);
  if (!match) throw new Error('Enter an MVR amount with no more than 2 decimal places.');
  return BigInt(match[1]!) * 100n + BigInt((match[2] ?? '').padEnd(2, '0') || '0');
}

function quantityInputToMilli(value: string): bigint {
  const match = /^(?:0|[1-9][0-9]*)(?:\.([0-9]{1,3}))?$/.exec(value.trim());
  if (!match) throw new Error('Enter a quantity with no more than 3 decimal places.');
  const whole = value.trim().split('.')[0]!;
  const fraction = match[1] ?? '';
  return BigInt(whole) * 1_000n + BigInt(fraction.padEnd(3, '0') || '0');
}

function quantityMilliToInput(value: bigint): string {
  const whole = value / 1_000n;
  const fraction = (value % 1_000n).toString().padStart(3, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function lineAmountLaari(priceLaari: string, quantityMilli: bigint): bigint {
  return (BigInt(priceLaari) * quantityMilli + 500n) / 1_000n;
}

function ProductsPage() {
  return <RouteGuard><CurrentUserState>{(me) => <ProductsWorkbench me={me} />}</CurrentUserState></RouteGuard>;
}

function ProductsWorkbench({ me }: { me: CurrentUser }) {
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    sku: '',
    barcode: '',
    name: '',
    categoryName: '',
    unit: 'each',
    sellingPriceMvr: '',
    costPriceMvr: '',
    lowStockThreshold: '0',
    openingQuantity: '0',
    openingReason: 'Initial stock',
  });
  const cache = useQueryClient();
  const productsQuery = useListProducts(search.trim() ? { search: search.trim() } : undefined);
  const createProduct = useCreateProduct();
  const products = productsQuery.data ?? [];

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError('');
  };

  const submitProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    let sellingPriceLaari: string;
    let costPriceLaari: string;
    try {
      sellingPriceLaari = mvrInputToLaari(form.sellingPriceMvr).toString();
      costPriceLaari = mvrInputToLaari(form.costPriceMvr, true).toString();
      quantityInputToMilli(form.lowStockThreshold);
      quantityInputToMilli(form.openingQuantity);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Check the product amounts.');
      return;
    }

    createProduct.mutate({
      data: {
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || undefined,
        name: form.name.trim(),
        categoryName: form.categoryName.trim() || undefined,
        unit: form.unit.trim() || 'each',
        sellingPriceLaari,
        costPriceLaari,
        lowStockThreshold: form.lowStockThreshold.trim(),
        openingQuantity: form.openingQuantity.trim(),
        openingReason: form.openingReason.trim() || 'Initial stock',
      },
    }, {
      onSuccess: () => {
        setForm((current) => ({ ...current, sku: '', barcode: '', name: '', sellingPriceMvr: '', costPriceMvr: '', openingQuantity: '0' }));
        void cache.invalidateQueries({ queryKey: getListProductsQueryKey() });
      },
      onError: (error) => setFormError((error as { message?: string }).message || 'We could not save the product.'),
    });
  };

  return <AppShell active="products">
    <div className="page-topline"><div><div className="section-kicker">SHOP CATALOG</div><h1>Products & <em>stock.</em></h1><p className="page-subtitle">Set prices, record opening stock, and keep the counter list current.</p></div><span className="owner-seal"><Package size={16} /> {products.length} PRODUCTS</span></div>
    <div className="catalog-layout">
      <section className="catalog-list-panel">
        <div className="catalog-toolbar"><div><div className="section-kicker">ACTIVE CATALOG</div><h2>What you sell</h2></div><label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, SKU, barcode" aria-label="Search products" /></label></div>
        {productsQuery.isLoading ? <div className="staff-skeleton"><i /><i /><i /></div> : productsQuery.isError ? <div className="list-error"><CircleAlert size={20} /><b>Products unavailable</b><p>{(productsQuery.error as { message?: string }).message || 'We couldn’t load the catalog.'}</p><button className="button-secondary" onClick={() => void productsQuery.refetch()}>Try again</button></div> : products.length === 0 ? <div className="staff-empty"><div className="empty-mark"><Package size={20} /></div><b>No products found.</b><p>{search ? 'Try another search.' : 'Add the first product on the right to start selling.'}</p></div> : <div className="product-table"><div className="product-table-head"><span>PRODUCT</span><span>SELLING PRICE</span><span>STOCK</span></div>{products.map((product) => {
          let isLow = false;
          try { isLow = quantityInputToMilli(product.stockOnHand) <= quantityInputToMilli(product.lowStockThreshold); } catch { isLow = false; }
          return <div className="product-table-row" key={product.id}><div><b>{product.name}</b><small>{product.sku}{product.categoryName ? ` · ${product.categoryName}` : ''}</small></div><strong>{formatMvrLaari(product.sellingPriceLaari)}</strong><span className={`stock-pill ${isLow ? 'low' : ''}`}>{product.stockOnHand} {product.unit}</span></div>;
        })}</div>}
        <div className="catalog-note"><ShieldCheck size={16} /><span>Sales reduce stock automatically. Opening stock is recorded once with a reason.</span></div>
      </section>
      {me.role === 'owner' ? <section className="product-form-panel">
        <div className="section-kicker">OWNER · ADD A PRODUCT</div><h2>Put it on the shelf.</h2><p>Prices are entered in MVR; the ledger stores whole laari.</p>
        <form onSubmit={submitProduct} className="product-form">
          <div className="form-two-col"><label>SKU<input required maxLength={80} value={form.sku} onChange={(event) => updateForm('sku', event.target.value)} placeholder="e.g. RICE-5KG" /></label><label>Barcode <span className="field-optional">OPTIONAL</span><input maxLength={120} value={form.barcode} onChange={(event) => updateForm('barcode', event.target.value)} placeholder="Scan or type" /></label></div>
          <label>Product name<input required maxLength={160} value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="e.g. Basmati rice, 5 kg" /></label>
          <div className="form-two-col"><label>Category <span className="field-optional">OPTIONAL</span><input maxLength={80} value={form.categoryName} onChange={(event) => updateForm('categoryName', event.target.value)} placeholder="Grocery" /></label><label>Unit<input required maxLength={40} value={form.unit} onChange={(event) => updateForm('unit', event.target.value)} placeholder="each" /></label></div>
          <div className="form-two-col"><label>Selling price (MVR)<input required inputMode="decimal" value={form.sellingPriceMvr} onChange={(event) => updateForm('sellingPriceMvr', event.target.value)} placeholder="0.00" /></label><label>Cost price (MVR)<input inputMode="decimal" value={form.costPriceMvr} onChange={(event) => updateForm('costPriceMvr', event.target.value)} placeholder="0.00" /></label></div>
          <div className="form-two-col"><label>Opening quantity<input required inputMode="decimal" value={form.openingQuantity} onChange={(event) => updateForm('openingQuantity', event.target.value)} placeholder="0" /></label><label>Low-stock alert at<input required inputMode="decimal" value={form.lowStockThreshold} onChange={(event) => updateForm('lowStockThreshold', event.target.value)} placeholder="0" /></label></div>
          <label>Opening stock reason<input required maxLength={240} value={form.openingReason} onChange={(event) => updateForm('openingReason', event.target.value)} /></label>
          {formError && <p className="form-error" role="alert"><CircleAlert size={14} />{formError}</p>}
          {createProduct.isSuccess && <p className="form-success" role="status"><Check size={14} />Product saved to the catalog.</p>}
          <button className="button-primary" type="submit" disabled={createProduct.isPending}>{createProduct.isPending ? 'Saving product…' : 'Save product'} {!createProduct.isPending && <ArrowRight size={16} />}</button>
        </form>
      </section> : <section className="product-form-panel staff-readonly"><div className="section-kicker">CASHIER ACCESS</div><h2>Ready for checkout.</h2><p>You can sell active products. Only the shop owner can add products or change opening stock.</p><Link href="/pos" className="button-primary">Open checkout <ArrowRight size={16} /></Link></section>}
    </div>
  </AppShell>;
}

function PointOfSalePage() {
  return <RouteGuard><CurrentUserState>{(me) => <PointOfSaleWorkbench me={me} />}</CurrentUserState></RouteGuard>;
}

function PointOfSaleWorkbench({ me }: { me: CurrentUser }) {
  const [search, setSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [productSnapshots, setProductSnapshots] = useState<Record<string, Product>>({});
  const [payments, setPayments] = useState<PaymentLine[]>(() => [{
    id: crypto.randomUUID(),
    method: 'cash',
    accountId: '',
    amountMvr: '',
    reference: '',
  }]);
  const [discountMvr, setDiscountMvr] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [checkoutKey, setCheckoutKey] = useState(() => crypto.randomUUID());
  const cache = useQueryClient();
  const productsQuery = useListProducts(search.trim() ? { search: search.trim() } : undefined);
  const accountsQuery = useListFinancialAccounts({
    query: { queryKey: getListFinancialAccountsQueryKey() },
  });
  const customersQuery = useListCustomers(
    customerSearch.trim() ? { search: customerSearch.trim() } : undefined,
  );
  const createCustomer = useCreateCustomer();
  const createSale = useCreateSale();
  const products = productsQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];
  const customers = customersQuery.data ?? [];

  const rotateKey = () => setCheckoutKey(crypto.randomUUID());
  const addProduct = (product: Product) => {
    setProductSnapshots((current) => ({ ...current, [product.id]: product }));
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (!existing) return [...current, { productId: product.id, quantity: '1' }];
      return current.map((item) => item.productId === product.id
        ? { ...item, quantity: quantityMilliToInput(quantityInputToMilli(item.quantity) + 1_000n) }
        : item);
    });
    setReceipt(null);
    setError('');
    rotateKey();
  };

  const subtotalLaari = cart.reduce((sum, item) => {
    const product = productSnapshots[item.productId];
    if (!product) return sum;
    try {
      const quantity = quantityInputToMilli(item.quantity);
      return sum + lineAmountLaari(product.sellingPriceLaari, quantity);
    } catch {
      return sum;
    }
  }, 0n);

  let discountLaari = 0n;
  let discountError = '';
  if (me.role === 'owner' && discountMvr.trim()) {
    try {
      discountLaari = mvrInputToLaari(discountMvr);
      if (discountLaari > subtotalLaari) discountError = 'Discount cannot exceed the subtotal.';
      else if (discountLaari > 0n && !discountReason.trim()) discountError = 'Add a reason for the discount.';
    } catch (discountIssue) {
      discountError = discountIssue instanceof Error ? discountIssue.message : 'Invalid discount.';
    }
  }
  const totalLaari = subtotalLaari > discountLaari ? subtotalLaari - discountLaari : 0n;

  useEffect(() => {
    if (!accounts.length) return;
    setPayments((current) => current.map((payment) => {
      if (payment.accountId && accounts.some((account) => account.id === payment.accountId)) return payment;
      const matching = accounts.find((account) => account.accountType === 'cash') ?? accounts[0];
      return { ...payment, accountId: matching?.id ?? '' };
    }));
  }, [accounts]);

  const updateCartQuantity = (productId: string, quantity: string) => {
    setCart((current) => current.map((item) => item.productId === productId ? { ...item, quantity } : item));
    setReceipt(null);
    setError('');
    rotateKey();
  };

  const addPayment = () => {
    const account = accounts.find((item) => item.accountType === 'cash') ?? accounts[0];
    setPayments((current) => [
      ...current.map((payment, index) =>
        index === 0 && !payment.amountMvr.trim()
          ? { ...payment, amountMvr: laariToMvrInput(totalLaari) }
          : payment,
      ),
      {
        id: crypto.randomUUID(),
        method: 'cash',
        accountId: account?.id ?? '',
        amountMvr: '',
        reference: '',
      },
    ]);
    rotateKey();
  };

  const changePayment = (id: string, changes: Partial<PaymentLine>) => {
    setPayments((current) => current.map((payment) => payment.id === id ? { ...payment, ...changes } : payment));
    setError('');
    rotateKey();
  };

  const removePayment = (id: string) => {
    setPayments((current) => current.filter((payment) => payment.id !== id));
    rotateKey();
  };

  const submitCustomer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createCustomer.mutate({
      data: {
        fullName: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
        email: newCustomerEmail.trim() || undefined,
      },
    }, {
      onSuccess: (customer) => {
        setSelectedCustomerId(customer.id);
        setCustomerSearch('');
        setNewCustomerName('');
        setNewCustomerPhone('');
        setNewCustomerEmail('');
        setShowCustomerForm(false);
        void cache.invalidateQueries({ queryKey: getListCustomersQueryKey() });
      },
      onError: (customerError) => setError((customerError as { message?: string }).message || 'Could not add the customer.'),
    });
  };

  const submitSale = () => {
    setError('');
    setReceipt(null);
    if (!cart.length) {
      setError('Add at least one product to the cart.');
      return;
    }
    if (discountError) {
      setError(discountError);
      return;
    }

    let saleItems: Array<{ productId: string; quantity: string }>;
    let paymentInputs: Array<{ amountLaari: string; accountId: string; method: CheckoutPaymentMethod; reference?: string }>;
    try {
      saleItems = cart.map((item) => {
        const quantity = quantityInputToMilli(item.quantity);
        if (quantity <= 0n) throw new Error('Sale quantities must be greater than zero.');
        const product = productSnapshots[item.productId];
        if (!product) throw new Error('A product in the cart is no longer available.');
        if (quantity > quantityInputToMilli(product.stockOnHand)) {
          throw new Error(`Not enough stock for ${product.name}.`);
        }
        return { productId: item.productId, quantity: quantityMilliToInput(quantity) };
      });

      const nonEmptyPayments = payments.filter((payment) => payment.amountMvr.trim());
      if (!nonEmptyPayments.length && payments.length === 1 && totalLaari > 0n) {
        const firstPayment = payments[0]!;
        paymentInputs = [{
          amountLaari: totalLaari.toString(),
          accountId: firstPayment.accountId,
          method: firstPayment.method,
          reference: firstPayment.reference.trim() || undefined,
        }];
      } else {
        paymentInputs = nonEmptyPayments.map((payment) => ({
          amountLaari: mvrInputToLaari(payment.amountMvr).toString(),
          accountId: payment.accountId,
          method: payment.method,
          reference: payment.reference.trim() || undefined,
        }));
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Review the cart and payment details.');
      return;
    }

    const paidLaari = paymentInputs.reduce((sum, payment) => sum + BigInt(payment.amountLaari), 0n);
    if (paidLaari < totalLaari && !selectedCustomerId) {
      setError('Choose or add a customer for a partial or credit sale.');
      return;
    }
    if (totalLaari <= 0n) {
      setError('The sale total must be greater than zero.');
      return;
    }

    createSale.mutate({
      data: {
        idempotencyKey: checkoutKey,
        items: saleItems,
        customerId: selectedCustomerId || undefined,
        discountLaari: discountLaari > 0n ? discountLaari.toString() : undefined,
        discountReason: discountLaari > 0n ? discountReason.trim() : undefined,
        payments: paymentInputs.length ? paymentInputs : undefined,
      },
    }, {
      onSuccess: (result) => {
        setReceipt(result);
        setCart([]);
        setPayments([]);
        setDiscountMvr('');
        setDiscountReason('');
        setSelectedCustomerId('');
        setCheckoutKey(crypto.randomUUID());
        void cache.invalidateQueries({ queryKey: getListProductsQueryKey() });
      },
      onError: (saleError) => setError((saleError as { message?: string }).message || 'Checkout failed. Retry with the same cart; duplicate submits are protected.'),
    });
  };

  return <AppShell active="pos">
    <div className="page-topline pos-topline"><div><div className="section-kicker">COUNTER · MVR CHECKOUT</div><h1>Make a <em>sale.</em></h1><p className="page-subtitle">Items, stock, invoice, and payments commit together.</p></div><span className="owner-seal"><CreditCard size={16} /> POINT OF SALE</span></div>
    {receipt ? <section className="receipt-card">
      <div className="receipt-success"><span className="receipt-check"><Check size={23} /></span><div><span className="section-kicker">SALE SAVED</span><h2>Receipt {receipt.invoiceNumber}</h2><p>Stock and payment records have been updated.</p></div></div>
      <div className="receipt-totals"><span>Total <b>{formatMvrLaari(receipt.totalLaari)}</b></span><span>Paid <b>{formatMvrLaari(receipt.paidLaari)}</b></span><span>Due <b>{formatMvrLaari(receipt.balanceDueLaari)}</b></span></div>
      <p className="receipt-email"><Check size={15} />Sale saved. This receipt is ready to print.</p>
      <div className="receipt-actions"><button className="button-secondary" onClick={() => window.print()}>Print receipt</button><button className="button-primary" onClick={() => setReceipt(null)}>New sale <ArrowRight size={16} /></button></div>
    </section> : <div className="pos-layout">
      <section className="pos-products-panel">
        <div className="catalog-toolbar"><div><div className="section-kicker">PRODUCTS</div><h2>Build the basket</h2></div><label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, SKU, barcode" aria-label="Search products for sale" /></label></div>
        {productsQuery.isLoading ? <div className="staff-skeleton"><i /><i /><i /></div> : productsQuery.isError ? <div className="list-error"><CircleAlert size={20} /><b>Products unavailable</b><p>Try again in a moment.</p><button type="button" className="button-secondary" onClick={() => void productsQuery.refetch()}>Try again</button></div> : products.length === 0 ? <div className="staff-empty"><div className="empty-mark"><Package size={20} /></div><b>No matching products.</b><p>Add products before making a sale.</p><Link href="/products" className="button-quiet">Open product catalog <ArrowRight size={15} /></Link></div> : <div className="pos-product-grid">{products.map((product) => {
          let stockMilli = 0n;
          try { stockMilli = quantityInputToMilli(product.stockOnHand); } catch { stockMilli = 0n; }
          return <button type="button" className={`pos-product-card ${stockMilli <= 0n ? 'out-of-stock' : ''}`} key={product.id} disabled={stockMilli <= 0n} onClick={() => addProduct(product)} data-testid={`button-add-product-${product.id}`}><span className="pos-product-category">{product.categoryName || product.unit}</span><b>{product.name}</b><small>{product.sku} · {product.stockOnHand} in stock</small><span className="pos-product-price">{formatMvrLaari(product.sellingPriceLaari)} <i>+</i></span></button>;
        })}</div>}
      </section>
      <section className="pos-checkout-panel">
        <div className="checkout-panel-head"><div><div className="section-kicker">CURRENT SALE</div><h2>Basket <span>{cart.length.toString().padStart(2, '0')}</span></h2></div><button type="button" className="text-button" disabled={!cart.length} onClick={() => { setCart([]); setReceipt(null); rotateKey(); }}>Clear</button></div>
        {!cart.length ? <div className="cart-empty"><ShoppingCart size={20} /><b>Your basket is empty.</b><p>Select products to begin.</p></div> : <div className="cart-lines">{cart.map((item) => {
          const product = productSnapshots[item.productId];
          if (!product) return null;
          let quantity = 0n;
          let lineTotal = 0n;
          let quantityError = '';
          try {
            quantity = quantityInputToMilli(item.quantity);
            lineTotal = lineAmountLaari(product.sellingPriceLaari, quantity);
            if (quantity <= 0n) quantityError = 'Quantity must be greater than zero.';
            else if (quantity > quantityInputToMilli(product.stockOnHand)) quantityError = 'Not enough stock.';
          } catch (issue) {
            quantityError = issue instanceof Error ? issue.message : 'Invalid quantity.';
          }
          return <div className="cart-line" key={item.productId}><div className="cart-line-info"><b>{product.name}</b><small>{formatMvrLaari(product.sellingPriceLaari)} / {product.unit}</small></div><label className="cart-quantity"><span>QTY</span><input value={item.quantity} onChange={(event) => updateCartQuantity(item.productId, event.target.value)} inputMode="decimal" aria-label={`Quantity for ${product.name}`} /></label><b className="cart-line-total">{formatMvrLaari(lineTotal)}</b><button className="icon-button" type="button" aria-label={`Remove ${product.name}`} onClick={() => { setCart((current) => current.filter((entry) => entry.productId !== item.productId)); rotateKey(); }}><X size={16} /></button>{quantityError && <p className="cart-line-error">{quantityError}</p>}</div>;
        })}</div>}

        <div className="checkout-customer">
          <div className="checkout-subhead"><b>Customer</b><button type="button" className="text-button" onClick={() => setShowCustomerForm((open) => !open)}>{showCustomerForm ? 'Cancel' : '+ Add'}</button></div>
          <label className="customer-search"><Search size={15} /><input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search or select customer" aria-label="Search customers" /></label>
          <select value={selectedCustomerId} onChange={(event) => { setSelectedCustomerId(event.target.value); rotateKey(); }} aria-label="Select customer"><option value="">No customer — fully paid sale</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.fullName}{customer.phone ? ` · ${customer.phone}` : ''}</option>)}</select>
          {showCustomerForm && <form className="quick-customer-form" onSubmit={submitCustomer}><input required maxLength={160} value={newCustomerName} onChange={(event) => setNewCustomerName(event.target.value)} placeholder="Customer name" aria-label="New customer name" /><input maxLength={40} value={newCustomerPhone} onChange={(event) => setNewCustomerPhone(event.target.value)} placeholder="Phone (optional)" aria-label="New customer phone" /><input type="email" maxLength={254} value={newCustomerEmail} onChange={(event) => setNewCustomerEmail(event.target.value)} placeholder="Email for receipt (optional)" aria-label="New customer email" /><button className="button-secondary" disabled={createCustomer.isPending} type="submit">{createCustomer.isPending ? 'Adding…' : 'Save customer'}</button></form>}
        </div>

        <div className="checkout-payments">
          <div className="checkout-subhead"><b>Payments</b><button type="button" className="text-button" onClick={addPayment}>+ Split payment</button></div>
          {payments.map((payment, index) => {
            const filteredAccounts = accounts.filter((account) => payment.method === 'cash' ? account.accountType === 'cash' : payment.method === 'other' ? true : account.accountType === 'bank');
            return <div className="payment-row" key={payment.id}>
              <div className="payment-row-heading"><span>PAYMENT {index + 1}</span><button type="button" className="text-button remove-payment" onClick={() => removePayment(payment.id)}>Remove</button></div>
              <div className="form-two-col">
                <label>Method<select value={payment.method} onChange={(event) => {
                  const method = event.target.value as CheckoutPaymentMethod;
                  const matching = accounts.find((account) => method === 'cash' ? account.accountType === 'cash' : method === 'other' ? true : account.accountType === 'bank');
                  changePayment(payment.id, { method, accountId: matching?.id ?? '' });
                }}><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="card">Card</option><option value="other">Other</option></select></label>
                <label>Account<select required value={payment.accountId} onChange={(event) => changePayment(payment.id, { accountId: event.target.value })}><option value="">Choose account</option>{filteredAccounts.map((account: FinancialAccount) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
              </div>
              <div className="form-two-col"><label>Amount (MVR)<input inputMode="decimal" value={payment.amountMvr} onChange={(event) => changePayment(payment.id, { amountMvr: event.target.value })} placeholder={payments.length === 1 ? laariToMvrInput(totalLaari) : '0.00'} /></label><label>Reference <span className="field-optional">OPTIONAL</span><input maxLength={120} value={payment.reference} onChange={(event) => changePayment(payment.id, { reference: event.target.value })} placeholder="Receipt / transfer ID" /></label></div>
            </div>;
          })}
          {!payments.length && <p className="credit-note">No payment lines. Choose a customer to record this as credit.</p>}
          {!!payments.length && <button type="button" className="text-button no-payment-button" onClick={() => { setPayments([]); rotateKey(); }}>Record as credit instead</button>}
        </div>

        {me.role === 'owner' && <div className="checkout-discount"><div className="checkout-subhead"><b>Owner discount</b><span className="field-optional">OPTIONAL</span></div><div className="form-two-col"><label>Discount (MVR)<input inputMode="decimal" value={discountMvr} onChange={(event) => { setDiscountMvr(event.target.value); setError(''); rotateKey(); }} placeholder="0.00" /></label><label>Reason<input maxLength={240} value={discountReason} onChange={(event) => { setDiscountReason(event.target.value); rotateKey(); }} placeholder="Required when discount is used" /></label></div>{discountError && <p className="cart-line-error">{discountError}</p>}</div>}

        <div className="checkout-summary"><div><span>Subtotal</span><b>{formatMvrLaari(subtotalLaari)}</b></div>{discountLaari > 0n && <div><span>Discount</span><b>− {formatMvrLaari(discountLaari)}</b></div>}<div className="checkout-total"><span>Total</span><strong>{formatMvrLaari(totalLaari)}</strong></div></div>
        {error && <p className="form-error checkout-error" role="alert"><CircleAlert size={14} />{error}</p>}
        {accountsQuery.isError && <p className="form-error" role="alert"><CircleAlert size={14} />Checkout accounts could not be loaded.</p>}
        <button className="button-primary checkout-submit" type="button" onClick={submitSale} disabled={!cart.length || createSale.isPending || accountsQuery.isLoading}>{createSale.isPending ? 'Saving sale…' : 'Complete sale'} {!createSale.isPending && <ArrowRight size={16} />}</button>
        <p className="checkout-footnote"><ShieldCheck size={14} /> Sale, payment, stock, and ledger changes save together.</p>
      </section>
    </div>}
  </AppShell>;
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
     <div className="page-topline staff-topline"><div><div className="section-kicker">SHOP OWNER</div><h1>People & <em>access.</em></h1><p className="page-subtitle">A clear view of who can be at your counter.</p></div><span className="owner-seal"><ShieldCheck size={16} /> OWNER VIEW</span></div>
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
  const { isLoaded, user } = useSupabaseAuth();
  if (!isLoaded) return <ScreenLoading />;
  return user ? <Redirect to="/home" /> : <PublicHome />;
}

function Router() {
  const [location] = useLocation();
  return <div key={location} className="route-frame"><Switch>
    <Route path="/" component={HomeRedirect} />
    <Route path="/sign-in/*?" component={SignInPage} />
    <Route path="/sign-up/*?" component={SignUpPage} />
    <Route path="/home" component={HomePage} />
    <Route path="/pos" component={PointOfSalePage} />
    <Route path="/products" component={ProductsPage} />
    <Route path="/staff" component={StaffPage} />
    <Route><Redirect to="/" /></Route>
  </Switch></div>;
}

function AuthenticatedApp() {
  return <QueryClientProvider client={queryClient}><SupabaseAuthProvider><Router /></SupabaseAuthProvider></QueryClientProvider>;
}

function App() {
  return <WouterRouter base={basePath}><AuthenticatedApp /></WouterRouter>;
}

export default App;

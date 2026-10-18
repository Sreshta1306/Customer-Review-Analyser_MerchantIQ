export type LandingAuthDestination = 'login' | 'signup';

/** Keep public landing interactions local to this React-mounted fragment. */
export function attachLandingInteractions(
  root: HTMLElement,
  onNavigate: (destination: LandingAuthDestination) => void
): () => void {
  const nav = root.querySelector<HTMLElement>('#landing-nav');
  const menuButton = root.querySelector<HTMLButtonElement>('#landing-burger');
  const year = root.querySelector<HTMLElement>('#landing-yr');
  if (!nav || !menuButton || !year) return () => undefined;

  year.textContent = String(new Date().getFullYear());

  const setMenuOpen = (open: boolean) => {
    nav.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    menuButton.querySelector('use')?.setAttribute('href', open ? '#landing-i-close' : '#landing-i-menu');
  };

  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest('#landing-burger')) {
      setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true');
      return;
    }

    const link = target.closest<HTMLAnchorElement>('a');
    if (!link || !root.contains(link)) return;

    const destination = link.dataset.mqView;
    if (destination === 'login' || destination === 'signup') {
      event.preventDefault();
      setMenuOpen(false);
      onNavigate(destination);
      return;
    }

    if (nav.contains(link) && link.hash.startsWith('#landing-')) setMenuOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      setMenuOpen(false);
      menuButton.focus();
    }
  };

  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeyDown);
  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeyDown);
  };
}
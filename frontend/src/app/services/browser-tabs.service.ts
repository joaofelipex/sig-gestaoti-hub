import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import {
  BrowserTabDef,
  defaultBrowserTabsState,
  findBrowserTabDef,
  normalizeBrowserTabPath,
  readStoredBrowserTabs,
  writeStoredBrowserTabs,
} from '../layout/browser-tabs.config';

@Injectable({ providedIn: 'root' })
export class BrowserTabsService {
  private readonly openPathsSubject = new BehaviorSubject<string[]>(this.initialPaths());
  private readonly activePathSubject = new BehaviorSubject<string>(this.initialActive());

  readonly openPaths$ = this.openPathsSubject.asObservable();
  readonly activePath$ = this.activePathSubject.asObservable();

  constructor(private router: Router) {}

  get openTabs(): BrowserTabDef[] {
    return this.openPathsSubject.value
      .map((path) => findBrowserTabDef(path))
      .filter((tab): tab is BrowserTabDef => !!tab);
  }

  get activePath(): string {
    return this.activePathSubject.value;
  }

  syncFromUrl(url: string): void {
    const path = normalizeBrowserTabPath(url);
    if (!path) return;

    const current = this.openPathsSubject.value;
    const nextPaths = current.includes(path) ? current : [...current, path];

    this.openPathsSubject.next(nextPaths);
    this.activePathSubject.next(path);
    this.persist(nextPaths, path);
  }

  activate(path: string): void {
    if (!findBrowserTabDef(path)) return;
    if (this.router.url.split('?')[0] !== path) {
      void this.router.navigateByUrl(path);
      return;
    }
    this.activePathSubject.next(path);
    this.persist(this.openPathsSubject.value, path);
  }

  close(path: string): void {
    const paths = this.openPathsSubject.value;
    if (paths.length <= 1 || !paths.includes(path)) return;

    const idx = paths.indexOf(path);
    const nextPaths = paths.filter((p) => p !== path);
    const wasActive = this.activePathSubject.value === path;

    this.openPathsSubject.next(nextPaths);

    if (wasActive) {
      const fallback = nextPaths[Math.min(idx, nextPaths.length - 1)] ?? nextPaths[0];
      this.activePathSubject.next(fallback);
      this.persist(nextPaths, fallback);
      void this.router.navigateByUrl(fallback);
      return;
    }

    this.persist(nextPaths, this.activePathSubject.value);
  }

  private initialPaths(): string[] {
    return readStoredBrowserTabs()?.paths ?? defaultBrowserTabsState().paths;
  }

  private initialActive(): string {
    return readStoredBrowserTabs()?.active ?? defaultBrowserTabsState().active;
  }

  private persist(paths: string[], active: string): void {
    writeStoredBrowserTabs({ paths, active });
  }
}

import { NgModule } from '@angular/core';
import { LucideAngularModule, icons } from 'lucide-angular';

const lucidePick = LucideAngularModule.pick({
  LayoutDashboard: icons.LayoutDashboard,
  Building2: icons.Building2,
  Laptop: icons.Laptop,
  Globe: icons.Globe,
  KeyRound: icons.KeyRound,
  Shield: icons.Shield,
  Server: icons.Server,
  Wrench: icons.Wrench,
  ArrowLeftRight: icons.ArrowLeftRight,
  Package: icons.Package,
  Wallet: icons.Wallet,
  BellRing: icons.BellRing,
  ChartLine: icons.ChartLine,
  ChevronLeft: icons.ChevronLeft,
  ChevronRight: icons.ChevronRight,
});

/** Expõe `<lucide-icon>` para componentes standalone (pick não pode ir em @Component.imports). */
@NgModule({
  imports: [lucidePick],
  exports: [LucideAngularModule],
})
export class LucideIconsBridgeModule {}

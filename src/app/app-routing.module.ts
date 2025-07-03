import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes, RouteReuseStrategy } from '@angular/router';
import { HomePage } from './shared/home/home.page';
import { MapVectorComponent } from './shared/map-vector/map-vector.component';
import { LiveBusComponent } from './shared/live-bus/live-bus.component';
import { HorariosComponent } from './shared/horarios/horarios.component';
import { PontosComponent } from './shared/pontos/pontos.component';
import { NotificacoesComponent } from './shared/notificacoes/notificacoes.component';
import { PerfilComponent } from './shared/perfil/perfil.component';
import { LoginComponent } from './shared/login/login.component';
import { CriarContaComponent } from './shared/login/criar-conta/criar-conta.component';
import { EsqueceuSenhaComponent } from './shared/login/esqueceu-senha/esqueceu-senha.component';
import { AuthGuard, GuestGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', component: HomePage, canActivate: [AuthGuard] },
  { path: 'line-detail/:lineId', component: MapVectorComponent, canActivate: [AuthGuard] },
  { path: 'livebus', component: LiveBusComponent, canActivate: [AuthGuard] },
  { path: 'horarios', component: HorariosComponent, canActivate: [AuthGuard] },
  { path: 'pontos', component: PontosComponent, canActivate: [AuthGuard] },
  { path: 'notifications', component: NotificacoesComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: PerfilComponent, canActivate: [AuthGuard] },
  { path: 'login', component: LoginComponent, canActivate: [GuestGuard] },
  { path: 'criar-conta', component: CriarContaComponent, canActivate: [GuestGuard] },
  { path: 'esqueceu-senha', component: EsqueceuSenhaComponent, canActivate: [GuestGuard] },
  // {
  //   path: '',
  //   component: NavigatorComponent,
  //   children: [
  //     { path: '', component: HomePage },
  //     { path: 'line-detail/:lineId', component: MapVectorComponent },
  //     { path: 'livebus', component: LiveBusComponent },
  //     { path: 'itnerarios', component: ItnerariosComponent }
  //     // Outras rotas, se necessário.
  //   ]
  // }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules, onSameUrlNavigation: 'reload' })
  ],
  exports: [RouterModule],
  providers: [
  ]
})
export class AppRoutingModule { }

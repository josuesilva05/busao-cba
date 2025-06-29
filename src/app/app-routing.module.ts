import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes, RouteReuseStrategy } from '@angular/router';
import { HomePage } from './shared/home/home.page';
import { MapVectorComponent } from './shared/map-vector/map-vector.component';
import { LiveBusComponent } from './shared/live-bus/live-bus.component';
import { HorariosComponent } from './shared/horarios/horarios.component';

const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'line-detail/:lineId', component: MapVectorComponent },
  { path: 'livebus', component: LiveBusComponent },
  { path: 'horarios', component: HorariosComponent}
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

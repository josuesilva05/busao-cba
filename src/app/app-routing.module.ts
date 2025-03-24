import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { NavigatorComponent } from './navigator/navigator.component';
import { HomePage } from './home/home.page';

const routes: Routes = [
  {
    path: '',
    component: NavigatorComponent,
    children: [
      { path: '', component: HomePage },
      { path: 'home', component: HomePage },
      // Adicione mais rotas aqui
    ]
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }

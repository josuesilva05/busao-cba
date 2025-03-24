import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy, RouterModule } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { NavigatorModule } from './navigator/navigator.module';

@NgModule({
  declarations: [AppComponent,],
  imports: [BrowserModule,
    IonicModule.forRoot(), 
    AppRoutingModule,
    IonicModule,
    NavigatorModule,
    RouterModule.forRoot([])
  ],
  providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy }],
  bootstrap: [AppComponent],
})
export class AppModule {}

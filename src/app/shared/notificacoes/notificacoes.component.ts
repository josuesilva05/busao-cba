import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-notificacoes',
  templateUrl: './notificacoes.component.html',
  styleUrls: ['./notificacoes.component.scss'],
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    IonicModule,
  ],
})
export class NotificacoesComponent  implements OnInit {

  constructor() { }

  ngOnInit() {}

}

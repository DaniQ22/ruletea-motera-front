import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, NgFor],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  readonly steps = [
    {
      icon: '🏍️',
      title: 'Anótate al sorteo',
      text: 'Registra tu nombre en la lista antes de que arranque el motor.',
    },
    {
      icon: '🎲',
      title: 'Se hace el sorteo',
      text: 'Cuando el club esté completo, se sortea quién le regala a quién. Nadie se saca a sí mismo.',
    },
    {
      icon: '🎯',
      title: 'Gira tu ruleta',
      text: 'Elige tu nombre, gira la ruleta y descubre en secreto a tu compañero de ruta.',
    },
  ];
}
